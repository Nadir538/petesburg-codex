/**
 * Episode Page - Story + Quiz Integration
 */

import { initTheme, toggleTheme } from './utils/theme.js';
import { QuizCard } from './components/QuizCard.js';
import { saveEpisodeProgress } from './utils/progress.js';
import { showToast } from './utils/animations.js';

class EpisodePage {
  constructor() {
    this.chapterId = null;
    this.episodeNum = null;      // число из URL: 1, 2, 3...
    this.episodeId = null;       // строка из JSON: "episode-1"
    this.storyData = null;
    this.currentEpisode = null;
    this.currentQuestionIndex = 0;
    this.showingStory = true;
    this.answeredQuestions = {};
    
    // Новые поля для интерактивных слайдов истории
    this.currentSlideIndex = 0;
    this.storySlides = [];
    
    this.init();
  }

  async init() {
    try {
      initTheme();
      this.extractParams();
      await this.loadStoryData();
      this.renderHeader();
      this.renderStory();
      this.setupEventListeners();
    } catch (error) {
      console.error('Init error:', error);
      showToast('Ошибка загрузки эпизода', 'error');
    }
  }

  // ─────────────────────────────────────
  // 1. ПАРАМЕТРЫ URL
  // ─────────────────────────────────────
  extractParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.chapterId = urlParams.get('chapter');

    // Из URL приходит число: ?episode=1
    this.episodeNum = parseInt(urlParams.get('episode'), 10);

    // Формируем строку-id как в JSON: "episode-1"
    this.episodeId = `episode-${this.episodeNum}`;

    console.log('Params:', {
      chapterId: this.chapterId,
      episodeNum: this.episodeNum,
      episodeId: this.episodeId
    });

    if (!this.chapterId || isNaN(this.episodeNum)) {
      showToast('Ошибка: неверные параметры URL', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      throw new Error('Invalid URL params');
    }
  }

  // ─────────────────────────────────────
  // 2. ЗАГРУЗКА ДАННЫХ
  // ─────────────────────────────────────
  async loadStoryData() {
    const url = `./js/config/${this.chapterId}-story.json`;
    console.log('Loading from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: не найден файл ${url}`);
    }

    this.storyData = await response.json();

    // ✅ Ищем по строке "episode-1", "episode-2" и т.д.
    this.currentEpisode = this.storyData.episodes.find(
      ep => ep.id === this.episodeId
    );

    console.log('Found episode:', this.currentEpisode);

    if (!this.currentEpisode) {
      throw new Error(
        `Эпизод "${this.episodeId}" не найден. ` +
        `Доступные: ${this.storyData.episodes.map(e => e.id).join(', ')}`
      );
    }

    // Разделяем историю на осмысленные интерактивные слайды с интересными фактами
    this.storySlides = this.buildStorySlides();
  }

