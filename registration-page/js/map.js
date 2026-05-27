/**
 * Interactive Live Map of Saint Petersburg
 * Supports real-time theme changing, smooth geographic fly-overs,
 * custom styled retro/luxury pins, and custom popups syncing with game logic.
 */

import { requireAuth, logoutUser, getUsers } from './utils/auth.js';
import { initTheme, toggleTheme } from './utils/theme.js';
import { getUserProgress, calculateProgress, resetAllProgress } from './utils/progress.js';
import { showToast } from './utils/animations.js';
import { sfx } from './utils/audio-synth.js';

class InteractiveMapController {
  constructor() {
    this.currentUser = null;
    this.map = null;
    this.tileLayer = null;
    this.markers = {};
    this.chapters = [];

    // Инициализация координат и дополнительной информации для достопримечательностей
    this.locationsMetadata = {
      'hermitage': {
        coords: [59.9398, 30.3146],
        emoji: '🏛',
        shortFact: 'Здесь хранится более 3 миллионов экспонатов. Чтобы осмотреть каждый по минуте, понадобится 8 лет!',
        distance: 'Центр, Дворцовая пл.'
      },
      'isaac-cathedral': {
        coords: [59.9341, 30.3061],
        emoji: '⛪',
        shortFact: 'Купол собора покрыт 100 килограммами чистого золота, уцелевшим под маскировкой в блокаду.',
        distance: 'Исаакиевская пл.'
      },
      'savior-on-blood': {
        coords: [59.9401, 30.3289],
        emoji: '🏰',
        shortFact: 'Площадь мозаик храма составляет более 7500 квадратных метров — один из крупнейших в Европе!',
        distance: 'Канал Грибоедова'
      },
      'peterhof': {
        coords: [59.8845, 29.9080],
        emoji: '⛲',
        shortFact: 'Фонтанная система Петергофа работает без единого насоса, целиком на естественном давлении воды.',
        distance: 'Финский залив'
      }
    };
  }

  /**
   * Запуск контроллера
   */
  async init() {
    // 1. Проверка авторизации
    this.currentUser = requireAuth();
    if (!this.currentUser) return;

    // 2. Инициализация тем и звуков
    initTheme();
    this.initSettings();

    // 3. Рендер шапки пользователя
    this.renderUserBadge();

    // 4. Загрузка данных о главах
    await this.loadChaptersData();

    // 5. Инициализация интерактивной карты Leaflet
    this.initLeafletMap();

    // 6. Подключение слушателей
    this.setupListeners();
    this.setupSettingsListeners();

    // 7. Показ приветственного тоста на карте
    setTimeout(() => {
      showToast('Живая карта Санкт-Петербурга готова к исследованиям!', 'success', 2500);
      sfx.playNotification();
    }, 400);
  }

  /**
   * Рендер никнейма в шапке
   */
  renderUserBadge() {
    const userBadgeName = document.getElementById('user-badge-name');
    const userBadge = document.getElementById('user-badge');
    if (userBadgeName && this.currentUser) {
      userBadgeName.textContent = this.currentUser.username;
      userBadge.hidden = false;
    }
  }

  /**
   * Загрузка списка глав из конфигурации
   */
  async loadChaptersData() {
    try {
      const response = await fetch(`./js/config/chapters-config.json?t=${Date.now()}`);
      const data = await response.json();
      this.chapters = data.chapters;
    } catch (e) {
      console.error('Ошибка загрузки глав на карте:', e);
      showToast('Не удалось загрузить данные глав', 'error');
    }
  }

  /**
   * Инициализация карты Leaflet
   */
  initLeafletMap() {
    // Центрируем карту между достопримечательностями в центре СПб
    const defaultCenter = [59.937, 30.315];
    const defaultZoom = 13;

    // Создаем карту (отключаем лишний дефолтный копирайт для чистоты и кастомизации)
    this.map = L.map('spb-interactive-map', {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false, // Отключим стандартный зум для чистоты интерфейса
      attributionControl: false // Отключаем дефолтный контрол, чтобы убрать флаги и ссылки
    });

    // Создаем свой чистый контрол авторов БЕЗ префикса Leaflet (и без флага)
    L.control.attribution({
      prefix: false
    }).addTo(this.map);

    // Добавим компактные кнопки зума в правый нижний угол
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Установка правильного слоя тайлов в зависимости от темы оформления
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.setMapStyle(isDark);

    // Обновление дисплея координат при перемещении мыши по карте
    this.map.on('mousemove', (e) => {
      const displayCoords = document.getElementById('coord-display');
      if (displayCoords) {
        displayCoords.textContent = `${e.latlng.lat.toFixed(4)}° N, ${e.latlng.lng.toFixed(4)}° E`;
      }
    });

    // Рисуем все маркеры достопримечательностей
    this.renderMapMarkersAndSidebar();
  }

