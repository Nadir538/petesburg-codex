/**
 * Submit Button Component
 * Компонент кнопки отправки формы
 */

const SubmitButton = {
  /**
   * Рендер компонента
   * @param {Object} props - Свойства кнопки
   * @param {string} props.text - Текст кнопки
   * @param {string} props.type - Тип кнопки
   * @param {string} props.variant - Вариант стиля (primary, secondary)
   * @returns {string} HTML строка
   */
  render({ 
    text, 
    type = 'submit', 
    variant = 'primary' 
  }) {
    return `
      <button
        type="${type}"
        class="btn btn-${variant} btn-block"
        aria-label="${this.escapeHtml(text)}"
      >
        <span class="btn-text">${this.escapeHtml(text)}</span>
      </button>
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

export default SubmitButton;