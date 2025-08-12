# Roadmap — YT Downloader (Extensão Chrome)

Autoria: [Dante Testa](https://dantetesta.com.br)

## v0.1.0 (atual)
- Manifest MV3 (`manifest.json`).
- Service Worker (`service_worker.js`) com mensageria e downloads via `chrome.downloads`.
- Content script (`content/content.js`) para detecção de página `watch`.
- Popup responsivo e acessível (`popup/`).
- Backend local Node.js + yt-dlp (`backend/`) com endpoints:
  - `GET /api/health`
  - `GET /api/formats?url=...`
  - `POST /api/direct-url { url, format_id }`

## Próximas versões

### v0.2.0
- Filtro avançado por qualidade (baixa/média/alta) com presets.
- Indicação clara de formatos "somente áudio" vs "somente vídeo" vs "muxed".
- Loading states com skeleton.
- Localização (pt-BR e en-US).

### v0.3.0
- Opção de nome de arquivo customizado no popup.
- Preferências persistentes (`chrome.storage`) para pasta padrão e formato preferido.
- Melhorias de acessibilidade: roles ARIA e navegação por teclado abrangente.

### v0.4.0
- Modo avançado: combinar áudio+vídeo (requer ffmpeg) — executado no backend e servido como único arquivo.
- Fila de downloads e progresso (consulta ao backend e `chrome.downloads.onChanged`).

### v0.5.0
- Testes automatizados (UI e backend): Playwright/Jest.
- Pipeline de lint/format (ESLint + Prettier) e hooks (Husky).

## Boas práticas contínuas
- Segurança: validar entrada, limitar domínios, não expor chaves.
- Performance: reduzir payloads, memoizar respostas frequentes temporariamente.
- Acessibilidade: alto contraste, foco visível, rótulos e `aria-live`.
- Responsividade: Mobile First mantendo PC/Tablet/Mobile.
- Versionamento: incrementar `manifest.version` e `backend/package.json` a cada release.
