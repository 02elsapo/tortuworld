const fs = require('node:fs');
const path = require('node:path');

const MAX_RECENT_USERS = 4;

function normalizeUsers(values) {
  if (!Array.isArray(values)) return null;
  const users = new Map();

  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || typeof value.username !== 'string') return null;
    const username = value.username.trim();
    const avatar = value.avatar === undefined ? '' : value.avatar;
    const t = value.t === undefined ? Date.now() : value.t;
    if (!username || username.length > 80 || typeof avatar !== 'string' || avatar.length > 2048
      || (avatar && !/^https?:\/\//i.test(avatar))
      || !Number.isSafeInteger(t) || t < 0) return null;

    const user = { username, avatar, t };
    const key = username.toLocaleLowerCase();
    users.delete(key);
    users.set(key, user);
  }

  return [...users.values()].slice(-MAX_RECENT_USERS);
}

function createRecentUsersService({ filePath }) {
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error('La ruta del archivo de usuarios recientes es obligatoria.');
  }

  let users = [];
  let updatedAt = null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.includes('\0')) {
      throw new Error('El archivo de usuarios recientes está corrupto.');
    }
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)
      || !Array.isArray(saved.users)) {
      throw new Error('El archivo de usuarios recientes no es válido.');
    }
    users = normalizeUsers(saved.users);
    if (!users) throw new Error('El archivo de usuarios recientes no es válido.');
    if (saved.updatedAt !== undefined && typeof saved.updatedAt !== 'string') {
      throw new Error('La fecha de usuarios recientes guardada no es válida.');
    }
    updatedAt = saved.updatedAt || null;
  } catch (error) {
    users = [];
    updatedAt = null;
  }

  function getRecentUsers() {
    return { updatedAt, users: users.map((user) => ({ ...user })) };
  }

  function saveRecentUsers(values) {
    const next = normalizeUsers(values);
    if (!next) return null;
    users = next;
    updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ updatedAt, users }, null, 2));
    return getRecentUsers();
  }

  function rememberConnectedUser(value) {
    const user = normalizeUsers([{
      username: value?.username,
      avatar: value?.avatar,
      t: Date.now(),
    }])?.[0];
    if (!user) return null;

    const key = user.username.toLocaleLowerCase();
    const existing = users.find((item) => item.username.toLocaleLowerCase() === key);
    if (!user.avatar && existing?.avatar) user.avatar = existing.avatar;
    return saveRecentUsers([
      ...users.filter((item) => item.username.toLocaleLowerCase() !== key),
      user,
    ]);
  }

  function updateRecentUserAvatar(value) {
    const user = normalizeUsers([{
      username: value?.username,
      avatar: value?.avatar,
      t: Date.now(),
    }])?.[0];
    if (!user?.avatar) return getRecentUsers();

    const key = user.username.toLocaleLowerCase();
    const existing = users.find((item) => item.username.toLocaleLowerCase() === key);
    if (!existing || existing.avatar === user.avatar) return getRecentUsers();
    return saveRecentUsers(users.map((item) => (
      item.username.toLocaleLowerCase() === key
        ? { ...item, avatar: user.avatar }
        : item
    )));
  }

  return {
    getRecentUsers,
    saveRecentUsers,
    rememberConnectedUser,
    updateRecentUserAvatar,
  };
}

module.exports = { createRecentUsersService, MAX_RECENT_USERS };
