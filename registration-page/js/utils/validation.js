/**
 * Validation Utilities
 * Утилиты для валидации формы
 */

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation rules
 */
const VALIDATION_RULES = {
  required: (value) => {
    return value && value.trim().length > 0;
  },

  email: (value) => {
    return EMAIL_REGEX.test(value);
  },

  minLength: (value, length) => {
    return value.length >= length;
  },

  maxLength: (value, length) => {
    return value.length <= length;
  },

  pattern: (value, pattern) => {
    const regex = new RegExp(pattern);
    return regex.test(value);
  },

  name: (value) => {
    // At least 2 characters, only letters and spaces
    return /^[a-zA-Zа-яА-ЯёЁ\s]{2,}$/.test(value);
  },

  password: (value) => {
    // At least 8 characters, at least one letter and one number
    return value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value);
  }
};

/**
 * Error messages
 */
const ERROR_MESSAGES = {
  required: 'Это поле обязательно для заполнения',
  email: 'Введите корректный email адрес',
  minLength: (length) => `Минимальная длина: ${length} символов`,
  maxLength: (length) => `Максимальная длина: ${length} символов`,
  pattern: 'Неверный формат данных',
  name: 'Имя должно содержать только буквы (минимум 2 символа)',
  password: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры'
};

/**
 * Validate single field
 * @param {string} value - Значение поля
 * @param {Object} config - Конфигурация поля
 * @returns {string|null} Сообщение об ошибке или null
 */
export function validateField(value, config) {
  const { validation = {}, label } = config;

  // Required check
  if (validation.required && !VALIDATION_RULES.required(value)) {
    return ERROR_MESSAGES.required;
  }

  // Skip other validations if field is empty and not required
  if (!value && !validation.required) {
    return null;
  }

  // Email validation
  if (validation.email && !VALIDATION_RULES.email(value)) {
    return ERROR_MESSAGES.email;
  }

  // Name validation
  if (validation.name && !VALIDATION_RULES.name(value)) {
    return ERROR_MESSAGES.name;
  }

  // Password validation
  if (validation.password && !VALIDATION_RULES.password(value)) {
    return ERROR_MESSAGES.password;
  }

  // Min length validation
  if (validation.minLength && !VALIDATION_RULES.minLength(value, validation.minLength)) {
    return ERROR_MESSAGES.minLength(validation.minLength);
  }

  // Max length validation
  if (validation.maxLength && !VALIDATION_RULES.maxLength(value, validation.maxLength)) {
    return ERROR_MESSAGES.maxLength(validation.maxLength);
  }

  // Pattern validation
  if (validation.pattern && !VALIDATION_RULES.pattern(value, validation.pattern)) {
    return validation.patternMessage || ERROR_MESSAGES.pattern;
  }

  return null;
}

/**
 * Validate entire form
 * @param {Object} data - Данные формы
 * @param {Array} fields - Конфигурация полей
 * @returns {Object} Результат валидации
 */
export function validateForm(data, fields) {
  const errors = {};
  let isValid = true;

  fields.forEach(fieldConfig => {
    const { name } = fieldConfig;
    const value = data[name] || '';
    const error = validateField(value, fieldConfig);

    if (error) {
      errors[name] = error;
      isValid = false;
    }
  });

  return {
    isValid,
    errors
  };
}

/**
 * Get password strength
 * @param {string} password - Пароль
 * @returns {Object} Оценка силы пароля
 */
export function getPasswordStrength(password) {
  let strength = 0;
  const feedback = [];

  if (password.length >= 8) {
    strength += 25;
  } else {
    feedback.push('Минимум 8 символов');
  }

  if (password.length >= 12) {
    strength += 25;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    strength += 25;
  } else {
    feedback.push('Используйте заглавные и строчные буквы');
  }

  if (/[0-9]/.test(password)) {
    strength += 15;
  } else {
    feedback.push('Добавьте цифры');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    strength += 10;
  } else {
    feedback.push('Добавьте специальные символы');
  }

  let level = 'weak';
  if (strength >= 75) level = 'strong';
  else if (strength >= 50) level = 'medium';

  return {
    strength,
    level,
    feedback
  };
}

/**
 * Sanitize input
 * @param {string} input - Входные данные
 * @returns {string} Очищенные данные
 */
export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}