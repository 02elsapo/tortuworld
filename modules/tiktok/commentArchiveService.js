const fs = require('node:fs');
const path = require('node:path');

function createCommentArchiveService({ filePath }) {
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error('La ruta del archivo de comentarios es obligatoria.');
  }

  let comments = [];
  let updatedAt = null;
  let saveTimer = null;
  let dirty = false;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.includes('\0')) throw new SyntaxError('El archivo de comentarios está corrupto.');
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)
      || !Array.isArray(saved.comments)
      || (saved.updatedAt !== null && typeof saved.updatedAt !== 'string')
      || saved.comments.some((comment) => !comment || typeof comment !== 'object'
        || typeof comment.text !== 'string' || typeof comment.time !== 'string')) {
      throw new Error('El archivo de comentarios no es válido.');
    }
    comments = saved.comments.map((comment) => ({ time: comment.time, text: comment.text }));
    updatedAt = saved.updatedAt || null;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  function getArchive() {
    return { updatedAt, comments: comments.map((comment) => ({ ...comment })) };
  }

  function getSummary() {
    return { updatedAt, count: comments.length };
  }

  function getTextExport() {
    return comments.map((comment) => comment.text.replace(/\r\n?|\n/g, ' ')).join('\n');
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirty) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ updatedAt, comments }, null, 2));
    dirty = false;
  }

  function scheduleSave() {
    dirty = true;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        flush();
      } catch (error) {
        console.error('No se pudo guardar el archivo de comentarios:', error);
      }
    }, 1000);
  }

  function recordComment(content, time) {
    if (typeof content !== 'string' || !content.trim()) return getSummary();
    const parsedTime = typeof time === 'string' && !Number.isNaN(Date.parse(time))
      ? new Date(time).toISOString()
      : new Date().toISOString();
    comments.push({ time: parsedTime, text: content });
    updatedAt = new Date().toISOString();
    scheduleSave();
    return getSummary();
  }

  function reset() {
    clearTimeout(saveTimer);
    saveTimer = null;
    comments = [];
    updatedAt = new Date().toISOString();
    dirty = true;
    flush();
    return getSummary();
  }

  function close() {
    clearTimeout(saveTimer);
    saveTimer = null;
    flush();
  }

  return { getArchive, getSummary, getTextExport, recordComment, reset, flush, close };
}

module.exports = { createCommentArchiveService };
