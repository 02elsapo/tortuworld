const fs = require('node:fs');
const path = require('node:path');

const teams = [
  { code: 'BR', name: 'Brasil', type: 'country' },
  { code: 'PY', name: 'Paraguay', type: 'country' },
  { code: 'AR', name: 'Argentina', type: 'country' },
  { code: 'DE', name: 'Alemania', type: 'country' },
  { code: 'FR', name: 'Francia', type: 'country' },
  { code: 'IT', name: 'Italia', type: 'country' },
  { code: 'UY', name: 'Uruguay', type: 'country' },
  { code: 'ES', name: 'España', type: 'country' },
  { code: 'ENG', name: 'Inglaterra', type: 'country' },
  { code: 'PT', name: 'Portugal', type: 'country' },
  { code: 'MX', name: 'México', type: 'country' },
  { code: 'CO', name: 'Colombia', type: 'country' },
  { code: 'CL', name: 'Chile', type: 'country' },
  { code: 'JP', name: 'Japón', type: 'country' },
  { code: 'KR', name: 'Corea del Sur', type: 'country' },
  { code: 'US', name: 'Estados Unidos', type: 'country' },
  { code: 'MA', name: 'Marruecos', type: 'country' },
  { code: 'HR', name: 'Croacia', type: 'country' },
  { code: 'NG', name: 'Nigeria', type: 'country' },
  { code: 'SN', name: 'Senegal', type: 'country' },
  { code: 'BE', name: 'Bélgica', type: 'country' },
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

function hasCode(text, code) {
  const escaped = code.toLocaleLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

function hasName(text, name) {
  const escaped = name
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

function flagEmoji(code) {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}

function findMentionedTeam(content) {
  const text = normalize(content);
  const matches = teams.flatMap((team) => {
    const name = normalize(team.name);
    const mentionsName = hasName(text, name);
    const mentionsCode = hasCode(text, team.code);
    const mentionsFlag = flagEmoji(team.code) && String(content || '').includes(flagEmoji(team.code));
    if (!mentionsName && !mentionsCode && !mentionsFlag) return [];
    return [{ team, matchLength: mentionsName ? name.length : team.code.length }];
  });
  matches.sort((first, second) => second.matchLength - first.matchLength);
  return matches[0]?.team || null;
}

function createCommentStatsService({ filePath }) {
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error('La ruta del archivo de estadísticas es obligatoria.');
  }

  const createEmptyState = () => ({
    counts: Object.fromEntries(teams.map(({ code }) => [code, 0])),
    cups: Object.fromEntries(teams.map(({ code }) => [code, 0])),
    unassigned: 0,
    updatedAt: null,
  });

  const counts = Object.fromEntries(teams.map(({ code }) => [code, 0]));
  const cups = Object.fromEntries(teams.map(({ code }) => [code, 0]));
  let unassigned = 0;
  let updatedAt = null;

  function resetState() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const emptyState = createEmptyState();
    fs.writeFileSync(filePath, JSON.stringify({
      updatedAt: emptyState.updatedAt,
      counts: emptyState.counts,
      cups: emptyState.cups,
      unassigned: emptyState.unassigned,
    }, null, 2));
    Object.assign(counts, emptyState.counts);
    Object.assign(cups, emptyState.cups);
    unassigned = emptyState.unassigned;
    updatedAt = emptyState.updatedAt;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.includes('\0')) {
      throw new SyntaxError('El archivo de estadísticas está corrupto.');
    }
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)
      || !saved.counts || typeof saved.counts !== 'object' || Array.isArray(saved.counts)) {
      throw new Error('El archivo de estadísticas de comentarios no es válido.');
    }
    for (const [code, value] of Object.entries(saved.counts)) {
      if (Object.hasOwn(counts, code)) {
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new Error(`El conteo de comentarios de ${code} no es válido.`);
        }
        counts[code] = value;
      }
    }
    if (saved.cups !== undefined
      && (!saved.cups || typeof saved.cups !== 'object' || Array.isArray(saved.cups))) {
      throw new Error('Las copas guardadas no son válidas.');
    }
    for (const [code, value] of Object.entries(saved.cups || {})) {
      if (Object.hasOwn(cups, code)) {
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new Error(`El conteo de copas de ${code} no es válido.`);
        }
        cups[code] = value;
      }
    }
    if (saved.unassigned !== undefined) {
      if (!Number.isSafeInteger(saved.unassigned) || saved.unassigned < 0) {
        throw new Error('El conteo de comentarios sin país no es válido.');
      }
      unassigned = saved.unassigned;
    }
    if (saved.updatedAt !== undefined) {
      if (saved.updatedAt === null) {
        updatedAt = null;
      } else if (typeof saved.updatedAt !== 'string' || Number.isNaN(Date.parse(saved.updatedAt))) {
        throw new Error('La fecha de estadísticas guardada no es válida.');
      } else {
        updatedAt = saved.updatedAt;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      if (error instanceof SyntaxError) {
        resetState();
      } else {
        throw error;
      }
    }
  }

  function getStats() {
    const teamsWithCounts = teams.map((team) => ({
      ...team,
      comments: counts[team.code],
    }));
    return {
      updatedAt,
      total: teamsWithCounts.reduce((sum, team) => sum + team.comments, unassigned),
      unassigned,
      teams: teamsWithCounts,
    };
  }

  function recordComment(content) {
    const team = findMentionedTeam(content);
    if (team) counts[team.code]++;
    else unassigned++;
    updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ updatedAt, counts, cups, unassigned }, null, 2));
    return getStats();
  }

  function getCupStats() {
    return {
      updatedAt,
      countries: teams.map(({ code, name }) => ({
        code,
        name,
        cups: cups[code],
      })),
    };
  }

  function recordCup(code) {
    if (!Object.hasOwn(cups, code)) return null;
    cups[code]++;
    updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ updatedAt, counts, cups, unassigned }, null, 2));
    return getCupStats();
  }

  return { getStats, getCupStats, recordComment, recordCup };
}

module.exports = { createCommentStatsService, teams };
