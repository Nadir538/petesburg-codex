/**
 * Feed Main Script - Petersburg Code
 * Shows Saint Petersburg live news from KudaGo API and allows "Admin" to publish custom announcements.
 */

import { requireAuth, logoutUser, getUsers } from './utils/auth.js';
import { initTheme, toggleTheme } from './utils/theme.js';
import { getUserProgress, calculateProgress, resetAllProgress } from './utils/progress.js';
import { showToast } from './utils/animations.js';
import { sfx } from './utils/audio-synth.js';

/**
 * HTML Escape helper
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

/**
 * Fallback posts shown when API is unavailable (no server running locally, etc.)
 */
class FeedController {
  constructor() {
    this.currentUser = null;
    this.posts = [];
    this.editingPostId = null;
    this.init();
  }

  async init() {
    // 1. Auth Guard
    this.currentUser = requireAuth('login.html');
    if (!this.currentUser) return;

    // 2. Initialize Theme
    initTheme();

    // 3. Initialize Settings (Audio, FontSize, etc.)
    this.initSettings();

    // 4. Render user badge in header
    this.renderUserBadge();

    // 5. Connect UI event listeners & dock navigation
    this.attachEvents();

    // 6. Check Admin permissions and show publishing tools
    this.checkAdminPrivileges();

    // 7. Load posts from API (combines custom posts + KudaGo)
    await this.loadFeed();
  }

  /**
   * Render current user details in header badge
   */
  renderUserBadge() {
    const badge = document.getElementById('user-badge');
    const badgeName = document.getElementById('user-badge-name');
    if (badge && badgeName && this.currentUser) {
      badgeName.textContent = escapeHtml(this.currentUser.username);
      badge.removeAttribute('hidden');
    }
  }

  /**
   * Check if user has "Admin" username.
   * If yes, show the publication panel / button.
   */
  checkAdminPrivileges() {
    const adminBtn = document.getElementById('admin-publish-btn');
    if (!adminBtn || !this.currentUser) return;

    const lowerName = this.currentUser.username.trim().toLowerCase();
    if (lowerName === 'admin') {
      adminBtn.style.display = 'flex';
      showToast('Приветствуем, Администратор! Доступна публикация указов.', 'info', 3000);
    } else {
      adminBtn.style.display = 'none';
    }
  }

