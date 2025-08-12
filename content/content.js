/*
 * Content Script - detecta páginas de vídeo no YouTube e injeta um evento para abrir o popup focado.
 * Autoria: Dante Testa (https://dantetesta.com.br)
 */
(function () {
  const isWatch = () => {
    try {
      const u = new URL(location.href);
      return (
        (u.hostname.includes('youtube.com') && u.pathname === '/watch' && u.searchParams.has('v')) ||
        (u.hostname === 'youtu.be' && u.pathname.length > 1)
      );
    } catch (e) {
      return false;
    }
  };

  function ensureBodyAttr() {
    if (isWatch()) {
      document.body.setAttribute('data-yt-downloader-active', '1');
    } else {
      document.body.removeAttribute('data-yt-downloader-active');
    }
  }

  let lastHref = location.href;
  new MutationObserver(() => {
    const href = location.href;
    if (href !== lastHref) {
      lastHref = href;
      ensureBodyAttr();
    }
  }).observe(document, { subtree: true, childList: true });

  window.addEventListener('yt-navigate-finish', ensureBodyAttr);
  document.addEventListener('DOMContentLoaded', ensureBodyAttr);
  ensureBodyAttr();
})();