  /**
   * Переключение стиля карты (светлая/темная)
   */
  setMapStyle(isDark) {
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    // Для светлой темы используем классический высококонтрастный и детальный OpenStreetMap.
    // Для темной темы - стильный, глубокий CartoDB Dark.
    const lightTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    const tileUrl = isDark ? darkTiles : lightTiles;
    const attributionInput = isDark 
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>';

    this.tileLayer = L.tileLayer(tileUrl, {
      attribution: attributionInput,
      subdomains: isDark ? 'abcd' : 'abc',
      maxZoom: isDark ? 20 : 19
    }).addTo(this.map);
  }

  /**
   * Рендер меток и списка в боковой панели
   */
  renderMapMarkersAndSidebar() {
    const listContainer = document.getElementById('locations-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    this.chapters.forEach(chapter => {
      const meta = this.locationsMetadata[chapter.id];
      if (!meta) return;

      const progress = getUserProgress(this.currentUser.id, chapter.id);
      const isHermitage = chapter.id === 'hermitage';
      // Глава доступна только если это Эрмитаж (остальные 3 заблокированы)
      const isAvailable = isHermitage;

      // ─────────────────────────────────────
      // А. Создаем метку Leaflet на карте
      // ─────────────────────────────────────
      
      // Кастомный HTML-код для красивого плавного маркера с бэкграунд радаром
      const customIconHtml = `
        <div class="custom-map-marker">
          <div class="marker-radar"></div>
          <div class="marker-radar-2"></div>
          <div class="marker-pin-inner">
            <span class="marker-emoji">${meta.emoji}</span>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-div-icon',
        iconSize: [50, 50],
        iconAnchor: [25, 46],
        popupAnchor: [0, -42]
      });

      // Добавляем маркер на карту
      const marker = L.marker(meta.coords, { icon: markerIcon }).addTo(this.map);
      this.markers[chapter.id] = marker;

      // HTML код внутри всплывающего окна (Popup)
      const statusText = isAvailable ? 'Доступно' : 'В разработке';
      const statusClass = isAvailable ? 'available' : 'locked';
      const btnText = isAvailable ? 'Изучить тайны' : 'В разработке';
      const btnClass = isAvailable ? '' : 'locked';

      const popupContent = `
        <div class="map-popup-card">
          <div class="popup-img-wrapper">
            <img src="${chapter.image}" class="popup-img" alt="${chapter.title}">
            <div class="popup-badge ${statusClass}">${statusText}</div>
          </div>
          <div class="popup-body">
            <h3 class="popup-title">${chapter.title}</h3>
            <p class="popup-desc">${meta.shortFact}</p>
            <div class="popup-footer">
              <button class="popup-btn ${btnClass}" data-chapter-id="${chapter.id}">
                ${btnText}
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        keepInView: true,
        closeButton: false,
        offset: [0, 4]
      });

      // ─────────────────────────────────────
      // Б. Добавляем карточку в боковую панель
      // ─────────────────────────────────────
      const itemCard = document.createElement('div');
      itemCard.className = `location-item location-${chapter.id}`;
      itemCard.dataset.chapterId = chapter.id;
      itemCard.innerHTML = `
        <div class="location-thumb-wrapper">
          <img class="location-thumb" src="${chapter.image}" alt="${chapter.title}">
        </div>
        <div class="location-details">
          <h3 class="location-title">${chapter.title}</h3>
          <p class="location-desc">${chapter.description}</p>
          <div class="location-meta">
            <span class="location-status ${statusClass}">${statusText}</span>
            <span class="location-coords">${meta.distance}</span>
          </div>
        </div>
      `;

      itemCard.addEventListener('click', () => {
        this.focusOnLocation(chapter.id);
      });

