/**
 * Story Card Component
 * Компонент отображения истории эпизода
 */

export const StoryCard = {
    /**
     * Рендер карточки истории
     * @param {Object} episode - Данные эпизода
     * @returns {string} HTML строка
     */
    render(episode) {
      return `
        <div class="story-card" data-atmosphere="${episode.atmosphere || 'default'}">
          ${this.renderIcon(episode.icon)}
          ${this.renderTitle(episode.title, episode.subtitle)}
          ${this.renderStory(episode.story)}
          ${this.renderImage(episode.storyImage, episode.title)}
          ${this.renderMetadata(episode)}
        </div>
      `;
    },
  
    /**
     * Рендер иконки эпизода
     * @param {string} icon - Emoji иконка
     * @returns {string} HTML
     */
    renderIcon(icon) {
      if (!icon) return '';
      
      return `
        <div class="story-icon" role="img" aria-label="Иконка эпизода">
          ${this.escapeHtml(icon)}
        </div>
      `;
    },
  
    /**
     * Рендер заголовка
     * @param {string} title - Заголовок
     * @param {string} subtitle - Подзаголовок
     * @returns {string} HTML
     */
    renderTitle(title, subtitle) {
      return `
        <div class="story-header">
          <h3 class="story-title">${this.escapeHtml(title)}</h3>
          ${subtitle ? `<p class="story-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
        </div>
      `;
    },
  
    /**
     * Рендер текста истории
     * @param {string} story - Текст истории
     * @returns {string} HTML
     */
    renderStory(story) {
      if (!story) return '';
      
      // Разбиваем текст на параграфы по \n\n
      const paragraphs = story.split('\n\n').filter(p => p.trim());
      
      return `
        <div class="story-content">
          ${paragraphs.map(paragraph => `
            <p class="story-text">${this.escapeHtml(paragraph)}</p>
          `).join('')}
        </div>
      `;
    },
  
    /**
     * Рендер изображения
     * @param {string} imageSrc - Путь к изображению
     * @param {string} alt - Альтернативный текст
     * @returns {string} HTML
     */
    renderImage(imageSrc, alt) {
      if (!imageSrc) return '';
      
      return `
        <div class="story-image-container">
          <img 
            src="${this.escapeHtml(imageSrc)}" 
            alt="${this.escapeHtml(alt)}" 
            class="story-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      `;
    },
  
    /**
     * Рендер метаданных
     * @param {Object} episode - Данные эпизода
     * @returns {string} HTML
     */
    renderMetadata(episode) {
      const metadata = [];
      
      if (episode.character) {
        metadata.push({
          label: 'Персонаж',
          value: episode.character,
          icon: '👤'
        });
      }
      
      if (episode.timeperiod) {
        metadata.push({
          label: 'Период',
          value: episode.timeperiod,
          icon: '📅'
        });
      }
      
      if (episode.atmosphere) {
        metadata.push({
          label: 'Атмосфера',
          value: this.translateAtmosphere(episode.atmosphere),
          icon: '🎭'
        });
      }
      
      if (metadata.length === 0) return '';
      
      return `
        <div class="story-meta">
          ${metadata.map(item => `
            <div class="meta-item">
              <span class="meta-icon" role="img" aria-label="${item.label}">${item.icon}</span>
              <div class="meta-content">
                <span class="meta-label">${this.escapeHtml(item.label)}:</span>
                <span class="meta-value">${this.escapeHtml(item.value)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },
  
    /**
     * Перевод атмосферы на русский
     * @param {string} atmosphere - Атмосфера на английском
     * @returns {string} Перевод
     */
    translateAtmosphere(atmosphere) {
      const translations = {
        'mysterious': 'Таинственная',
        'luxurious': 'Роскошная',
        'majestic': 'Величественная',
        'dramatic': 'Драматичная',
        'enigmatic': 'Загадочная',
        'triumphant': 'Триумфальная',
        'inspiring': 'Вдохновляющая',
        'solemn': 'Торжественная',
        'tragic': 'Трагичная',
        'colorful': 'Красочная',
        'artistic': 'Художественная',
        'resilient': 'Стойкая',
        'ambitious': 'Амбициозная',
        'magnificent': 'Великолепная',
        'mythical': 'Мифическая',
        'default': 'Познавательная'
      };
      
      return translations[atmosphere] || translations['default'];
    },
  
    /**
     * Экранирование HTML
     * @param {string} text - Текст для экранирования
     * @returns {string} Экранированный текст
     */
    escapeHtml(text) {
      if (!text) return '';
      
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
  
    /**
     * Рендер карточки с кастомными стилями атмосферы
     * @param {Object} episode - Данные эпизода
     * @param {Object} customStyles - Дополнительные стили
     * @returns {string} HTML строка
     */
    renderWithStyles(episode, customStyles = {}) {
      const atmosphereClass = `atmosphere-${episode.atmosphere || 'default'}`;
      const customStylesString = Object.entries(customStyles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      
      return `
        <div 
          class="story-card ${atmosphereClass}" 
          ${customStylesString ? `style="${customStylesString}"` : ''}
          data-atmosphere="${episode.atmosphere || 'default'}"
        >
          ${this.renderIcon(episode.icon)}
          ${this.renderTitle(episode.title, episode.subtitle)}
          ${this.renderStory(episode.story)}
          ${this.renderImage(episode.storyImage, episode.title)}
          ${this.renderMetadata(episode)}
        </div>
      `;
    },
  
    /**
     * Рендер минималистичной версии карточки
     * @param {Object} episode - Данные эпизода
     * @returns {string} HTML строка
     */
    renderCompact(episode) {
      return `
        <div class="story-card story-card-compact">
          ${this.renderIcon(episode.icon)}
          <h4 class="story-title-compact">${this.escapeHtml(episode.title)}</h4>
          <p class="story-text-compact">${this.escapeHtml(episode.story.substring(0, 200))}...</p>
        </div>
      `;
    }
  };
  
  export default StoryCard;