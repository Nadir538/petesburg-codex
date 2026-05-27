/**
 * Gallery Title Component
 * Компонент заголовка галереи
 */

const GalleryTitle = {
  /**
   * Рендер компонента
   * @param {Object} props - Свойства компонента
   * @param {string} props.title - Текст заголовка
   * @returns {string} HTML строка
   */
  render({ title }) {
    return `
      <h2 id="gallery-title" class="gallery-title">
        ${this.escapeHtml(title)}
      </h2>
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

export default GalleryTitle;