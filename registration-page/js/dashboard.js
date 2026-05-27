/**
 * Dashboard Main Script
 */

import { requireAuth, logoutUser, getUsers } from './utils/auth.js';
import { initTheme, toggleTheme } from './utils/theme.js';
import { getUserProgress, calculateProgress, resetAllProgress } from './utils/progress.js';
import { showToast } from './utils/animations.js';
import { sfx } from './utils/audio-synth.js';

/**
 * Экранирование HTML для безопасной подстановки в innerHTML.
 */
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class Dashboard {
  constructor() {
    this.chapters = [];
    this.currentUser = null;
    this.init();
  }

  async init() {
    // Auth-guard: если не авторизован — redirect и стоп
    this.currentUser = requireAuth('login.html');
    if (!this.currentUser) return;

    // Инициализация темы
    initTheme();

    // Инициализация настроек (звук, шрифт, оформление)
    this.initSettings();

    // Загрузка данных
    await this.loadChapters();

    // Рендер компонентов
    this.renderChapters();
    this.renderUserBadge();

    // Подключение событий
    this.attachEvents();

    // Приветствие
    this.showWelcome();
  }

  /**
   * Отображение текущего пользователя в шапке
   */
  renderUserBadge() {
    const badge = document.getElementById('user-badge');
    const name = document.getElementById('user-badge-name');
    if (!badge || !name || !this.currentUser) return;

    name.textContent = this.currentUser.username;
    badge.hidden = false;
    badge.setAttribute('title', `Вы вошли как ${this.currentUser.username}`);
  }

  /**
   * Загрузка глав
   */
  async loadChapters() {
    try {
      const response = await fetch(`./js/config/chapters-config.json?t=${Date.now()}`);
      const data = await response.json();
      this.chapters = data.chapters;
      
      // Обновить прогресс из localStorage
      const userProgress = getUserProgress();
      
      this.chapters.forEach(chapter => {
        const progress = userProgress[chapter.id];
        if (progress) {
          // Подсчитать завершённые вопросы из эпизодов
          chapter.completedQuestions = (progress.completedEpisodes || []).length;
        }
      });
    } catch (error) {
      console.error('Failed to load chapters:', error);
      showToast('Ошибка загрузки данных', 'error');
    }
  }

  /**
   * Рендер карточек глав
   */
  renderChapters() {
    const container = document.getElementById('chapters-grid');
    
    if (!container) return;
    
    container.innerHTML = this.chapters
      .map(chapter => this.createChapterCard(chapter))
      .join('');

    // Анимированное заполнение прогресс-баров при загрузке
    setTimeout(() => {
      const fills = container.querySelectorAll('.progress-bar-fill');
      fills.forEach(fill => {
        const targetWidth = fill.getAttribute('data-target-width') || '0';
        fill.style.width = `${targetWidth}%`;
      });
    }, 150);
  }

  /**
   * Создать карточку главы
   */
  createChapterCard(chapter) {
    const totalEpisodes = 6; // У каждой главы 6 эпизодов
    const completedEpisodes = chapter.completedQuestions || 0;
    const progressPercent = Math.round((completedEpisodes / totalEpisodes) * 100);
    
    const isCompleted = completedEpisodes === totalEpisodes;
    const lockedClass = chapter.locked ? 'locked' : '';
    
    const safeTitle = escapeHtml(chapter.title);
    const safeImage = escapeHtml(chapter.image);
    const safeId = escapeHtml(chapter.id);

    return `
      <article 
        class="chapter-card ${lockedClass}" 
        data-chapter-id="${safeId}"
        tabindex="0"
        role="button"
        aria-label="${safeTitle}"
      >
        <!-- Background Image -->
        <img 
          src="${safeImage}" 
          alt="${safeTitle}"
          class="card-image"
          loading="lazy"
          onerror="this.onerror=null; const f = {
            'hermitage': 'https://images.unsplash.com/photo-1597047084897-51e81819a4a7?q=80&w=1200',
            'isaac-cathedral': 'https://images.unsplash.com/photo-1555465910-31f7f20a184d?q=80&w=1200',
            'savior-on-blood': 'https://images.unsplash.com/photo-1555465910-c4083d1c47ea?q=80&w=1200',
            'peterhof': 'https://images.unsplash.com/photo-1582235942541-15b53d1000b2?q=80&w=1200'
          }; this.src = f['${safeId}'] || 'https://images.unsplash.com/photo-1597047084897-51e81819a4a7?q=80&w=1200';"
        />
        
        <!-- Gradient Overlay -->
        <div class="card-overlay"></div>
        
        <!-- Completed Badge -->
        ${isCompleted ? `
          <div class="card-completed-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Завершено</span>
          </div>
        ` : ''}
        
        <!-- Lock Badge -->
        ${chapter.locked ? `
          <div class="card-lock-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
        ` : ''}
        
        <!-- Content -->
        <div class="card-content">
          <h3 class="card-title">${safeTitle}</h3>
          
          <div class="card-progress">
            ${chapter.locked ? `
              <svg class="progress-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <span>В разработке, скоро появится</span>
            ` : `
              <svg class="progress-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>Пройдено эпизодов: ${completedEpisodes}/${totalEpisodes}</span>
            `}
          </div>
          
          <!-- Progress Bar -->
          <div class="progress-bar-container" ${chapter.locked ? 'style="display: none;"' : ''}>
            <div 
              class="progress-bar-fill" 
              style="width: 0%"
              data-target-width="${progressPercent}"
              aria-valuenow="${progressPercent}"
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            ></div>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Подключение событий
   */
  attachEvents() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = toggleTheme();
        showToast(
          `Тема изменена на ${newTheme === 'dark' ? 'темную' : 'светлую'}`,
          'info',
          1500
        );
      });
    }

    // Settings listeners & modal binding
    this.setupSettingsListeners();

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const confirmed = confirm('Выйти из аккаунта?');
        if (!confirmed) return;
        logoutUser();
        showToast('Вы вышли из аккаунта', 'info', 1200);
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 700);
      });
    }

    // Chapter Cards
    const chapterCards = document.querySelectorAll('.chapter-card');
    chapterCards.forEach(card => {
      card.addEventListener('click', this.handleChapterClick.bind(this));
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleChapterClick(e);
        }
      });
    });

    // Dock Navigation
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', this.handleDockNavigation.bind(this));
    });
  }

  /**
   * Обработчик клика по главе
   */
  handleChapterClick(event) {
    const card = event.currentTarget;
    const chapterId = card.dataset.chapterId;
    const chapter = this.chapters.find(c => c.id === chapterId);

    if (!chapter) {
      console.error('Chapter not found:', chapterId);
      return;
    }

    if (chapter.locked || chapterId !== 'hermitage') {
      showToast('В разработке, скоро появится', 'warning', 2000);
      return;
    }

    // Сохраняем выбранную главу в localStorage
    localStorage.setItem('currentChapter', JSON.stringify(chapter));

    // Показываем уведомление
    showToast(`Переход к главе: ${chapter.title}`, 'info', 1000);
    
    // Переход на карту пути главы
    setTimeout(() => {
      window.location.href = `chapter-path.html?chapter=${chapterId}`;
    }, 500);
  }

  /**
   * Обработчик навигации Dock
   */
  handleDockNavigation(event) {
    const button = event.currentTarget;
    const page = button.dataset.page;

    // Убрать активное состояние со всех
    document.querySelectorAll('.dock-item').forEach(item => {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    });

    // Установить активное состояние
    button.classList.add('active');
    button.setAttribute('aria-current', 'page');

    // Навигация
    switch (page) {
      case 'chapters':
        // Уже на странице глав
        break;
      case 'map':
        showToast('Переход на карту...', 'info', 800);
        setTimeout(() => {
          window.location.href = 'map.html';
        }, 800);
        break;
      case 'feed':
        showToast('Открываем ленту новостей...', 'info', 800);
        setTimeout(() => {
          window.location.href = 'feed.html';
        }, 800);
        break;
      case 'profile':
        showToast('Переход в профиль...', 'info', 800);
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 800);
        break;
    }
  }

  /**
   * Приветствие пользователя
   */
  showWelcome() {
    if (this.currentUser) {
      setTimeout(() => {
        showToast(
          `Добро пожаловать, ${this.currentUser.username}!`,
          'success',
          2500
        );
      }, 500);
    }
  }

  /**
   * Инициализация базовых параметров настроек
   */
  initSettings() {
    if (localStorage.getItem('spb_settings_sounds') === null) {
      localStorage.setItem('spb_settings_sounds', 'true');
    }
    if (localStorage.getItem('spb_settings_ambient') === null) {
      localStorage.setItem('spb_settings_ambient', 'false');
    }
    if (localStorage.getItem('spb_settings_soundscape') === null) {
      localStorage.setItem('spb_settings_soundscape', 'neva');
    }
    if (localStorage.getItem('spb_settings_font_scale') === null) {
      localStorage.setItem('spb_settings_font_scale', 'normal');
    }

    // Применение сохраненного масштаба
    this.applyFontScale(localStorage.getItem('spb_settings_font_scale'));

    // Слушатели интерактивного включения эмбиента (в обход блокировки аудио в браузерах)
    const startAudioContextOnInteraction = () => {
      sfx.startAmbient();
      document.removeEventListener('click', startAudioContextOnInteraction);
      document.removeEventListener('keydown', startAudioContextOnInteraction);
    };
    document.addEventListener('click', startAudioContextOnInteraction);
    document.addEventListener('keydown', startAudioContextOnInteraction);
  }

  /**
   * Применение CSS масштаба шрифта
   */
  applyFontScale(scale) {
    document.documentElement.classList.remove('font-size-large', 'font-size-largest');
    if (scale === 'large') {
      document.documentElement.classList.add('font-size-large');
    } else if (scale === 'largest') {
      document.documentElement.classList.add('font-size-largest');
    }
  }

  /**
   * Настройка интерактивных событий модального окна настроек
   */
  setupSettingsListeners() {
    const settingsBtn = document.getElementById('settings-btn');
    const overlay = document.getElementById('settings-overlay');
    const closeBtn = document.getElementById('settings-close-btn');
    const cancelBtn = document.getElementById('settings-cancel-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const resetBtn = document.getElementById('settings-reset-btn');
    const nicknameInput = document.getElementById('settings-nickname-input');
    const fontScaleSelect = document.getElementById('settings-font-scale');
    const soundSwitch = document.getElementById('settings-sound-switch');
    const ambientSwitch = document.getElementById('settings-ambient-switch');
    const soundscapeSelect = document.getElementById('settings-soundscape-select');
    const soundscapeRow = document.getElementById('settings-soundscape-row');

    if (!overlay) return;

    // Реактивное отображение строки выбора ландшафта в зависимости от эмбиента
    const updateSoundscapeRowVisibility = () => {
      if (soundscapeRow) {
        soundscapeRow.style.display = ambientSwitch && ambientSwitch.checked ? 'flex' : 'none';
      }
    };

    // Открытие модального окна
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        // Заполнение текущих полей формы
        if (nicknameInput) nicknameInput.value = this.currentUser ? this.currentUser.username : '';
        if (fontScaleSelect) fontScaleSelect.value = localStorage.getItem('spb_settings_font_scale') || 'normal';
        if (soundSwitch) soundSwitch.checked = localStorage.getItem('spb_settings_sounds') === 'true';
        if (ambientSwitch) ambientSwitch.checked = localStorage.getItem('spb_settings_ambient') === 'true';
        if (soundscapeSelect) soundscapeSelect.value = localStorage.getItem('spb_settings_soundscape') || 'neva';

        updateSoundscapeRowVisibility();
        overlay.classList.add('active');
      });
    }

    // Воспроизведение тестового звука при включении эффектов
    if (soundSwitch) {
      soundSwitch.addEventListener('change', () => {
        if (soundSwitch.checked) {
          localStorage.setItem('spb_settings_sounds', 'true');
          sfx.playNotification();
        } else {
          localStorage.setItem('spb_settings_sounds', 'false');
        }
      });
    }

    // Реактивный автозапуск эмбиента при переключении
    if (ambientSwitch) {
      ambientSwitch.addEventListener('change', () => {
        updateSoundscapeRowVisibility();
        if (ambientSwitch.checked) {
          localStorage.setItem('spb_settings_ambient', 'true');
          localStorage.setItem('spb_settings_soundscape', soundscapeSelect ? soundscapeSelect.value : 'neva');
          sfx.startAmbient();
        } else {
          localStorage.setItem('spb_settings_ambient', 'false');
          sfx.stopAmbient();
        }
      });
    }

    if (soundscapeSelect) {
      soundscapeSelect.addEventListener('change', () => {
        if (ambientSwitch && ambientSwitch.checked) {
          localStorage.setItem('spb_settings_soundscape', soundscapeSelect.value);
          sfx.startAmbient();
        }
      });
    }

    // Закрытие настроек без сохранения (сброс к ранее сохраненным звуковым настройкам)
    const closeModal = (e) => {
      if (e) e.preventDefault();
      sfx.playClick();
      overlay.classList.remove('active');
      
      // Восстановление фоновой музыки по ранее сохраненным настройкам в БД
      sfx.startAmbient();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Сохранение настроек
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        const newName = nicknameInput ? nicknameInput.value.trim() : '';
        const newScale = fontScaleSelect ? fontScaleSelect.value : 'normal';
        const soundEnabled = soundSwitch ? soundSwitch.checked : true;
        const ambientEnabled = ambientSwitch ? ambientSwitch.checked : false;
        const soundscape = soundscapeSelect ? soundscapeSelect.value : 'neva';

        if (!newName) {
          showToast('Ваше имя не может быть пустым', 'error');
          return;
         }

        if (newName.length > 20) {
          showToast('Предел длины имени — 20 символов', 'error');
          return;
         }

        // Обновление имени пользователя
        if (this.currentUser && newName !== this.currentUser.username) {
          const users = getUsers();
          const lowerNew = newName.toLowerCase();
          const nameExists = users.some(u => u.username.toLowerCase() === lowerNew && u.id !== this.currentUser.id);

          if (nameExists) {
            showToast('Это имя пользователя уже занято другим игроком', 'error');
            return;
          }

          const userIdx = users.findIndex(u => u.id === this.currentUser.id);
          if (userIdx !== -1) {
            users[userIdx].username = newName;
            localStorage.setItem('spb_users', JSON.stringify(users));
          }

          this.currentUser.username = newName;
          localStorage.setItem('spb_current_user', JSON.stringify(this.currentUser));
          this.renderUserBadge();
        }

        // Сохранение настроек в localStorage
        localStorage.setItem('spb_settings_font_scale', newScale);
        localStorage.setItem('spb_settings_sounds', soundEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_ambient', ambientEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_soundscape', soundscape);

        // Применяем масштаб
        this.applyFontScale(newScale);

        // Запускаем/гасим эмбиент
        if (ambientEnabled) {
          sfx.startAmbient();
        } else {
          sfx.stopAmbient();
        }

        overlay.classList.remove('active');
        showToast('Настройки успешно сохранены!', 'success', 2000);
        sfx.playNotification();
      });
    }

    // Кнопка сброса прогресса (Опасная зона)
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        const confirmed = confirm('Вы уверены, что хотите полностью стереть ваш игровой прогресс? Все ваши пройденные викторины и достижения будут удалены.');
        if (!confirmed) return;

        const doubleConfirmed = confirm('Это действие полностью удалит записи. Начать заново?');
        if (!doubleConfirmed) return;

        resetAllProgress();
        showToast('Прогресс успешно очищен! Перезагрузка...', 'info', 1500);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      });
    }
  }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});

export default Dashboard;