/*
 * Popup UI/UX - YT Downloader
 * Autoria: Dante Testa (https://dantetesta.com.br)
 */

// Seletores de DOM otimizados
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

// Elementos da UI
const statusContainer = qs('#status');
const statusText = qs('#statusText');
const urlInput = qs('#videoUrl');
const btnFetch = qs('#btnFetch');
const btnFetchText = qs('.btn-text', btnFetch);
const btnFetchLoading = qs('.btn-loading', btnFetch);
const formatsSection = qs('#formatsSection');
const formatsList = qs('#formatsList');
const tabs = qsa('.tab');
const noFormatsEl = qs('#noFormats');

// Estado da aplicação
let allFormats = [];
let currentFilter = 'all';
let isLoading = false;

/**
 * Exibe uma mensagem de status com animação
 * @param {string} msg - A mensagem a ser exibida
 * @param {string} [type=info] - O tipo de mensagem (info, success, error)
 * @param {number} [timeout=0] - Tempo em ms para esconder a mensagem (0 = não esconder)
 */
function setStatus(msg, type = 'info', timeout = 0) {
  const el = statusContainer;
  const textEl = statusText || statusContainer; // fallback seguro
  if (!el) return;
  
  if (!msg) {
    hideStatus();
    return;
  }
  
  // Atualiza conteúdo e tipo
  textEl.textContent = msg;
  el.setAttribute('data-type', type);
  
  // Garante classes base sem sobrescrever
  el.classList.add('status-message');
  el.classList.remove('animate-fade-out');
  el.hidden = false;
  el.style.display = 'block';
  el.classList.add('visible');
  
  // Reflow e animação de entrada
  void el.offsetWidth;
  el.classList.add('animate-fade-in');
  
  // Scroll suave
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
  
  // Timeout opcional para ocultar
  if (timeout > 0) {
    clearTimeout(el.timeoutId);
    el.timeoutId = setTimeout(() => hideStatus(), timeout);
  }
  
  // Classe de tipo (mantém outras classes)
  el.classList.remove('status-info', 'status-success', 'status-error');
  el.classList.add(`status-${type}`);
}

/**
 * Esconde a mensagem de status com animação
 */
function hideStatus() {
  const el = statusContainer;
  if (!el) return;
  el.classList.remove('animate-fade-in');
  el.classList.add('animate-fade-out');
  setTimeout(() => {
    el.hidden = true;
    el.style.display = 'none';
    el.classList.remove('visible', 'animate-fade-out');
  }, 300);
}

/**
 * Verifica se a URL é de um vídeo do YouTube
 * @param {string} urlStr - URL a ser verificada
 * @returns {boolean} Verdadeiro se for uma URL de vídeo do YouTube
 */
function isYouTubeWatchUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return (
      (u.hostname.includes('youtube.com') && u.pathname === '/watch' && u.searchParams.has('v')) ||
      (u.hostname === 'youtu.be' && u.pathname.length > 1)
    );
  } catch {
    return false;
  }
}

/**
 * Formata bytes para um formato legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} Tamanho formatado (ex: '1.2 MB')
 */
function formatFileSize(bytes) {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Extrai o codec de uma string de codec
 * @param {string} codec - String do codec (ex: 'avc1.64001F')
 * @returns {string} Nome simplificado do codec
 */
function getCodecName(codec) {
  if (!codec || codec === 'none') return '—';
  
  // Extrai o nome base do codec (remove informações de perfil/nível)
  const match = codec.match(/^(av[0-9]+|vp[0-9]+|mp4v|mp4a|opus|aac|vorbis|flac|mp3|ac3|eac3|dts|pcm|wav)/i);
  if (match) {
    return match[0].toUpperCase();
  }
  
  return codec.split('.')[0].toUpperCase();
}

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || '';
}

/**
 * Renderiza a lista de formatos disponíveis
 */