  /**
   * Сборка слайдов истории с чередованием интересных фактов из вопросов
   */
  buildStorySlides() {
    const rawStory = this.currentEpisode.story || '';
    const paragraphs = this.splitStory(rawStory);
    
    // Специальная обработка для первого эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 1) {
      const titles = [
        "Сделка 1764 года",
        "Приют уединения",
        "Пополнение собрания",
        "Богатство библиотеки",
        "Открытие для публики",
        "Век двадцатый",
        "Коты — хранители",
        "Часы «Павлин»"
      ];
      const icons = [
        "📜",
        "🏛️",
        "🎨",
        "📚",
        "🎟️",
        "🏛️",
        "🐈",
        "🦚"
      ];
      return paragraphs.map((text, index) => {
        const isFactSlide = text.includes('Факт 1') || text.includes('Факт 2') || index >= 6;
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (isFactSlide ? '💡' : (this.currentEpisode.icon || '📜'));
        
        let cleanText = text;
        if (cleanText.startsWith("Факт 1. Коты — официальные хранители Эрмитажа")) {
          cleanText = cleanText.replace("Факт 1. Коты — официальные хранители Эрмитажа", "").trim();
        }
        if (cleanText.startsWith("Факт 2. Часы «Павлин» — уникальный автомат XVIII века")) {
          cleanText = cleanText.replace("Факт 2. Часы «Павлин» — уникальный автомат XVIII века", "").trim();
        }

        return {
          type: isFactSlide ? 'fact' : 'story',
          title: slideTitle,
          text: cleanText,
          image: `NODEBOX/Hermitage/Hermitage1-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Специальная обработка для второго эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 2) {
      const titles = [
        "Малый Эрмитаж (1764–1775)",
        "Зимний дворец (1754–1762)",
        "Большой (Старый) Эрмитаж (1771–1787)",
        "Эрмитажный театр (1783–1789)",
        "Новый Эрмитаж (1842–1851)",
        "Запасной дом Зимнего дворца",
        "Здание Главного штаба",
        "Дворец Меншикова",
        "Центр «Старая Деревня»"
      ];
      const icons = [
        "🏛️",
        "🏛️",
        "🏛️",
        "🎭",
        "🏛️",
        "🏠",
        "🏛️",
        "🏛️",
        "📦"
      ];
      return paragraphs.map((text, index) => {
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (this.currentEpisode.icon || "🏛️");
        
        return {
          type: 'story',
          title: slideTitle,
          text: text,
          image: `NODEBOX/Hermitage/Hermitage2-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Специальная обработка для третьего эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 3) {
      const titles = [
        "Открытие Нового Эрмитажа (1852)",
        "Доступ в музей до 1852 года",
        "Эрмитаж после революции (1917)",
        "Пополнение коллекций (1920‑е)",
        "Распродажи шедевров (1929–1934)",
        "Эвакуация коллекций (1941)",
        "Эрмитаж в блокадном Ленинграде",
        "Послевоенное восстановление",
        "Развитие в конце XX века"
      ];
      const icons = [
        "🎟️",
        "🔑",
        "🚩",
        "🖼️",
        "💔",
        "📦",
        "🛡️",
        "✨",
        "🌐"
      ];
      return paragraphs.map((text, index) => {
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (this.currentEpisode.icon || "🏛️");
        
        return {
          type: 'story',
          title: slideTitle,
          text: text,
          image: `NODEBOX/Hermitage/Hermitage3-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Специальная обработка для четвертого эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 4) {
      const titles = [
        "Живопись эпохи Возрождения",
        "Голландская живопись XVII века",
        "Фламандская школа",
        "Античное искусство",
        "Часы «Павлин»",
        "Прикладное искусство Европы",
        "Искусство Древней Руси и России",
        "Археологические находки",
        "Нумизматика и медали",
        "Искусство Востока"
      ];
      const icons = [
        "🎨",
        "🖼️",
        "🎨",
        "🏛️",
        "🦚",
        "🏺",
        "🇷🇺",
        "⛏️",
        "🪙",
        "⛩️"
      ];
      return paragraphs.map((text, index) => {
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (this.currentEpisode.icon || "🏛️");
        
        return {
          type: 'story',
          title: slideTitle,
          text: text,
          image: `NODEBOX/Hermitage/Hermitage4-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Специальная обработка для пятого эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 5) {
      const titles = [
        "Архитектурный комплекс сегодня",
        "Коллекции и экспонаты",
        "Технологические инновации",
        "Восточное крыло Главного штаба",
        "Реставрационно‑хранительский центр «Старая Деревня»",
        "Образовательные и молодёжные программы",
        "Международные проекты и сотрудничество",
        "Посещаемость и туризм"
      ];
      const icons = [
        "🏛️",
        "🖼️",
        "✨",
        "🏰",
        "📦",
        "🎓",
        "🤝",
        "📈"
      ];
      return paragraphs.map((text, index) => {
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (this.currentEpisode.icon || "🏛️");
        
        return {
          type: 'story',
          title: slideTitle,
          text: text,
          image: `NODEBOX/Hermitage/Hermitage5-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Специальная обработка для шестого эпизода Эрмитажа
    if (this.chapterId === 'hermitage' && this.episodeNum === 6) {
      const titles = [
        "Научные отделы и лаборатории",
        "Научная каталогизация",
        "Реставрационная работа",
        "Международные конференции",
        "Образовательные программы",
        "Цифровые инновации"
      ];
      const icons = [
        "🔬",
        "📂",
        "✨",
        "💬",
        "🎓",
        "💻"
      ];
      return paragraphs.map((text, index) => {
        const slideTitle = titles[index] || this.currentEpisode.title;
        const slideIcon = icons[index] || (this.currentEpisode.icon || "🏛️");
        
        return {
          type: 'story',
          title: slideTitle,
          text: text,
          image: `NODEBOX/Hermitage/Hermitage6-${index + 1}.jpeg`,
          icon: slideIcon
        };
      });
    }

    // Получаем интересные факты из вопросов текущего эпизода
    const funFacts = (this.currentEpisode.questions || [])
      .map(q => q.funFact)
      .filter(Boolean);

    const slides = [];
    
    let paragraphIndex = 0;
    let factIndex = 0;
    
    while (paragraphIndex < paragraphs.length || factIndex < funFacts.length) {
      if (paragraphIndex < paragraphs.length) {
        slides.push({
          type: 'story',
          title: this.currentEpisode.title,
          text: paragraphs[paragraphIndex],
          image: this.getStoryImage(this.chapterId, this.episodeNum, paragraphIndex, false),
          icon: this.currentEpisode.icon || '📜'
        });
        paragraphIndex++;
      }
      if (factIndex < funFacts.length) {
        slides.push({
          type: 'fact',
          title: 'Интересный факт',
          text: funFacts[factIndex],
          image: this.getStoryImage(this.chapterId, this.episodeNum, factIndex, true),
          icon: '💡'
        });
        factIndex++;
      }
    }
    
    // Если слайдов вообще нет, добавляем дефолтный
    if (slides.length === 0) {
      slides.push({
        type: 'story',
        title: this.currentEpisode.title,
        text: rawStory,
        image: this.getStoryImage(this.chapterId, this.episodeNum, 0, false),
        icon: this.currentEpisode.icon || '📜'
      });
    }
    
    return slides;
  }

  /**
   * Разделение длинной истории на слайды/параграфы
   */
  splitStory(text) {
    if (!text) return [""];
    const cleaned = text.replace(/\r/g, '');
    let paragraphs = cleaned.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    
    if (paragraphs.length <= 1) {
      // Умное разбиение по предложениям для неструктурированного текста
      const sentences = cleaned.match(/[^.!?]+[.!?]+(\s+|$)/g) || [cleaned];
      paragraphs = [];
      let currentSlide = [];
      
      for (let i = 0; i < sentences.length; i++) {
        currentSlide.push(sentences[i].trim());
        // Группируем по слайдам объемом до 230 символов или каждые 2-3 предложения
        if (currentSlide.join(' ').length >= 220 || currentSlide.length >= 2 || i === sentences.length - 1) {
          paragraphs.push(currentSlide.join(' '));
          currentSlide = [];
        }
      }
    }
    return paragraphs;
  }

  /**
   * Получение чередующихся релевантных иллюстраций для слайда
   */
  getStoryImage(chapterId, episodeNum, slideIndex, isFact = false) {
    if (chapterId === 'hermitage') {
      if (episodeNum === 1) {
        if (!isFact) {
          // Для сюжетных слайдов первого эпизода используем Hermitage1-1.jpeg до Hermitage1-8.jpeg
          const partNum = (slideIndex % 8) + 1;
          return `NODEBOX/Hermitage/Hermitage1-${partNum}.jpeg`;
        } else {
          // Для фактов первого эпизода используем общее изображение Hermitage1.jpeg
          return `NODEBOX/Hermitage/Hermitage1.jpeg`;
        }
      }

      if (episodeNum === 2) {
        const partNum = (slideIndex % 9) + 1;
        return `NODEBOX/Hermitage/Hermitage2-${partNum}.jpeg`;
      }

      if (episodeNum === 3) {
        const partNum = (slideIndex % 9) + 1;
        return `NODEBOX/Hermitage/Hermitage3-${partNum}.jpeg`;
      }

      if (episodeNum === 4) {
        const partNum = (slideIndex % 10) + 1;
        return `NODEBOX/Hermitage/Hermitage4-${partNum}.jpeg`;
      }

      if (episodeNum === 5) {
        const partNum = (slideIndex % 8) + 1;
        return `NODEBOX/Hermitage/Hermitage5-${partNum}.jpeg`;
      }

      if (episodeNum === 6) {
        const partNum = (slideIndex % 6) + 1;
        return `NODEBOX/Hermitage/Hermitage6-${partNum}.jpeg`;
      }
      
      const images = [
        "NODEBOX/Hermitage/Hermitage.jpeg",
        "NODEBOX/Hermitage/Hermitage1.jpeg",
        "NODEBOX/dvorocovaya.jpeg",
        "NODEBOX/1.jpeg",
        "NODEBOX/petropavlovskiy.jpeg"
      ];
      return images[slideIndex % images.length];
    }

    if (chapterId === 'isaac-cathedral') {
      const images = [
        "NODEBOX/isaakievskiy/isaakievskiy.jpeg",
        "NODEBOX/isaakievskiy/isaakievskiy1.jpeg",
        "NODEBOX/petropavlovskiy.jpeg",
        "NODEBOX/1.jpeg",
        "NODEBOX/dvorocovaya.jpeg"
      ];
      return images[slideIndex % images.length];
    }

    if (chapterId === 'savior-on-blood') {
      const images = [
        "NODEBOX/Church/Church.jpeg",
        "NODEBOX/Church/Church1.jpeg",
        "NODEBOX/kanal.jpeg",
        "NODEBOX/petropavlovskiy.jpeg",
        "NODEBOX/1.jpeg"
      ];
      return images[slideIndex % images.length];
    }

    if (chapterId === 'peterhof') {
      const images = [
        "NODEBOX/Peterhof/Peterhof.jpeg",
        "NODEBOX/Peterhof/Peterhof1.jpeg",
        "NODEBOX/kanal.jpeg",
        "NODEBOX/petropavlovskiy.jpeg",
        "NODEBOX/dvorocovaya.jpeg"
      ];
      return images[slideIndex % images.length];
    }

    return "NODEBOX/1.jpeg";
  }

  // ─────────────────────────────────────
  // 3. РЕНДЕР ХЕДЕРА
  // ─────────────────────────────────────
  renderHeader() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? '';
    };

    set('chapter-title', this.storyData.title);
    set('episode-title', this.currentEpisode.title);
    set('episode-progress',
      `Эпизод ${this.currentEpisode.number} из ${this.storyData.totalEpisodes}`
    );

    // Заголовок вкладки
    document.title =
      `${this.currentEpisode.title} | Петербургский кодекс`;
  }

  // ─────────────────────────────────────
  // 4. РЕНДЕР ИСТОРИИ
  // ─────────────────────────────────────
  renderStory() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? '—';
    };

    const slide = this.storySlides[this.currentSlideIndex];
    if (!slide) return;

    set('story-icon',        slide.icon || '📜');
    set('story-title',       slide.title);
    set('story-character',   this.currentEpisode.character  || '—');
    set('story-period',      this.currentEpisode.timeperiod || '—');
    set('story-atmosphere',  this.currentEpisode.atmosphere || '—');

    // Переключение стиля "Интересный факт"
    const card = document.querySelector('.story-card');
    if (card) {
      if (slide.type === 'fact') {
        card.classList.add('is-fact');
      } else {
        card.classList.remove('is-fact');
      }
    }

    // Текст слайда с мягкой анимацией перехода
    const currentText = slide.text;
    const txtEl = document.getElementById('story-text');
    if (txtEl) {
      txtEl.classList.remove('slide-transition-in');
      txtEl.classList.add('slide-transition-out');
      setTimeout(() => {
        txtEl.textContent = currentText;
        txtEl.classList.remove('slide-transition-out');
        txtEl.classList.add('slide-transition-in');
      }, 150);
    }

    // Изображение слайда с мягкой анимацией перехода
    const imgStr = slide.image;
    const img = document.getElementById('story-image');
    if (img) {
      if (imgStr) {
        img.classList.remove('slide-transition-in');
        img.classList.add('slide-transition-out');
        setTimeout(() => {
          img.onerror = () => {
            img.onerror = null;
            const fallbacks = {
              'hermitage': [
                'https://images.unsplash.com/photo-1597047084897-51e81819a4a7?q=80&w=1200',
                'https://images.unsplash.com/photo-1590075865003-e48277afd558?q=80&w=1200',
                'https://images.unsplash.com/photo-1572985011746-88d4fe0c609c?q=80&w=1200',
                'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1200',
                'https://images.unsplash.com/photo-1518998059901-55dde8a4c730?q=80&w=1200',
                'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=1200',
                'https://images.unsplash.com/photo-1555465910-c4083d1c47ea?q=80&w=1200',
                'https://images.unsplash.com/photo-1582235942541-15b53d1000b2?q=80&w=1200'
              ],
              'isaac-cathedral': [
                'https://images.unsplash.com/photo-1555465910-31f7f20a184d?q=80&w=1200'
              ],
              'savior-on-blood': [
                'https://images.unsplash.com/photo-1555465910-c4083d1c47ea?q=80&w=1200'
              ],
              'peterhof': [
                'https://images.unsplash.com/photo-1582235942541-15b53d1000b2?q=80&w=1200'
              ]
            };
            const list = fallbacks[this.chapterId] || ['https://images.unsplash.com/photo-1597047084897-51e81819a4a7?q=80&w=1200'];
            img.src = list[this.currentSlideIndex % list.length];
          };
          img.src = imgStr;
          img.alt = `${slide.title} | Страница ${this.currentSlideIndex + 1}`;
          img.style.display = '';
          img.classList.remove('slide-transition-out');
          img.classList.add('slide-transition-in');
        }, 150);
      } else {
        img.style.display = 'none';
      }
    }

    // Пагинационные точки
    this.renderStoryDots();

    // Обновление состояния кнопок навигации
    this.updateStoryNavigation();
  }

  renderStoryDots() {
    const dotsContainer = document.getElementById('story-dots');
    if (!dotsContainer) return;

    let dotsHtml = '';
    for (let i = 0; i < this.storySlides.length; i++) {
      const activeClass = i === this.currentSlideIndex ? 'active' : '';
      dotsHtml += `<span class="story-dot ${activeClass}" data-slide-index="${i}"></span>`;
    }
    dotsContainer.innerHTML = dotsHtml;

    // Вешаем клик по точкам для быстрой навигации
    dotsContainer.querySelectorAll('.story-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.currentSlideIndex = parseInt(dot.dataset.slideIndex, 10);
        this.renderStory();
      });
    });
  }

  updateStoryNavigation() {
    const prevBtn = document.getElementById('story-prev-btn');
    const nextBtn = document.getElementById('story-next-btn');

    if (prevBtn) {
      prevBtn.style.display = this.currentSlideIndex === 0 ? 'none' : 'block';
    }

    if (nextBtn) {
      const isLast = this.currentSlideIndex === this.storySlides.length - 1;
      nextBtn.innerHTML = isLast ? 'Начать вопросы <span class="nav-arrow">➔</span>' : 'Далее <span class="nav-arrow">→</span>';
      
      if (isLast) {
        nextBtn.classList.add('pulse-gold');
      } else {
        nextBtn.classList.remove('pulse-gold');
      }
    }
  }

  prevStorySlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this.renderStory();
    }
  }

  nextStorySlide() {
    const isLast = this.currentSlideIndex === this.storySlides.length - 1;
    if (isLast) {
      this.showQuestions();
    } else {
      this.currentSlideIndex++;
      this.renderStory();
    }
  }

  // ─────────────────────────────────────
  // 5. СОБЫТИЯ
  // ─────────────────────────────────────
  setupEventListeners() {
    document.getElementById('back-btn')
      ?.addEventListener('click', () => {
        window.location.href =
          `chapter-path.html?chapter=${this.chapterId}`;
      });

    document.getElementById('theme-toggle')
      ?.addEventListener('click', () => toggleTheme());

    document.getElementById('story-prev-btn')
      ?.addEventListener('click', () => this.prevStorySlide());

    document.getElementById('story-next-btn')
      ?.addEventListener('click', () => this.nextStorySlide());

    document.getElementById('start-questions-btn')
      ?.addEventListener('click', () => this.showQuestions());

    document.getElementById('prev-question-btn')
      ?.addEventListener('click', () => this.prevQuestion());

    document.getElementById('next-question-btn')
      ?.addEventListener('click', () => this.goNextQuestion());
  }

  // ─────────────────────────────────────
  // 6. ПОКАЗ ВОПРОСОВ
  // ─────────────────────────────────────
  showQuestions() {
    this.showingStory = false;

    // Оставляем блок истории сверху для параллельного чтения
    document.getElementById('story-section').style.display    = 'block';
    document.body.classList.add('questions-active');

    document.getElementById('questions-section').style.display = 'block';
    document.getElementById('episode-nav').style.display      = 'none';

    this.renderQuestion();

    // Плавно скроллим к разделу с вопросами
    setTimeout(() => {
      const qSection = document.getElementById('questions-section');
      if (qSection) {
        qSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  renderQuestion() {
    const questions = this.currentEpisode.questions;
    const question  = questions[this.currentQuestionIndex];
    const container = document.getElementById('quiz-container');

    if (!question || !container) return;

    const answered = this.answeredQuestions[this.currentQuestionIndex];
    container.innerHTML = QuizCard.render(question, answered);

    this.updateQuestionNav();
  }

  updateQuestionNav() {
    const total   = this.currentEpisode.questions.length;
    const isFirst = this.currentQuestionIndex === 0;
    const isLast  = this.currentQuestionIndex === total - 1;
    const answered = !!this.answeredQuestions[this.currentQuestionIndex];

    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');

    if (prevBtn) prevBtn.disabled = isFirst;

    if (nextBtn) {
      // Кнопка "Далее" активна только после ответа
      nextBtn.disabled = !answered;

      nextBtn.textContent = isLast
        ? 'Завершить эпизод'
        : 'Далее →';
    }
  }

  goNextQuestion() {
    const total  = this.currentEpisode.questions.length;
    const isLast = this.currentQuestionIndex === total - 1;

    if (isLast) {
      this.finishEpisode();
    } else {
      this.currentQuestionIndex++;
      this.renderQuestion();
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderQuestion();
    }
  }

  // ─────────────────────────────────────
  // 7. ОТВЕТ НА ВОПРОС
  // ─────────────────────────────────────
  handleAnswer(answerId) {
    // Повторный клик — игнорируем
    if (this.answeredQuestions[this.currentQuestionIndex]) return;

    const question  = this.currentEpisode.questions[this.currentQuestionIndex];
    const isCorrect = answerId === question.correctAnswer;

    // Сохраняем ответ
    this.answeredQuestions[this.currentQuestionIndex] = {
      answerId,
      isCorrect
    };

    // Моментально обновляем интерфейс для показа цветов ответа и блока объяснения с интересным фактом
    this.renderQuestion();

    // Toast
    showToast(
      isCorrect ? '✅ Правильно!' : `❌ Решение квиза`,
      isCorrect ? 'success' : 'error',
      2500
    );

    // Разблокируем "Далее"
    setTimeout(() => this.updateQuestionNav(), 300);
  }

  highlightAnswers(selectedId, correctId) {
    document.querySelectorAll('.quiz-answer-btn').forEach(btn => {
      const btnId = btn.dataset.answerId;

      if (btnId === correctId) {
        btn.classList.add('correct');          // зелёный
      } else if (btnId === selectedId) {
        btn.classList.add('incorrect');        // красный
      } else {
        btn.classList.add('muted');
      }

      btn.disabled = true;
    });
  }

  // ─────────────────────────────────────
  // 8. ЗАВЕРШЕНИЕ ЭПИЗОДА
  // ─────────────────────────────────────
  finishEpisode() {
    const questions     = this.currentEpisode.questions;
    const correctCount  = Object.values(this.answeredQuestions)
                            .filter(a => a.isCorrect).length;
    const totalQuestions = questions.length;
    const maxScore      = questions.reduce((s, q) => s + (q.points || 10), 0);
    const earnedScore   = Math.round((correctCount / totalQuestions) * maxScore);

    // Сохраняем прогресс (передаём число!)
    saveEpisodeProgress(this.chapterId, this.episodeNum, earnedScore);

    showToast(
      `🏆 Эпизод завершён! ${correctCount}/${totalQuestions} верных. +${earnedScore} баллов`,
      'success',
      3000
    );

    setTimeout(() => {
      const nextNum     = this.episodeNum + 1;
      const hasNext     = nextNum <= this.storyData.totalEpisodes;

      if (hasNext) {
        window.location.href =
          `episode.html?chapter=${this.chapterId}&episode=${nextNum}`;
      } else {
        window.location.href =
          `chapter-path.html?chapter=${this.chapterId}`;
      }
    }, 2500);
  }
}

// ─────────────────────────────────────
// EVENT DELEGATION — клики по ответам
// ─────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.quiz-answer-btn');
  if (!btn) return;

  const ep = window.episodePageInstance;
  if (ep && !ep.showingStory) {
    ep.handleAnswer(btn.dataset.answerId);
  }
});

// ─────────────────────────────────────
// СТАРТ
// ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.episodePageInstance = new EpisodePage();
}); 