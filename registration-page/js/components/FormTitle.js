/**
 * Form Title Component
 * Компонент заголовка формы
 */

const FormTitle = {
  /**
   * Рендер компонента
   * @param {Object} props - Свойства компонента
   * @param {string} props.title - Основной заголовок
   * @param {string} props.subtitle - Подзаголовок (опционально)
   * @returns {string} HTML строка
   */
  render({ title, subtitle = '' }) {
    return `
      <div class="form-title-wrapper">
        <h1 class="form-title">${this.escapeHtml(title)}</h1>
        ${subtitle ? `<p class="form-title-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
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

export default FormTitle;