function renderFormats() {
  formatsList.innerHTML = '';
  
  // Filtra os formatos com base na aba selecionada
  const filtered = allFormats.filter(f => {
    const hasVideo = f.vcodec && f.vcodec !== 'none';
    const hasAudio = f.acodec && f.acodec !== 'none';

    if (currentFilter === 'all') return true;
    if (currentFilter === 'video') return hasVideo;
    if (currentFilter === 'audio') return hasAudio && !hasVideo;
    return true;
  });

  // Exibe mensagem se não houver formatos
  if (filtered.length === 0) {
    noFormatsEl.hidden = false;
    return;
  }
  
  noFormatsEl.hidden = true;

  // Cria os itens da lista de formatos
  filtered.forEach((f, index) => {
    const li = document.createElement('li');
    li.className = 'format-item';
    li.setAttribute('data-type', /none/i.test(f.vcodec || '') ? 'audio' : 'video');
    li.setAttribute('role', 'listitem');
    li.setAttribute('aria-posinset', index + 1);
    li.setAttribute('aria-setsize', filtered.length);

    // Determina o tipo e resolução
    const isAudio = /none/i.test(f.vcodec || '');
    const resolution = f.format_note || f.resolution || 
                     (f.width && f.height ? `${f.width}x${f.height}` : '');
    const fileExt = (f.ext || 'mp4').toUpperCase();
    const fileSize = f.filesize || f.filesize_approx;
    
    // Cria o conteúdo do item
    li.innerHTML = `
      <div class="format-info">
        <h3 class="format-name" title="${f.format || 'Formato desconhecido'}">
          ${isAudio ? 'Áudio' : 'Vídeo'} ${resolution || ''} ${fileExt ? `· ${fileExt}` : ''}
        </h3>
        <div class="format-details">
          ${!isAudio ? `<span class="quality">${resolution || '—'}</span>` : ''}
          ${f.fps ? `<span class="fps">${f.fps} FPS</span>` : ''}
          ${fileSize ? `<span class="size">${formatFileSize(fileSize)}</span>` : ''}
          ${f.vcodec && !isAudio ? `<span>${getCodecName(f.vcodec)}</span>` : ''}
          ${f.acodec && f.acodec !== 'none' ? `<span>${getCodecName(f.acodec)}</span>` : ''}
          ${f.abr ? `<span>${Math.round(f.abr)}kbps</span>` : ''}
        </div>
      </div>
      <div class="format-actions">
        <button class="format-btn" data-format-id="${f.format_id}" aria-label="Baixar formato">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span class="btn-text">Baixar</span>
          <span class="btn-loading" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </span>
        </button>
      </div>
    `;

    // Adiciona o manipulador de eventos ao botão de download
    const btn = li.querySelector('.format-btn');
    btn.addEventListener('click', () => startDownload(f));

    formatsList.appendChild(li);
  });
}

/**
 * Habilita/desabilita o estado de carregamento do botão de busca
 * @param {boolean} loading - Se true, ativa o estado de carregamento
 */
function setLoadingState(loading) {
  isLoading = loading;
  
  // Adiciona ou remove a classe de carregamento no body
  document.body.classList.toggle('is-loading', loading);
  
  // Atualiza o botão de busca
  btnFetch.disabled = loading;
  btnFetch.classList.toggle('is-loading', loading);
  btnFetchText.textContent = loading ? 'Buscando...' : 'Buscar';
  btnFetch.setAttribute('aria-busy', loading);
  
  // Adiciona efeito de shimmer ao botão durante o carregamento
  if (loading) {
    btnFetch.classList.add('shimmer');
    // Adiciona um pequeno atraso para garantir que a animação seja visível
    setTimeout(() => {
      btnFetch.classList.add('shimmer-active');
    }, 50);
  } else {
    btnFetch.classList.remove('shimmer', 'shimmer-active');
  }
  
  // Atualiza o campo de URL
  urlInput.disabled = loading;
  
  // Atualiza a acessibilidade
  if (loading) {
    formatsSection.setAttribute('aria-busy', 'true');
    formatsSection.setAttribute('aria-live', 'polite');
    
    // Adiciona classe de carregamento à lista de formatos
    formatsList.classList.add('is-loading');
    
    // Mostra o skeleton loading
    showSkeletonLoading();
    
  } else {
    formatsSection.removeAttribute('aria-busy');
    formatsSection.setAttribute('aria-live', 'off');
    formatsList.classList.remove('is-loading');
  }
}