      listContainer.appendChild(itemCard);
    });

    // Делегированный обработчик события клика внутри поп-апов
    this.map.on('popupopen', (e) => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;

      const actionBtn = popupNode.querySelector('.popup-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const targetId = actionBtn.getAttribute('data-chapter-id');
          this.handleChapterEngagement(targetId);
        });
      }
    });
  }

  /**
   * Сфокусироваться на главе: облететь карту и подсветить
   */
  focusOnLocation(chapterId) {
    sfx.playClick();

    const meta = this.locationsMetadata[chapterId];
    const marker = this.markers[chapterId];
    if (!meta || !marker) return;

    // Снимаем активность со всех элементов списка
    document.querySelectorAll('.location-item').forEach(item => {
      item.classList.remove('active');
    });

    // Подсвечиваем текущий элемент списка
    const targetCard = document.querySelector(`.location-item.location-${chapterId}`);
    if (targetCard) {
      targetCard.classList.add('active');
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Облетаем карту к точке с приближением
    this.map.flyTo(meta.coords, 15, {
      animate: true,
      duration: 1.5
    });

    // Открываем всплывающее окно программно
    setTimeout(() => {
      marker.openPopup();
    }, 1200);
  }

  /**
   * Клик по кнопке запуска расследования в поп-апе
   */
  handleChapterEngagement(chapterId) {
    sfx.playClick();

    const isHermitage = chapterId === 'hermitage';
    if (!isHermitage) {
      showToast('В разработке, скоро появится', 'warning', 2000);
      sfx.playNotification();
      return;
    }

    // Плавный переход
    showToast(`Переходим в ${this.chapters.find(c => c.id === 'hermitage').title}...`, 'info', 1000);
    setTimeout(() => {
      window.location.href = `chapter-path.html?chapter=${chapterId}`;
    }, 1000);
  }

  /**
   * Подключение слушателей событий (тема, док, выход)
   */
  setupListeners() {
    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        sfx.playClick();
        toggleTheme();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.setMapStyle(isDark);
      });
    }

    // Floating Dock Navigation
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        const page = item.dataset.page;
        if (page === 'map') return; // Уже на карте

        dockItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');

        switch (page) {
          case 'chapters':
            showToast('Возвращаемся во дворец...', 'info', 800);
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            break;
          case 'feed':
            showToast('Открываем ленту новостей...', 'info', 800);
            setTimeout(() => { window.location.href = 'feed.html'; }, 800);
            break;
          case 'profile':
            showToast('Переход в профиль...', 'info', 800);
            setTimeout(() => { window.location.href = 'profile.html'; }, 800);
            break;
        }
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sfx.playClick();
        logoutUser();
      });
    }
  }

  /**
   * Инициализация настроек (из Dashboard)
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

    this.applyFontScale(localStorage.getItem('spb_settings_font_scale'));
  }

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

    const updateSoundscapeRowVisibility = () => {
      if (soundscapeRow) {
        soundscapeRow.style.display = ambientSwitch && ambientSwitch.checked ? 'flex' : 'none';
      }
    };

    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        if (nicknameInput) nicknameInput.value = this.currentUser ? this.currentUser.username : '';
        if (fontScaleSelect) fontScaleSelect.value = localStorage.getItem('spb_settings_font_scale') || 'normal';
        if (soundSwitch) soundSwitch.checked = localStorage.getItem('spb_settings_sounds') === 'true';
        if (ambientSwitch) ambientSwitch.checked = localStorage.getItem('spb_settings_ambient') === 'true';
        if (soundscapeSelect) soundscapeSelect.value = localStorage.getItem('spb_settings_soundscape') || 'neva';

        updateSoundscapeRowVisibility();
        overlay.classList.add('active');
      });
    }

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

    const closeModal = (e) => {
      if (e) e.preventDefault();
      sfx.playClick();
      overlay.classList.remove('active');
      sfx.startAmbient();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

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

        localStorage.setItem('spb_settings_font_scale', newScale);
        localStorage.setItem('spb_settings_sounds', soundEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_ambient', ambientEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_soundscape', soundscape);

        this.applyFontScale(newScale);

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

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playClick();

        const confirmed = confirm('Вы уверены, что хотите полностью стереть ваш игровой прогресс? Все ваши пройденные викторины и достижения будут удалены.');
        if (!confirmed) return;

        resetAllProgress();
        showToast('Прогресс успешно очищен! Перезагрузка...', 'info', 1500);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      });
    }
  }
}

// Запуск при полной загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  const mapController = new InteractiveMapController();
  mapController.init();
});
