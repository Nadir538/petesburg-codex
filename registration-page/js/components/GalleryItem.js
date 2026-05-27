/**
 * Gallery Item Component
 * Компонент элемента галереи
 */

const GalleryItem = {
  /**
   * Рендер элемента галереи
   * @param {Object} item - Данные элемента
   * @returns {string} HTML строка
   */
  render(item) {
    const {
      id,
      src,
      title,
      description,
      alt = title
    } = item;

    return `
      <div 
        class="gallery-item" 
        data-id="${id}"
        role="listitem"
      >
        <img
          src="${this.escapeHtml(src)}"
          alt="${this.escapeHtml(alt)}"
          class="gallery-item-image"
          loading="lazy"
          decoding="async"
        />
        
        <div class="gallery-item-overlay">
          <h3 class="overlay-title">${this.escapeHtml(title)}</h3>
          <p class="overlay-description">${this.escapeHtml(description)}</p>
        </div>
      </div>
    `;
  },

  /**
   * Экранирование HTML
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

export default GalleryItem;