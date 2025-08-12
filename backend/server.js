/*
 * Backend local para YT Downloader (Extensão Chrome)
 * Autoria: Dante Testa (https://dantetesta.com.br)
 * Requisitos: Node >= 18, yt-dlp instalado e disponível no PATH
 * Segurança: valida domínios aceitos e limitações básicas; uso pessoal/educacional.
 */
import express from 'express';
import cors from 'cors';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 8421;

app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: false
}));

const YT_HOSTS = new Set(['www.youtube.com', 'm.youtube.com', 'youtube.com', 'youtu.be']);

function isValidYouTubeUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return YT_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

async function ytDlpJson(url) {
  // Retorna metadados/formatos completos
  const { stdout } = await execFileAsync('yt-dlp', ['-J', url], { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function ytDlpDirectUrl(url, formatId) {
  const { stdout } = await execFileAsync('yt-dlp', ['-f', String(formatId), '-g', url], { maxBuffer: 10 * 1024 * 1024 });
  // Pode retornar múltiplas linhas (ex: DASH áudio+vídeo); escolher primeira
  const lines = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines[0] || null;
}

async function ytDlpFilename(url, formatId) {
  const { stdout } = await execFileAsync('yt-dlp', ['-f', String(formatId), '--get-filename', '-o', '%(title)s.%(ext)s', url], { maxBuffer: 2 * 1024 * 1024 });
  const name = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
  return name || 'video.mp4';
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), service: 'yt-downloader-backend' });
});

app.get('/api/formats', async (req, res) => {
  try {
    const url = String(req.query.url || '');
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ ok: false, error: 'URL inválida' });

    const info = await ytDlpJson(url);
    const title = info.title || info.fulltitle || '';
    const formats = Array.isArray(info.formats) ? info.formats.map(f => ({
      format_id: f.format_id,
      format_note: f.format_note,
      ext: f.ext,
      acodec: f.acodec,
      vcodec: f.vcodec,
      abr: f.abr,
      fps: f.fps,
      width: f.width,
      height: f.height,
      resolution: f.resolution,
      filesize: f.filesize,
      filesize_approx: f.filesize_approx
    })) : [];

    res.json({ ok: true, title, formats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.post('/api/direct-url', async (req, res) => {
  try {
    const { url, format_id } = req.body || {};
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ ok: false, error: 'URL inválida' });
    if (!format_id) return res.status(400).json({ ok: false, error: 'format_id é obrigatório' });

    const [directUrl, filename] = await Promise.all([
      ytDlpDirectUrl(url, format_id),
      ytDlpFilename(url, format_id)
    ]);

    if (!directUrl) return res.status(500).json({ ok: false, error: 'Não foi possível obter URL direta' });
    res.json({ ok: true, directUrl, filename });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.post('/api/formats', async (req, res) => {
  try {
    const { url } = req.body;
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ error: 'URL inválida' });
    
    const data = await ytDlpJson(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, formatId } = req.body;
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ error: 'URL inválida' });
    
    const directUrl = await ytDlpDirectUrl(url, formatId);
    const filename = await ytDlpFilename(url, formatId);
    
    res.json({ url: directUrl, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
