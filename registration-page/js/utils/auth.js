/**
 * Authentication Utility
 * Локальная система авторизации с безопасным хешированием паролей.
 *
 * Безопасность:
 *  - Пароли НЕ хранятся в открытом виде.
 *  - Используется PBKDF2 (Web Crypto API) с уникальной солью на каждого пользователя,
 *    100 000 итераций и SHA-256.
 *  - Поддерживается миграция со старого формата (plain-text password):
 *    при первом успешном входе пароль автоматически пере-хешируется.
 *
 *  ⚠️  Это всё ещё клиентское хранилище. localStorage уязвимо к XSS, поэтому
 *  данная схема обеспечивает разумный минимум безопасности для демо-проекта,
 *  но НЕ заменяет полноценный серверный auth.
 */

const USERS_STORAGE_KEY = 'spb_users';
const CURRENT_USER_KEY = 'spb_current_user';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

/* -------------------------------------------------------------------------- */
/*  Низкоуровневые крипто-утилиты                                              */
/* -------------------------------------------------------------------------- */

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function randomSalt() {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

async function pbkdf2(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_BITS
  );

  return new Uint8Array(derived);
}

/**
 * Хешировать пароль. Возвращает строку формата:
 *   pbkdf2$<iterations>$<saltHex>$<hashHex>
 */
async function hashPassword(password) {
  const salt = randomSalt();
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

/**
 * Постоянное по времени сравнение строк (защита от timing-атак).
 */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Проверить пароль против сохранённого значения.
 * Поддерживает оба формата:
 *  - "pbkdf2$..."          — новый, безопасный
 *  - "любая строка"        — устаревший plain-text (для миграции)
 */
async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return { ok: false, legacy: false };

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return { ok: false, legacy: false };

    const [, iterStr, saltHex, hashHex] = parts;
    const iterations = parseInt(iterStr, 10);
    const salt = hexToBytes(saltHex);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      HASH_BITS
    );
    const computedHex = bytesToHex(new Uint8Array(derived));

    return { ok: constantTimeEqual(computedHex, hashHex), legacy: false };
  }

  // Legacy plain-text fallback (мигрируем при следующем входе)
  return { ok: stored === password, legacy: true };
}

/* -------------------------------------------------------------------------- */
/*  Хранилище пользователей                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Получить пользователей
 */
export function getUsers() {
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  if (!users) return [];

  try {
    const parsed = JSON.parse(users);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Invalid users data in localStorage, reset to empty array.', error);
    return [];
  }
}

/**
 * Сохранить пользователей
 */
function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

/**
 * Проверка уникальности username
 */
export function isUsernameUnique(username) {
  const users = getUsers();
  const target = username.toLowerCase();
  return !users.some(user => user.username.toLowerCase() === target);
}

/* -------------------------------------------------------------------------- */
/*  Публичный API                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Регистрация пользователя.
 * Пароль хешируется PBKDF2-SHA256.
 *
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export async function registerUser(username, password) {
  if (!isUsernameUnique(username)) {
    return {
      success: false,
      message: 'Имя пользователя уже занято'
    };
  }

  let passwordHash;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    console.error('Password hashing failed:', error);
    return {
      success: false,
      message: 'Не удалось зашифровать пароль. Попробуйте ещё раз.'
    };
  }

  const users = getUsers();

  const newUser = {
    id: Date.now(),
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Никогда не возвращаем хеш наружу
  const { passwordHash: _hidden, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

/**
 * Авторизация.
 * Поддерживает legacy plain-text пароли (с автоматической миграцией).
 *
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export async function loginUser(username, password) {
  const users = getUsers();
  const idx = users.findIndex(u => u.username === username);

  if (idx === -1) {
    return {
      success: false,
      message: 'Неверное имя пользователя или пароль'
    };
  }

  const user = users[idx];
  // Поле могло называться password (legacy) либо passwordHash (новый формат).
  const stored = user.passwordHash ?? user.password ?? '';

  let verify;
  try {
    verify = await verifyPassword(password, stored);
  } catch (error) {
    console.error('Password verification failed:', error);
    return {
      success: false,
      message: 'Ошибка проверки пароля'
    };
  }

  if (!verify.ok) {
    return {
      success: false,
      message: 'Неверное имя пользователя или пароль'
    };
  }

  // Миграция со старого plain-text формата.
  if (verify.legacy) {
    try {
      user.passwordHash = await hashPassword(password);
      delete user.password;
      users[idx] = user;
      saveUsers(users);
    } catch (error) {
      console.warn('Failed to migrate legacy password to hash:', error);
    }
  }

  // Никогда не сохраняем хеш в сессии
  const safeUser = {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));

  return { success: true, user: safeUser };
}

/**
 * Текущий пользователь
 */
export function getCurrentUser() {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch (error) {
    console.warn('Invalid current user data, clearing.', error);
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

/**
 * Выход
 */
export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Auth-guard: проверить авторизацию ДО рендера страницы.
 * Если пользователь не авторизован, выполнить редирект и вернуть null.
 *
 * Используется в самом начале защищённых страниц (dashboard, episode и т.д.),
 * чтобы не было «вспышки» защищённого контента перед редиректом.
 *
 * @param {string} redirectTo - страница, куда редиректить (по умолчанию login.html)
 * @returns {object|null} текущий пользователь или null (с уже выполненным редиректом)
 */
export function requireAuth(redirectTo = 'login.html') {
  const user = getCurrentUser();
  if (!user) {
    // Сохраним, куда пользователь хотел попасть — после логина вернём
    try {
      sessionStorage.setItem('spb_redirect_after_login', window.location.href);
    } catch (_) { /* ignore */ }
    window.location.replace(redirectTo);
    return null;
  }
  return user;
}
