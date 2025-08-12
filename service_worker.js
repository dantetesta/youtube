/*
 * Service Worker (MV3) - YT Downloader
 * Autoria: Dante Testa (https://dantetesta.com.br)
 * Boas práticas: logs claros, tratamento de erros e segurança básica.
 */

const BACKEND_URLS = [
  'http://127.0.0.1:8421',
  'http://localhost:8421'
];

async function fetchWithFallback(path) {
  let lastErr;
  for (const base of BACKEND_URLS) {
    try {
      const res = await fetch(base + path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Backend indisponível');
}

async function postWithFallback(path, body) {
  let lastErr;
  for (const base of BACKEND_URLS) {
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Backend indisponível');
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'GET_FORMATS') {
        const data = await fetchWithFallback(`/api/formats?url=${encodeURIComponent(msg.url)}`);
        sendResponse({ ok: true, data });
      } else if (msg.type === 'GET_DIRECT_URL') {
        const data = await postWithFallback('/api/direct-url', { url: msg.url, format_id: msg.format_id });
        sendResponse({ ok: true, data });
      } else if (msg.type === 'START_DOWNLOAD') {
        // Faz o download buscando o arquivo manualmente para evitar bloqueios de cabeçalhos
        const { directUrl, filename } = msg;
        try {
          const response = await fetch(directUrl, {
            // Alguns links exigem um referrer válido
            referrer: 'https://www.youtube.com/',
            referrerPolicy: 'no-referrer-when-downgrade'
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          chrome.downloads.download({
            url: blobUrl,
            filename: filename || undefined,
            saveAs: true
          }, (downloadId) => {
            URL.revokeObjectURL(blobUrl);
            if (chrome.runtime.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ ok: true, downloadId });
            }
          });
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
        return; // manter canal aberto até callback
      } else {
        sendResponse({ ok: false, error: 'Mensagem desconhecida' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();
  return true; // resposta assíncrona
});

// Acessibilidade e UX: atualizar badge quando em página de vídeo
function isYouTubeWatchUrl(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname.includes('youtube.com') && u.pathname === '/watch' && u.searchParams.has('v')) ||
      (u.hostname === 'youtu.be' && u.pathname.length > 1)
    );
  } catch (e) {
    return false;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    const active = isYouTubeWatchUrl(tab.url);
    chrome.action.setBadgeText({ text: active ? 'DL' : '' , tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#d00000', tabId });
  }
});