/**
 * Exibe um esqueleto de carregamento enquanto os formatos são buscados
 */
function showSkeletonLoading() {
  // Limpa a lista
  formatsList.innerHTML = '';
  
  // Cria itens de esqueleto
  for (let i = 0; i < 5; i++) {
    const li = document.createElement('li');
    li.className = 'format-item skeleton';
    li.innerHTML = `
      <div class="format-info">
        <h3 class="format-name shimmer">Carregando formato...</h3>
        <div class="format-details">
          <span class="shimmer">—</span>
          <span class="shimmer">—</span>
          <span class="shimmer">—</span>
        </div>
      </div>
      <div class="format-actions">
        <button class="format-btn shimmer" disabled>
          <span class="btn-text">Carregando...</span>
        </button>
      </div>
    `;
    formatsList.appendChild(li);
  }
  
  // Mostra a seção de formatos
  formatsSection.hidden = false;
}

/**
 * Busca os formatos disponíveis para o vídeo
 */
async function fetchFormats() {
  const url = urlInput.value.trim();
  
  if (!url || !isYouTubeWatchUrl(url)) {
    setStatus('Informe uma URL válida de vídeo do YouTube.', 'error');
    urlInput.focus();
    return;
  }
  
  setLoadingState(true);
  setStatus('Buscando formatos disponíveis...', 'info');
  formatsSection.hidden = true;
  
  try {
    allFormats = [];
    
    // Adiciona timeout de 15 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await chrome.runtime.sendMessage({ 
      type: 'GET_FORMATS', 
      url 
    });
    
    clearTimeout(timeoutId);
    
    if (!res?.ok) {
      throw new Error(res?.error || 'Falha ao obter formatos do vídeo');
    }
    
    const data = res.data || {};
    allFormats = (data.formats || [])
      .filter(f => f && f.format_id && f.ext)
      .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.abr || 0) - (a.abr || 0));
    
    if (!allFormats.length) {
      throw new Error('Nenhum formato disponível para este vídeo.');
    }
    
    renderFormats();
    formatsSection.hidden = false;
    setStatus(`Encontrados ${allFormats.length} formatos disponíveis.`, 'success');

    // Persiste resultados da busca
    await chrome.storage.local.set({ lastUrl: url, lastFormats: allFormats });
  } catch (error) {
    console.error('Erro ao buscar formatos:', error);
    
    let errorMsg = 'Erro ao buscar formatos';
    
    if (error.name === 'AbortError') {
      errorMsg = 'Tempo limite excedido. Verifique se o backend local está rodando.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMsg = 'Falha na conexão com o backend. Verifique se o servidor local está ativo.';
    } else {
      errorMsg = error.message || errorMsg;
    }
    
    setStatus(errorMsg, 'error');
    formatsSection.hidden = true;
  } finally {
    setLoadingState(false);
  }
}

/**
 * Inicia o download de um formato específico
 * @param {Object} format - Objeto com os dados do formato a ser baixado
 */
