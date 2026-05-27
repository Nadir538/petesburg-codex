/**
 * Animation Utilities
 * Утилиты для анимаций и UI эффектов
 */

/**
 * Show toast notification
 * @param {string} message - Сообщение
 * @param {string} type - Тип уведомления (success, error, info, warning)
 * @param {number} duration - Длительность показа (мс)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }

  const toast = createToastElement(message, type);
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast-enter');
  });

  // Remove after duration
  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

/**
 * Create toast element
 * @param {string} message - Сообщение
 * @param {string} type - Тип
 * @returns {HTMLElement} Toast элемент
 */
function createToastElement(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const icon = getToastIcon(type);
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Закрыть">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 7.293l3.646-3.647a.5.5 0 01.708.708L8.707 8l3.647 3.646a.5.5 0 01-.708.708L8 8.707l-3.646 3.647a.5.5 0 01-.708-.708L7.293 8 3.646 4.354a.5.5 0 01.708-.708L8 7.293z"/>
      </svg>
    </button>
  `;

  // Close button handler
  const closeButton = toast.querySelector('.toast-close');
  closeButton.addEventListener('click', () => removeToast(toast));

  // Apply styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    minWidth: '300px',
    maxWidth: '500px',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: '9999',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  });

  applyToastTypeStyles(toast, type);

  return toast;
}

/**
 * Apply type-specific styles
 * @param {HTMLElement} toast - Toast элемент
 * @param {string} type - Тип
 */
function applyToastTypeStyles(toast, type) {
  const styles = {
    success: {
      background: 'rgba(34, 197, 94, 0.15)',
      color: '#86efac',
      borderColor: 'rgba(34, 197, 94, 0.3)'
    },
    error: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#fca5a5',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fcd34d',
      borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    info: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#93c5fd',
      borderColor: 'rgba(59, 130, 246, 0.3)'
    }
  };

  Object.assign(toast.style, styles[type] || styles.info);
}

/**
 * Get toast icon
 * @param {string} type - Тип
 * @returns {string} HTML иконки
 */
function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return icons[type] || icons.info;
}

/**
 * Remove toast
 * @param {HTMLElement} toast - Toast элемент
 */
function removeToast(toast) {
  toast.classList.add('toast-exit');
  
  setTimeout(() => {
    toast.remove();
  }, 400);
}

/**
 * Animate element entrance
 * @param {HTMLElement} element - Элемент
 * @param {string} animation - Тип анимации
 */
export function animateIn(element, animation = 'fadeInUp') {
  element.style.animation = `${animation} 0.6s ease`;
  element.style.animationFillMode = 'both';
}

/**
 * Animate element exit
 * @param {HTMLElement} element - Элемент
 * @param {string} animation - Тип анимации
 * @returns {Promise} Promise, разрешающийся после завершения анимации
 */
export function animateOut(element, animation = 'fadeOut') {
  return new Promise(resolve => {
    element.style.animation = `${animation} 0.4s ease`;
    
    setTimeout(() => {
      resolve();
    }, 400);
  });
}

/**
 * Smooth scroll to element
 * @param {string|HTMLElement} target - Селектор или элемент
 * @param {number} offset - Смещение (px)
 */
export function smoothScrollTo(target, offset = 0) {
  const element = typeof target === 'string' 
    ? document.querySelector(target)
    : target;

  if (!element) return;

  const top = element.getBoundingClientRect().top + window.pageYOffset - offset;

  window.scrollTo({
    top,
    behavior: 'smooth'
  });
}

/**
 * Debounce function
 * @param {Function} func - Функция
 * @param {number} wait - Задержка (мс)
 * @returns {Function} Debounced функция
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Функция
 * @param {number} limit - Лимит (мс)
 * @returns {Function} Throttled функция
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Escape HTML
 * @param {string} text - Текст
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Элемент
 * @returns {boolean} В видимой области или нет
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Lazy load images
 * @param {string} selector - Селектор изображений
 */
export function lazyLoadImages(selector = '[loading="lazy"]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });
  }
}