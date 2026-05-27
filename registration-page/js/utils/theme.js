/**
 * Theme Management Utility
 * Управление темной/светлой темой
 */

const THEME_KEY = 'spb_theme';

/**
 * Получить текущую тему
 */
export function getCurrentTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  
  if (savedTheme) {
    return savedTheme;
  }
  
  // Определить системную тему
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

/**
 * Установить тему
 */
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  
  // Обновить meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? '#000000' : '#F5F5F7'
    );
  }
}

/**
 * Переключить тему
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Инициализировать тему
 */
export function initTheme() {
  const theme = getCurrentTheme();
  setTheme(theme);
}

/**
 * Слушать системные изменения темы
 */
export function watchSystemTheme(callback) {
  if (!window.matchMedia) return;
  
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  darkModeQuery.addEventListener('change', (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    callback(newTheme);
  });
}