async function startDownload(format) {
  // Valida o formato
  if (!format || !format.format_id) {
    setStatus('Formato inválido para download.', 'error');
    return;
  }
  
  const url = urlInput.value.trim();
  if (!url || !isYouTubeWatchUrl(url)) {
    setStatus('URL do vídeo inválida.', 'error');
    return;
  }
  
  // Encontra o botão de download correspondente
  const downloadBtn = document.querySelector(`.format-btn[data-format-id="${format.format_id}"]`);
  let downloadBtnText = downloadBtn?.querySelector('.btn-text');
  
  try {
    // Ativa o estado de carregamento no botão
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.classList.add('is-loading');
      downloadBtnText.textContent = 'Preparando...';
      
      // Adiciona efeito de ripple ao botão
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      downloadBtn.appendChild(ripple);
      
      // Remove o efeito após a animação
      setTimeout(() => {
        ripple.remove();
      }, 1000);
    }
    
    // Atualiza o status com animação
    const formatName = format.format_note || format.quality || format.ext || 'formato';
    setStatus(`Preparando download (${formatName})...`, 'info');
    
    // Adiciona um pequeno atraso para melhorar a experiência do usuário
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Obtém a URL direta para download
    const res = await chrome.runtime.sendMessage({
      type: 'GET_DIRECT_URL',
      url,
      format_id: format.format_id
    });
    
    // Verifica se houve erro na resposta
    if (!res?.ok) {
      throw new Error(res?.error || 'Falha ao gerar URL para download');
    }
    
    const directUrl = res.data?.directUrl;
    const filename = res.data?.filename;
    
    if (!directUrl) {
      throw new Error('URL direta não retornada pelo servidor.');
    }
    
    // Atualiza o status e o botão
    if (downloadBtn && downloadBtnText) {
      downloadBtnText.textContent = 'Baixando...';
    }
    setStatus('Iniciando download, aguarde...', 'info');
    
    // Adiciona um pequeno atraso para melhorar a experiência
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Inicia o download usando a API de downloads do Chrome
    const downloadRes = await chrome.runtime.sendMessage({ 
      type: 'START_DOWNLOAD', 
      directUrl, 
      filename 
    });
    
    if (!downloadRes?.ok) {
      throw new Error(downloadRes?.error || 'Falha ao iniciar o download');
    }
    
    // Feedback de sucesso com animação
    setStatus('Download iniciado com sucesso! Verifique sua pasta de downloads.', 'success', 5000);
    
    // Efeito de confirmação no botão
    if (downloadBtn && downloadBtnText) {
      downloadBtn.classList.add('download-success');
      downloadBtnText.textContent = 'Baixado!';
      
      // Remove a classe após a animação
      setTimeout(() => {
        downloadBtn.classList.remove('download-success');
      }, 2000);
    }
    
  } catch (error) {
    console.error('Erro ao iniciar download:', error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Falha ao iniciar o download. ';
    
    if (error.message.includes('quota') || error.message.includes('QUOTA')) {
      errorMessage = 'Limite de cota excedido. Tente novamente mais tarde.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage = 'Acesso negado. O vídeo pode ter restrições de download.';
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'Arquivo não encontrado. O vídeo pode ter sido removido.';
    } else if (error.message.includes('private') || error.message.includes('Private video')) {
      errorMessage = 'Este vídeo é privado e não pode ser baixado.';
    } else if (error.message.includes('age restricted')) {
      errorMessage = 'Vídeo com restrição de idade. Faça login para verificar.';
    } else {
      errorMessage += error.message || 'Tente novamente mais tarde.';
    }
    
    // Exibe o erro com animação
    setStatus(errorMessage, 'error', 5000);
    
    // Efeito de erro no botão
    if (downloadBtn) {
      downloadBtn.classList.add('download-error');
      setTimeout(() => {
        downloadBtn.classList.remove('download-error');
      }, 1000);
    }
    
  } finally {
    // Restaura o estado do botão
    if (downloadBtn) {
      // Pequeno atraso antes de reativar o botão para evitar cliques acidentais
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('is-loading');
        if (downloadBtnText) {
          downloadBtnText.textContent = 'Baixar';
        }
      }, 1000);
    }
  }
}

/**
 * Manipulador de teclado para navegação por teclado
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleKeyboardNavigation(e) {
  // Ignora se não for uma tecla de navegação
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '].includes(e.key)) {
    return;
  }
  
  // Evita rolagem da página
  e.preventDefault();
  
  const { activeElement } = document;
  const focusableElements = Array.from(document.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable]'
  )).filter(el => {
    // Filtra elementos visíveis
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  
  const currentIndex = focusableElements.indexOf(activeElement);
  let nextIndex = 0;
  
  switch (e.key) {
    case 'ArrowUp':
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
      break;
    case 'ArrowDown':
      nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = focusableElements.length - 1;
      break;
    case 'Enter':
    case ' ':
      // Dispara o clique se o elemento for clicável
      if (activeElement.tagName === 'BUTTON' || activeElement.getAttribute('role') === 'tab') {
        activeElement.click();
      }
      return;
  }
  
  // Foca no próximo elemento
  if (focusableElements[nextIndex]) {
    focusableElements[nextIndex].focus();
  }
}

/**
 * Manipulador de evento para a tecla Escape
 * @param {KeyboardEvent} e - Evento de teclado
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    // Fecha o popup se estiver aberto
    window.close();
  }
}

/**
 * Configura os listeners de teclado
 */