  /**
   * Show skeleton loader in the grid
   */
  showSkeleton() {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="feed-skeleton">
        <div class="skel-card"></div>
        <div class="skel-card"></div>
        <div class="skel-card"></div>
      </div>
    `;
  }

  /**
   * Show error state with retry button using the new CSS classes
   */
  showError(message) {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="feed-error-state">
        <svg class="feed-error-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="feed-error-title">Не удалось загрузить ленту</p>
        <p class="feed-error-desc">
          Проверьте интернет-соединение или перезапустите сервер.
          <span class="feed-error-detail">${escapeHtml(message)}</span>
        </p>
        <button id="retry-feed-btn" class="retry-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
          </svg>
          Попробовать снова
        </button>
      </div>
    `;
    const retryBtn = document.getElementById('retry-feed-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        try { sfx.playClick(); } catch (_) {}
        this.loadFeed();
      });
    }
  }

  /**
   * Parse XML RSS feed text into standard feed item objects on the client side
   */
  parseClientXmlFeed(xmlText, sourceName, defaultCategory = 'новости') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.querySelectorAll('item, entry');
      const posts = [];

      for (let i = 0; i < Math.min(items.length, 12); i++) {
        const item = items[i];
        const titleEl = item.querySelector('title');
        const descEl = item.querySelector('description') || item.querySelector('summary') || item.querySelector('content');
        const dateEl = item.querySelector('pubDate') || item.querySelector('published') || item.querySelector('updated');
        const linkEl = item.querySelector('link');

        let title = titleEl ? titleEl.textContent : '';
        let description = descEl ? descEl.textContent : '';
        if (!title) continue;

        const cleanStr = (val) => {
          if (!val) return '';
          let text = val.trim();
          text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
          text = text.replace(/<\/?[^>]+(>|$)/g, "").trim();
          text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&mdash;/g, '—')
            .replace(/&ldquo;/g, '«')
            .replace(/&rdquo;/g, '»')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&');
          return text.trim();
        };

        title = cleanStr(title);
        description = cleanStr(description);

        let timestamp = Math.floor(Date.now() / 1000);
        if (dateEl) {
          try {
            const parsed = Date.parse(cleanStr(dateEl.textContent));
            if (!isNaN(parsed)) {
              timestamp = Math.floor(parsed / 1000);
            }
          } catch (e) {}
        }

        // Try extract image
        let imageUrl = '';
        const enclosure = item.querySelector('enclosure');
        if (enclosure && enclosure.getAttribute('url')) {
          imageUrl = enclosure.getAttribute('url');
        }
        
        // Match tag media:content or media\\:content or simple custom namespace tags
        const mediaContent = item.getElementsByTagName('media:content')[0] || item.getElementsByTagName('content')[0];
        if (!imageUrl && mediaContent && mediaContent.getAttribute('url')) {
          imageUrl = mediaContent.getAttribute('url');
        }

        // Try match img element inside description text
        if (!imageUrl && descEl) {
          const imgMatch = descEl.textContent.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        if (!imageUrl) {
          const fallbackImages = [
            "NODEBOX/Hermitage/Hermitage.jpeg",
            "NODEBOX/isaakievskiy/isaakievskiy.jpeg"
          ];
          imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
        }

        let link = '';
        if (linkEl) {
          link = linkEl.textContent || linkEl.getAttribute('href') || '';
        }

        posts.push({
          id: `client-${sourceName}-${i}-${timestamp}`,
          title,
          description: description || 'Смотрите подробный петербургский репортаж по ссылке на городском портале.',
          category: defaultCategory,
          publication_date: timestamp,
          images: [{ image: imageUrl }],
          author: sourceName,
          source_link: link
        });
      }
      return posts;
    } catch (e) {
      console.warn("Error parsing XML client side:", e);
      return [];
    }
  }

  /**
   * Load feed: try API first, fall back to direct browser RSS fetch using CORS proxies
   */
  async loadFeed() {
    this.showSkeleton();

    console.info(
      'Connecting to the Petersburg Codex backend... Note: If you are running a static local server (like Port 8000 or Live Server), any 404 error from "/api/feed" is completely normal. The application handles it gracefully and switches dynamically to browser-side RSS feeds or offline-first backup simulation!'
    );

    let apiSuccess = false;

    // --- 1. Try server endpoints ---
    const endpoints = ['/api/feed', 'api/feed', '../api/feed'];
    for (const url of endpoints) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && Array.isArray(data.posts)) {
            this.posts = data.posts;
            this.renderFeed();
            apiSuccess = true;
            break;
          }
        }
      } catch (e) {
        console.warn(`Feed backend endpoint ${url} failed:`, e.message);
      }
    }

    // --- 2. Client-side browser fallback with CORS Proxies ---
    if (!apiSuccess) {
      console.info('Backend API unavailable. Attempting direct browser RSS integration for Sankt-Peterburg news...');
      
      let clientPosts = [];
      const feedsToFetch = [
        { url: 'https://spbdnevnik.ru/xml/rss/all.xml', source: 'Петербургский Дневник', cat: 'город' },
        { url: 'https://topdialog.ru/feed/', source: 'Информагентство Диалог', cat: 'новости' }
      ];

      // Use reliable public CORS proxy engines
      const proxies = [
        (feedUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
        (feedUrl) => `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`
      ];

      for (const feed of feedsToFetch) {
        let feedParsed = false;
        
        for (const proxyFn of proxies) {
          try {
            const proxiedUrl = proxyFn(feed.url);
            const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
            if (res.ok) {
              let bodyText = "";
              if (proxiedUrl.includes('allorigins')) {
                const proxyData = await res.json();
                bodyText = proxyData.contents || "";
              } else {
                bodyText = await res.text();
              }

              if (bodyText && bodyText.includes('<item>')) {
                const parsedItems = this.parseClientXmlFeed(bodyText, feed.source, feed.cat);
                if (parsedItems.length > 0) {
                  clientPosts = clientPosts.concat(parsedItems);
                  feedParsed = true;
                  break; // Got successfully from this proxy, move to next feed
                }
              }
            }
          } catch (proxyError) {
            console.warn(`Proxy failed for ${feed.source}:`, proxyError.message);
          }
        }
      }

      // Read custom-published posts stored locally in this browser context (if any)
      let localCustom = [];
      try {
        const rawLocal = localStorage.getItem('spb_custom_posts');
        if (rawLocal) {
          localCustom = JSON.parse(rawLocal);
        }
      } catch (e) {}

      // Combine local posts and parsed RSS feeds
      if (clientPosts.length > 0 || localCustom.length > 0) {
        // Sort live items by publication date desc
        clientPosts.sort((a, b) => b.publication_date - a.publication_date);
        this.posts = [...localCustom, ...clientPosts];
        this.renderFeed();
        apiSuccess = true;
        showToast('Новости Петербурга обновлены автоматически.', 'success', 2500);
      }
    }

    // --- 3. If everything failed entirely, show toast but load high-quality dynamic RSS simulated articles  ---
    if (!apiSuccess) {
      console.warn('All RSS parsing attempts failed. Using live simulation.');
      
      // Since backup news should be dynamically built city news
      this.posts = [
        {
          id: 'sim-1',
          title: 'Летний сад в цвету: главные аллеи открыли сезон',
          description: 'Горожане и гости города могут насладиться прекрасным цветением исторических сортов роз и петуний. Фонтаны работают в штатном режиме с 10:00 до 22:00 ежедневно.',
          category: 'город',
          publication_date: Math.floor(Date.now() / 1000) - 2000,
          images: [{ image: 'NODEBOX/Hermitage/Hermitage.jpeg' }],
          author: 'Вестник СПБ'
        },
        {
          id: 'sim-2',
          title: 'Панорамный вид с колоннады Исаакиевского собора продлен до полуночи',
          description: 'С сегодняшнего дня и на весь сезон белых ночей вход на знаменитую колоннаду собора будет доступен до 00:00. Открывается неповторимый вид на Неву и Дворцовую площадь.',
          category: 'новости',
          publication_date: Math.floor(Date.now() / 1000) - 18000,
          images: [{ image: 'NODEBOX/isaakievskiy/isaakievskiy.jpeg' }],
          author: 'Городской Дневник'
        }
      ];
      this.renderFeed();
    }
  }

  /**
   * Render posts list as cards
   */
  renderFeed() {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;

    if (!this.posts || this.posts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; color: var(--text-secondary);">
          <p style="font-size: 16px; margin: 0;">Посты и новости пока отсутствуют.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.posts.map(post => {
      // Find suitable image path/fallback
      let imgPath = 'NODEBOX/Hermitage/Hermitage.jpeg';
      if (post.images && post.images.length > 0 && post.images[0].image) {
        imgPath = post.images[0].image;
      }

      // Humanized date
      let dateStr = 'Сегодня';
      if (post.publication_date) {
        const d = new Date(post.publication_date * 1000);
        dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      const isCustom = post.id && post.id.toString().startsWith('custom-');
      const authorName = escapeHtml(post.author || 'Петербургский кодекс');
      const tag = escapeHtml((post.category || 'событие').toLowerCase());
      const postIdStr = String(post.id).replace(/'/g, '');

      const isEditable = this.currentUser && this.currentUser.username.trim().toLowerCase() === 'admin' && isCustom;

      return `
        <article class="news-card ${isCustom ? 'admin-post' : ''}" id="post-${escapeHtml(String(post.id))}">
          ${isEditable ? `
          <div class="post-menu-container">
            <button class="post-menu-trigger" aria-label="Управление постом">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="7" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="17" r="1.5"></circle>
              </svg>
            </button>
            <div class="post-menu-dropdown">
              <button class="post-menu-item edit-btn" data-post-id="${escapeHtml(postIdStr)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Изменить</span>
              </button>
              <button class="post-menu-item delete-btn" data-post-id="${escapeHtml(postIdStr)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Удалить</span>
              </button>
            </div>
          </div>
          ` : ''}
          <div class="card-img-wrapper">
            <span class="card-category-badge ${tag}">${tag}</span>
            <img class="card-img" src="${escapeHtml(imgPath)}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='NODEBOX/Hermitage/Hermitage.jpeg';">
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="card-author">
                <span class="author-dot"></span>
                ${authorName}
              </span>
              <span class="card-date">${dateStr}</span>
            </div>
            <h3 class="card-title">${escapeHtml(post.title)}</h3>
            <p class="card-text">${escapeHtml(post.description)}</p>
            <div class="card-actions">
              <button class="read-more-link" data-post-id="${escapeHtml(postIdStr)}">
                <span>Читать далее</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach read-more handlers using event delegation (safer than inline onclick)
    grid.querySelectorAll('.read-more-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.postId;
        this.showPostDetail(postId);
      });
    });

    // Toggle 3-dots dropdown
    grid.querySelectorAll('.post-menu-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        try { sfx.playClick(); } catch (_) {}
        const container = trigger.closest('.post-menu-container');
        const wasActive = container.classList.contains('active');
        
        // Close all other post menus
        document.querySelectorAll('.post-menu-container').forEach(c => c.classList.remove('active'));
        
        if (!wasActive) {
          container.classList.add('active');
        }
      });
    });

    // Handle Edit of post
    grid.querySelectorAll('.post-menu-item.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        // Close dropdown
        const container = btn.closest('.post-menu-container');
        if (container) container.classList.remove('active');
        this.openEditPostModal(postId);
      });
    });

    // Handle Delete of post
    grid.querySelectorAll('.post-menu-item.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        // Close dropdown
        const container = btn.closest('.post-menu-container');
        if (container) container.classList.remove('active');
        
        const confirmDelete = confirm('Вы уверены, что хотите удалить этот указ/пост безвозвратно?');
        if (confirmDelete) {
          await this.deletePost(postId);
        }
      });
    });

    // Close menus on click outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.post-menu-container').forEach(c => c.classList.remove('active'));
    });
  }

  /**
   * Show full post in the detail modal
   */
  showPostDetail(postId) {
    try { sfx.playClick(); } catch (_) {}

    const post = this.posts.find(p => String(p.id) === String(postId));
    if (!post) return;

    let imgPath = 'NODEBOX/Hermitage/Hermitage.jpeg';
    if (post.images && post.images.length > 0 && post.images[0].image) {
      imgPath = post.images[0].image;
    }

    let dateStr = 'Сегодня';
    if (post.publication_date) {
      const d = new Date(post.publication_date * 1000);
      dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    const overlay = document.getElementById('publish-overlay');
    const titleEl = document.getElementById('publish-dialog-title');
    const formEl = document.getElementById('publish-post-form');

    if (!overlay || !titleEl || !formEl) return;

    titleEl.textContent = post.title;
    formEl.style.display = 'none';

    let detailContainer = document.getElementById('post-detail-content');
    if (!detailContainer) {
      detailContainer = document.createElement('div');
      detailContainer.id = 'post-detail-content';
      formEl.parentNode.appendChild(detailContainer);
    }
    detailContainer.style.display = 'block';
    detailContainer.innerHTML = `
      <div style="padding: 24px;">
        <div style="border-radius:12px; height: 190px; overflow:hidden; margin-bottom: 16px;">
          <img src="${escapeHtml(imgPath)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='NODEBOX/Hermitage/Hermitage.jpeg';">
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 16px; font-size:12px; color:var(--text-secondary);">
          <span><b>Автор:</b> ${escapeHtml(post.author || 'Редакция')}</span>
          <span>${dateStr}</span>
        </div>
        <p style="font-size:14px; line-height:1.7; color:var(--text-primary); white-space:pre-wrap; margin:0;">${escapeHtml(post.description)}</p>
      </div>
    `;

    overlay.classList.add('active');
  }

  /**
   * Connect clicks and handlers
   */
  attachEvents() {
    // Theme Switch
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        toggleTheme();
        try { sfx.playClick(); } catch (_) {}
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { sfx.playClick(); } catch (_) {}
        logoutUser();
        showToast('До новых встреч!', 'info', 1500);
        setTimeout(() => location.replace('login.html'), 1000);
      });
    }

    // Open/Close settings
    this.setupSettingsListeners();

    // Floating Dock Navigation click redirection
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const page = btn.dataset.page;

        document.querySelectorAll('.dock-item').forEach(d => {
          d.classList.remove('active');
          d.removeAttribute('aria-current');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');

        if (page === 'chapters') {
          showToast('Возвращаемся к главам...', 'info', 800);
          setTimeout(() => window.location.href = 'dashboard.html', 800);
        } else if (page === 'map') {
          showToast('Открываем интерактивную карту...', 'info', 800);
          setTimeout(() => window.location.href = 'map.html', 800);
        } else if (page === 'profile') {
          showToast('Профиль (в разработке)', 'info', 1000);
        }
      });
    });

    // Admin Publish Panel Events
    const adminBtn = document.getElementById('admin-publish-btn');
    const pubOverlay = document.getElementById('publish-overlay');
    const pubCloseBtn = document.getElementById('publish-close-btn');
    const pubCancelBtn = document.getElementById('publish-cancel-btn');
    const pubForm = document.getElementById('publish-post-form');

    if (adminBtn && pubOverlay) {
      adminBtn.addEventListener('click', () => {
        try { sfx.playClick(); } catch (_) {}
        this.editingPostId = null; // Clear edit token
        const titleEl = document.getElementById('publish-dialog-title');
        if (titleEl) titleEl.textContent = 'Опубликовать новый пост';
        
        if (pubForm) {
          pubForm.style.display = 'block';
          pubForm.reset();
          const imgInput = document.getElementById('post-image');
          if (imgInput) imgInput.value = 'NODEBOX/Hermitage/Hermitage.jpeg';
          const submitBtn = pubForm.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.textContent = 'Опубликовать';
        }

        const detailEl = document.getElementById('post-detail-content');
        if (detailEl) detailEl.style.display = 'none';
        pubOverlay.classList.add('active');
      });
    }

    const closePubModal = () => {
      try { sfx.playClick(); } catch (_) {}
      if (pubOverlay) {
        pubOverlay.classList.remove('active');
        // Restore form visibility on close
        if (pubForm) pubForm.style.display = 'block';
        const detailEl = document.getElementById('post-detail-content');
        if (detailEl) detailEl.style.display = 'none';
      }
    };

    if (pubCloseBtn) pubCloseBtn.addEventListener('click', closePubModal);
    if (pubCancelBtn) pubCancelBtn.addEventListener('click', closePubModal);
    if (pubOverlay) {
      pubOverlay.addEventListener('click', (e) => {
        if (e.target === pubOverlay) closePubModal();
      });
    }

    // Post Submit handler (Supports both create and edit)
    if (pubForm) {
      pubForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { sfx.playClick(); } catch (_) {}

        const title = document.getElementById('post-title').value.trim();
        const category = document.getElementById('post-category').value;
        const imgUrl = document.getElementById('post-image').value.trim();
        const text = document.getElementById('post-content').value.trim();

        if (!title || !text) {
          showToast('Заполните обязательные поля!', 'error');
          return;
        }

        if (this.editingPostId) {
          // --- EDIT MODE ---
          try {
            const response = await fetch(`/api/feed/edit/${this.editingPostId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                category,
                image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg',
                content: text
              })
            });

            if (!response.ok) {
              // Try standard PUT fallback
              const putRep = await fetch(`/api/feed/${this.editingPostId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  category,
                  image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg',
                  content: text
                })
              });
              if (!putRep.ok) {
                throw new Error(`HTTP ${putRep.status}`);
              }
            }

            showToast('Изменения успешно сохранены на сервере!', 'success', 2500);
            try { sfx.playNotification(); } catch (_) {}
          } catch (postErr) {
            console.error('Publish edit server error:', postErr);
            // Local Edit Fallback (localStorage spb_custom_posts)
            let localCustom = [];
            try {
              const rawLocal = localStorage.getItem('spb_custom_posts');
              if (rawLocal) {
                localCustom = JSON.parse(rawLocal);
              }
            } catch (e) {}

            const idx = localCustom.findIndex(p => String(p.id) === String(this.editingPostId));
            if (idx !== -1) {
              localCustom[idx].title = title;
              localCustom[idx].category = category;
              localCustom[idx].images = [{ image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg' }];
              localCustom[idx].description = text;
              localStorage.setItem('spb_custom_posts', JSON.stringify(localCustom));
            }

            // Also update live lists
            const liveIdx = this.posts.findIndex(p => String(p.id) === String(this.editingPostId));
            if (liveIdx !== -1) {
              this.posts[liveIdx].title = title;
              this.posts[liveIdx].category = category;
              this.posts[liveIdx].images = [{ image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg' }];
              this.posts[liveIdx].description = text;
            }

            showToast('Изменения сохранены локально!', 'success', 2500);
          }

          this.editingPostId = null;
          pubOverlay.classList.remove('active');
          pubForm.reset();
          const imgInput = document.getElementById('post-image');
          if (imgInput) imgInput.value = 'NODEBOX/Hermitage/Hermitage.jpeg';
          await this.loadFeed();
          return;
        }

        // --- NEW POST CREATION MODE ---
        try {
          const response = await fetch('/api/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              category,
              image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg',
              content: text,
              author: this.currentUser ? this.currentUser.username : 'Администратор'
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const result = await response.json();
          if (result && result.success) {
            showToast('Указ успешно обнародован!', 'success', 2500);
            try { sfx.playNotification(); } catch (_) {}

            pubForm.reset();
            const imgInput = document.getElementById('post-image');
            if (imgInput) imgInput.value = 'NODEBOX/Hermitage/Hermitage.jpeg';

            pubOverlay.classList.remove('active');
            await this.loadFeed();
          } else {
            throw new Error(result.message || 'Ошибка сервера при сохранении');
          }
        } catch (postErr) {
          console.error('Publish error:', postErr);
          // Add post locally so admin can see it immediately and persist in localStorage
          const newPost = {
            id: `custom-${Date.now()}`,
            title,
            description: text,
            category,
            publication_date: Math.floor(Date.now() / 1000),
            images: [{ image: imgUrl || 'NODEBOX/Hermitage/Hermitage.jpeg' }],
            author: this.currentUser ? this.currentUser.username : 'Администратор'
          };

          let localCustom = [];
          try {
            const rawLocal = localStorage.getItem('spb_custom_posts');
            if (rawLocal) {
              localCustom = JSON.parse(rawLocal);
            }
          } catch (e) {}
          localCustom.unshift(newPost);
          localStorage.setItem('spb_custom_posts', JSON.stringify(localCustom));

          // Prepend to current render and update feed
          if (!this.posts.find(p => p.id === newPost.id)) {
            this.posts.unshift(newPost);
          }
          this.renderFeed();
          showToast('Указ опубликован локально и сохранён!', 'success', 3000);
          pubForm.reset();
          const imgInput = document.getElementById('post-image');
          if (imgInput) imgInput.value = 'NODEBOX/Hermitage/Hermitage.jpeg';
          pubOverlay.classList.remove('active');
        }
      });
    }
  }

  /**
   * Open publication modal inside dynamic Edit mode
   */
  openEditPostModal(postId) {
    try { sfx.playClick(); } catch (_) {}
    const post = this.posts.find(p => String(p.id) === String(postId));
    if (!post) {
      showToast('Пост для редактирования не найден!', 'error');
      return;
    }

    this.editingPostId = postId;

    const pubOverlay = document.getElementById('publish-overlay');
    const pubForm = document.getElementById('publish-post-form');
    const titleEl = document.getElementById('publish-dialog-title');
    const submitBtn = pubForm ? pubForm.querySelector('button[type="submit"]') : null;

    if (!pubOverlay || !pubForm) return;

    // Adjust title and label
    if (titleEl) titleEl.textContent = 'Редактировать указ / пост';
    if (submitBtn) submitBtn.textContent = 'Сохранить изменения';

    // Populate values
    const titleInp = document.getElementById('post-title');
    const catSel = document.getElementById('post-category');
    const imgInp = document.getElementById('post-image');
    const txtInp = document.getElementById('post-content');

    if (titleInp) titleInp.value = post.title || '';
    if (catSel) catSel.value = post.category || 'указ';
    if (imgInp) {
      let imageVal = 'NODEBOX/Hermitage/Hermitage.jpeg';
      if (post.images && post.images.length > 0 && post.images[0].image) {
        imageVal = post.images[0].image;
      }
      imgInp.value = imageVal;
    }
    if (txtInp) txtInp.value = post.description || '';

    // Hide post detail
    const detailEl = document.getElementById('post-detail-content');
    if (detailEl) detailEl.style.display = 'none';

    pubForm.style.display = 'block';
    pubOverlay.classList.add('active');
  }

  /**
   * Delete post completely on both server and client side fallback
   */
  async deletePost(postId) {
    try { sfx.playClick(); } catch (_) {}

    let isDeletedOnServer = false;
    try {
      const response = await fetch(`/api/feed/delete/${postId}`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.success) {
          isDeletedOnServer = true;
          showToast('Указ успешно удален со вчерашних скрижалей!', 'success', 2500);
        }
      }
    } catch (err) {
      console.warn('Server side post delete failed, deleting locally:', err);
    }

    // Always fallback: delete from local storage custom posts
    let localCustom = [];
    try {
      const rawLocal = localStorage.getItem('spb_custom_posts');
      if (rawLocal) {
        localCustom = JSON.parse(rawLocal);
      }
    } catch (e) {}

    const updatedLocal = localCustom.filter(p => String(p.id) !== String(postId));
    localStorage.setItem('spb_custom_posts', JSON.stringify(updatedLocal));

    if (!isDeletedOnServer) {
      showToast('Указ убран из летописей устройства!', 'success', 2500);
    }

    // Filter in-memory posts list & update feed
    this.posts = this.posts.filter(p => String(p.id) !== String(postId));
    try { sfx.playNotification(); } catch (_) {}

    this.renderFeed();
  }

  /* -------------------------------------------------------------------------- */
  /*  Settings Managers & Audio Synthesizer Integration                         */
  /* -------------------------------------------------------------------------- */

  initSettings() {
    initTheme();

    const scale = localStorage.getItem('spb_settings_font_scale') || 'normal';
    this.applyFontScale(scale);

    const hasAmbient = localStorage.getItem('spb_settings_ambient') === 'true';
    if (hasAmbient) {
      this.hookAudioSynthesisOnUserInteraction();
    }
  }

  hookAudioSynthesisOnUserInteraction() {
    const startAudio = () => {
      try { sfx.startAmbient(); } catch (_) {}
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
    };
    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
  }

  applyFontScale(scale) {
    document.documentElement.classList.remove('font-size-large', 'font-size-largest');
    if (scale === 'large') {
      document.documentElement.classList.add('font-size-large');
    } else if (scale === 'largest') {
      document.documentElement.classList.add('font-size-largest');
    }
  }

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
        try { sfx.playClick(); } catch (_) {}

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
        localStorage.setItem('spb_settings_sounds', soundSwitch.checked ? 'true' : 'false');
        if (soundSwitch.checked) {
          try { sfx.playNotification(); } catch (_) {}
        }
      });
    }

    if (ambientSwitch) {
      ambientSwitch.addEventListener('change', () => {
        updateSoundscapeRowVisibility();
        if (ambientSwitch.checked) {
          localStorage.setItem('spb_settings_ambient', 'true');
          if (soundscapeSelect) localStorage.setItem('spb_settings_soundscape', soundscapeSelect.value);
          try { sfx.startAmbient(); } catch (_) {}
        } else {
          localStorage.setItem('spb_settings_ambient', 'false');
          try { sfx.stopAmbient(); } catch (_) {}
        }
      });
    }

    if (soundscapeSelect) {
      soundscapeSelect.addEventListener('change', () => {
        if (ambientSwitch && ambientSwitch.checked) {
          localStorage.setItem('spb_settings_soundscape', soundscapeSelect.value);
          try { sfx.startAmbient(); } catch (_) {}
        }
      });
    }

    const closeModal = (e) => {
      if (e) e.preventDefault();
      try { sfx.playClick(); } catch (_) {}
      overlay.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { sfx.playClick(); } catch (_) {}

        const newName = nicknameInput ? nicknameInput.value.trim() : '';
        const newScale = fontScaleSelect ? fontScaleSelect.value : 'normal';
        const soundEnabled = soundSwitch ? soundSwitch.checked : true;
        const ambientEnabled = ambientSwitch ? ambientSwitch.checked : false;
        const soundscape = soundscapeSelect ? soundscapeSelect.value : 'neva';

        if (!newName) {
          showToast('Имя пользователя не может быть пустым', 'error');
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
            showToast('Имя пользователя уже используется', 'error');
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
          this.checkAdminPrivileges();
        }

        localStorage.setItem('spb_settings_font_scale', newScale);
        localStorage.setItem('spb_settings_sounds', soundEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_ambient', ambientEnabled ? 'true' : 'false');
        localStorage.setItem('spb_settings_soundscape', soundscape);

        this.applyFontScale(newScale);

        if (ambientEnabled) {
          try { sfx.startAmbient(); } catch (_) {}
        } else {
          try { sfx.stopAmbient(); } catch (_) {}
        }

        overlay.classList.remove('active');
        showToast('Настройки успешно изменены!', 'success', 2000);
        try { sfx.playNotification(); } catch (_) {}
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { sfx.playClick(); } catch (_) {}

        if (confirm('Вы уверены, что хотите сбросить весь прогресс и баллы? Имя аккаунта и настройки сохранятся.')) {
          resetAllProgress();
          showToast('Прогресс успешно сброшен', 'success', 2000);
          overlay.classList.remove('active');
        }
      });
    }
  }
}

// Instantiate on startup
document.addEventListener('DOMContentLoaded', () => {
  new FeedController();
});
