/**
 * Input Field Component
 * Компонент поля ввода с иконкой и валидацией
 */

const InputField = {
  /**
   * Рендер компонента
   * @param {Object} props - Свойства поля
   * @returns {string} HTML строка
   */
  render(props) {
    const {
      name,
      type = 'text',
      label,
      placeholder = '',
      icon,
      required = false,
      autocomplete = 'off',
      pattern = '',
      minLength = 0,
      maxLength = 524288
    } = props;

    const hasPasswordToggle = type === 'password';
    const inputId = `input-${name}`;

    return `
      <div class="input-group">
        ${label ? `
          <label for="${inputId}" class="input-label">
            ${this.escapeHtml(label)}
            ${required ? '<span class="required-mark" aria-label="обязательное поле">*</span>' : ''}
          </label>
        ` : ''}
        
        <div class="input-wrapper ${hasPasswordToggle ? 'has-toggle' : ''}">
          ${icon ? this.renderIcon(icon) : ''}
          
          <input
            type="${type}"
            id="${inputId}"
            name="${name}"
            class="input-field"
            placeholder="${this.escapeHtml(placeholder)}"
            autocomplete="${autocomplete}"
            ${required ? 'required' : ''}
            ${pattern ? `pattern="${pattern}"` : ''}
            ${minLength ? `minlength="${minLength}"` : ''}
            ${maxLength ? `maxlength="${maxLength}"` : ''}
            aria-label="${this.escapeHtml(label || placeholder)}"
            ${required ? 'aria-required="true"' : ''}
          />
          
          ${hasPasswordToggle ? this.renderPasswordToggle() : ''}
        </div>
      </div>
    `;
  },

  /**
   * Рендер иконки
   * @param {string} iconName - Название иконки
   * @returns {string} HTML иконки
   */
  renderIcon(iconName) {
    return `
      <div class="input-icon" aria-hidden="true">
        <svg>
          <use href="#icon-${iconName}"></use>
        </svg>
      </div>
    `;
  },

  /**
   * Рендер кнопки переключения видимости пароля
   * @returns {string} HTML кнопки
   */
  renderPasswordToggle() {
    return `
      <button
        type="button"
        class="password-toggle"
        aria-label="Показать пароль"
        tabindex="-1"
      >
        <svg>
          <use href="#icon-eye"></use>
        </svg>
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

export default InputField;