function setupKeyboardListeners() {
  // Navegação por teclado
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Tecla Escape para fechar
  document.addEventListener('keydown', handleEscapeKey);
  
  // Foco no campo de URL quando o popup é aberto
  urlInput.focus();
}

/**
 * Configura os listeners das abas de filtro
 */
function bindTabs() {
  tabs.forEach((tab, index) => {
    // Adiciona atributos ARIA
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
    tab.setAttribute('aria-controls', `${tab.dataset.filter}-formats`);
    tab.setAttribute('id', `tab-${tab.dataset.filter}`);
    
    // Adiciona tabindex para navegação por teclado
    tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
    
    // Adiciona manipulador de clique
    const handleClick = () => {
      // Atualiza o estado das abas
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      tab.focus();
      
      // Atualiza o filtro e renderiza os formatos
      currentFilter = tab.dataset.filter;
      renderFormats();
      
      // Atualiza a região de status para leitores de tela
      setStatus(`Mostrando ${currentFilter === 'all' ? 'todos os formatos' : currentFilter === 'video' ? 'apenas vídeos' : 'apenas áudios'}.`);
    };
    
    // Adiciona manipulador de teclado para as abas
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        let nextIndex = (index + direction + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
      }
    };
    
    tab.addEventListener('click', handleClick);
    tab.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Inicializa a aplicação
 */
async function init() {
  try {
    // Configura os listeners de teclado
    setupKeyboardListeners();
    
    // Configura as abas de filtro
    bindTabs();
    
    // Carrega dados persistidos da última busca
    const { lastUrl, lastFormats } = await chrome.storage.local.get(['lastUrl', 'lastFormats']);
    if (lastUrl && Array.isArray(lastFormats) && lastFormats.length) {
      urlInput.value = lastUrl;
      allFormats = lastFormats;
      renderFormats();
      formatsSection.hidden = false;
    }

    // Tenta obter a URL da aba ativa
    const activeUrl = await getActiveTabUrl();

    // Se estiver em um vídeo do YouTube diferente do último, busca novamente
    if (isYouTubeWatchUrl(activeUrl) && activeUrl !== lastUrl) {
      urlInput.value = activeUrl;
      fetchFormats();
    } else if (!lastFormats || !lastFormats.length) {
      setStatus('Abra um vídeo do YouTube e clique em Buscar ou cole a URL manualmente.', 'info');
      urlInput.focus();
    }

    // Adiciona o listener para o botão de busca
    btnFetch.addEventListener('click', fetchFormats);

    // Adiciona o listener para a tecla Enter no campo de URL
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        fetchFormats();
      }
    });
    
    // Adiciona o listener para o botão de limpar o campo de URL
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.setAttribute('aria-label', 'Limpar campo de URL');
    clearBtn.innerHTML = '&times;';
    clearBtn.addEventListener('click', async () => {
      urlInput.value = '';
      urlInput.focus();
      formatsSection.hidden = true;
      allFormats = [];
      currentFilter = 'all';
      await chrome.storage.local.remove(['lastUrl', 'lastFormats']);
      setStatus('Informe a URL de um vídeo do YouTube para começar.', 'info');
    });
    
    // Adiciona o botão de limpar ao lado do campo de URL
    urlInput.parentNode.insertBefore(clearBtn, btnFetch);
    
    // Atualiza a acessibilidade do popup
    document.documentElement.setAttribute('lang', 'pt-BR');
    document.title = 'YT Downloader - Baixar vídeos do YouTube';
    
    // Adiciona um manipulador para o evento de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        urlInput.focus();
      }
    });
    
  } catch (error) {
    console.error('Erro na inicialização:', error);
    setStatus('Ocorreu um erro ao inicializar a extensão. Por favor, recarregue a página e tente novamente.', 'error');
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
