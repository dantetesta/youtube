# YT Downloader - Extensão Chrome (MV3)

Autoria: [Dante Testa](https://dantetesta.com.br)

Extensão que identifica páginas de vídeo do YouTube e permite listar formatos (vídeo/áudio) e iniciar downloads via backend local que utiliza `yt-dlp`.

> Aviso legal: Baixe apenas conteúdos que você tem direito de baixar. O uso pode violar os Termos de Serviço do YouTube. É provável que a Chrome Web Store rejeite extensões que permitam download do YouTube; utilize para uso pessoal, em modo de desenvolvedor.

## Estrutura

- `manifest.json` — Manifesto MV3
- `service_worker.js` — Service worker da extensão (mensageria e downloads)
- `content/content.js` — Script para detectar páginas do YouTube
- `popup/` — UI do popup (HTML/CSS/JS) responsiva e acessível
- `backend/` — Servidor local (Node.js + yt-dlp)

## Requisitos

- Node.js >= 18 (para o backend)
- yt-dlp instalado e presente no PATH
- Google Chrome (modo desenvolvedor)

## Instalação do backend

1) Instalar dependências do backend

```bash
cd /Users/dantetesta/Desktop/EXT/yt-downloader-extension/backend
npm install
```

2) Instalar yt-dlp (escolha uma opção):

- Homebrew (macOS):
```bash
brew install yt-dlp
```
- pipx (Python):
```bash
pipx install yt-dlp
```

3) Iniciar o backend
```bash
npm run start
```
O backend iniciará em `http://127.0.0.1:8421`.

## Carregar a extensão no Chrome

1) Abra `chrome://extensions`.
2) Ative o "Modo do desenvolvedor".
3) Clique em "Carregar sem compactação" e selecione a pasta `yt-downloader-extension`.
4) Abra um vídeo no YouTube. O badge "DL" deve aparecer no ícone; abra o popup para listar formatos.

## Uso

- A URL do vídeo é detectada automaticamente quando você está numa página `watch` do YouTube; clique em "Buscar" para listar formatos.
- Clique em "Baixar" no formato desejado; o download será iniciado pelo Chrome (pode solicitar local para salvar).

## Acessibilidade, UX/UI e Responsividade

- UI do popup com foco em legibilidade (contraste alto), componentes navegáveis por teclado e avisos com `aria-live`.
- Layout responsivo (desktop/tablet/mobile) e Mobile First.
- Mensagens de status claras e tratamento de erros.

## Segurança e Performance

- Backend local apenas: evita expor chaves ou serviços externos.
- Validação básica de URL para domínios do YouTube.
- Requisições com fallback para `127.0.0.1` e `localhost`.

## Limitações

- A distribuição na Chrome Web Store pode ser recusada por políticas do YouTube. Recomendado uso pessoal (modo dev).
- Alguns formatos retornados podem ser fragmentados (DASH/HLS). O fluxo atual baixa o recurso direto; combinação de áudio/vídeo não é feita pela extensão.

## Licença

MIT
