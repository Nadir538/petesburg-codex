import { showToast } from './utils/animations.js';

class LandingPage {
  constructor() {
    this.features = [
      {
        icon: 'icon-check-circle',
        title: 'Эксклюзивные маршруты',
        description:
          'Откройте скрытые жемчужины Санкт-Петербурга с тщательно подобранными маршрутами.'
      },
      {
        icon: 'icon-star',
        title: 'Премиум опыт',
        description:
          'Получите доступ к лучшим местам, рекомендациям и культурным событиям города.'
      },
      {
        icon: 'icon-shield',
        title: 'Безопасность и комфорт',
        description:
          'Ваши данные защищены, а путешествие будет максимально удобным и вдохновляющим.'
      }
    ];

    this.init();
  }

  init() {
    this.renderFeatures();
    this.setupNavbarScroll();
    this.setupSmoothAnimations();
    this.attachEvents();
  }

  /**
   * Рендер feature cards
   */
  renderFeatures() {
    const container = document.getElementById('features-container');

    if (!container) return;

    container.innerHTML = this.features
      .map(
        feature => `
        <article class="feature-card">
          <div class="feature-icon">
            <svg>
              <use href="#${feature.icon}"></use>
            </svg>
          </div>

          <h3 class="feature-title">
            ${feature.title}
          </h3>

          <p class="feature-description">
            ${feature.description}
          </p>
        </article>
      `
      )
      .join('');
  }

  /**
   * Navbar blur on scroll
   */
  setupNavbarScroll() {
    const nav = document.querySelector('.landing-nav');

    if (!nav) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  /**
   * Smooth reveal animations
   */
  setupSmoothAnimations() {
    const animatedElements = document.querySelectorAll(
      '.feature-card, .hero-content'
    );

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.2
      }
    );

    animatedElements.forEach(el => observer.observe(el));
  }

  /**
   * Events
   */
  attachEvents() {
    const registerButtons = document.querySelectorAll(
      'a[href="register.html"]'
    );

    registerButtons.forEach(button => {
      button.addEventListener('click', () => {
        showToast('Переход к регистрации...', 'info', 1500);
      });
    });

    const loginButtons = document.querySelectorAll(
      'a[href="login.html"]'
    );

    loginButtons.forEach(button => {
      button.addEventListener('click', () => {
        showToast('Переход ко входу...', 'info', 1500);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LandingPage();
});