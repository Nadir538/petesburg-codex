/**
 * Register Page Script
 */

import FormTitle from './components/FormTitle.js';
import InputField from './components/InputField.js';
import SubmitButton from './components/SubmitButton.js';
import GalleryTitle from './components/GalleryTitle.js';
import PhotoGallery from './components/PhotoGallery.js';

import { showToast } from './utils/animations.js';
import {
  registerUser,
  isUsernameUnique
} from './utils/auth.js';
import { getPasswordStrength } from './utils/validation.js';

class RegisterPage {
  constructor() {
    this.galleryData = null;
    this.init();
  }

  async init() {
    await this.loadGalleryData();
    this.renderComponents();
    this.attachEvents();
  }

  /**
   * Загрузить данные галереи
   */
  async loadGalleryData() {
    try {
      const response = await fetch('./js/config/gallery-data.json');
      this.galleryData = await response.json();
    } catch (error) {
      console.error('Failed to load gallery data:', error);
      this.galleryData = [];
    }
  }

  /**
   * Рендер всех компонентов
   */
  renderComponents() {
    // Form Title
    const titleContainer = document.getElementById(
      'form-title-container'
    );

    titleContainer.innerHTML = FormTitle.render({
      title: 'Создать аккаунт',
      subtitle: 'Присоединяйтесь к нашему сообществу'
    });

    // Form Fields
    const fieldsContainer = document.getElementById(
      'form-fields-container'
    );

    fieldsContainer.innerHTML = `
      ${InputField.render({
        name: 'username',
        type: 'text',
        label: 'Имя пользователя',
        placeholder: 'Уникальное имя пользователя',
        icon: 'user',
        required: true,
        autocomplete: 'username'
      })}

      ${InputField.render({
        name: 'password',
        type: 'password',
        label: 'Пароль',
        placeholder: 'Минимум 8 символов',
        icon: 'lock',
        required: true,
        autocomplete: 'new-password'
      })}

      ${InputField.render({
        name: 'password_confirm',
        type: 'password',
        label: 'Подтверждение пароля',
        placeholder: 'Повторите пароль',
        icon: 'lock',
        required: true,
        autocomplete: 'new-password'
      })}
    `;

    // Submit Button
    const buttonContainer = document.getElementById(
      'submit-button-container'
    );

    buttonContainer.innerHTML = SubmitButton.render({
      text: 'Зарегистрироваться',
      type: 'submit'
    });

    // Gallery Title
    const galleryTitleContainer = document.getElementById(
      'gallery-title-container'
    );

    if (galleryTitleContainer) {
      galleryTitleContainer.innerHTML = GalleryTitle.render({
        title: 'Добро пожаловать в Санкт-Петербург'
      });
    }

    // Photo Gallery
    const galleryContainer = document.getElementById(
      'photo-gallery-container'
    );

    if (galleryContainer && this.galleryData) {
      galleryContainer.innerHTML = PhotoGallery.render(
        this.galleryData
      );
    }

    // Setup password toggles
    this.setupPasswordToggles();
  }

  /**
   * Настройка переключателей видимости пароля
   */
  setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const button = e.currentTarget;
        const wrapper = button.closest('.input-wrapper');
        const input = wrapper.querySelector('.input-field');
        const icon = button.querySelector('svg use');

        if (input.type === 'password') {
          input.type = 'text';
          icon.setAttribute('href', '#icon-eye-off');
          button.setAttribute('aria-label', 'Скрыть пароль');
        } else {
          input.type = 'password';
          icon.setAttribute('href', '#icon-eye');
          button.setAttribute('aria-label', 'Показать пароль');
        }
      });
    });
  }

  /**
   * Подключение событий
   */
  attachEvents() {
    const form = document.getElementById('registration-form');

    form.addEventListener(
      'submit',
      this.handleSubmit.bind(this)
    );

    // Real-time validation for username
    const usernameInput = document.querySelector('[name="username"]');
    if (usernameInput) {
      usernameInput.addEventListener('blur', this.validateUsername.bind(this));
    }

    // Real-time validation for password confirmation
    const passwordConfirmInput = document.querySelector('[name="password_confirm"]');
    if (passwordConfirmInput) {
      passwordConfirmInput.addEventListener('input', this.validatePasswordMatch.bind(this));
    }

    // Индикатор силы пароля + Caps Lock warning
    const passwordInput = document.querySelector('[name="password"]');
    if (passwordInput) {
      this.injectPasswordStrengthMeter(passwordInput);
      passwordInput.addEventListener('input', () => this.updatePasswordStrength(passwordInput));
      const capsHandler = (e) => this.handleCapsLock(e, passwordInput);
      passwordInput.addEventListener('keydown', capsHandler);
      passwordInput.addEventListener('keyup', capsHandler);
      passwordInput.addEventListener('blur', () => {
        const warn = passwordInput.closest('.input-group')?.querySelector('.caps-lock-warning');
        if (warn) warn.remove();
      });
    }
  }

  /**
   * Вставить разметку индикатора силы пароля под поле password
   */
  injectPasswordStrengthMeter(passwordInput) {
    const group = passwordInput.closest('.input-group');
    if (!group || group.querySelector('.password-strength')) return;

    const meter = document.createElement('div');
    meter.className = 'password-strength';
    meter.innerHTML = `
      <div class="password-strength-bar" aria-hidden="true">
        <div class="password-strength-fill" data-level="weak" style="width: 0%"></div>
      </div>
      <div class="password-strength-label" aria-live="polite"></div>
    `;
    group.appendChild(meter);
  }

  /**
   * Обновить индикатор силы пароля
   */
  updatePasswordStrength(passwordInput) {
    const group = passwordInput.closest('.input-group');
    if (!group) return;
    const fill = group.querySelector('.password-strength-fill');
    const label = group.querySelector('.password-strength-label');
    if (!fill || !label) return;

    const value = passwordInput.value;
    if (!value) {
      fill.style.width = '0%';
      fill.dataset.level = 'weak';
      label.textContent = '';
      return;
    }

    const { strength, level, feedback } = getPasswordStrength(value);
    fill.style.width = Math.min(100, strength) + '%';
    fill.dataset.level = level;

    const levelText = level === 'strong' ? 'Сильный'
      : level === 'medium' ? 'Средний'
      : 'Слабый';

    label.textContent = feedback.length > 0
      ? `${levelText} · ${feedback[0]}`
      : levelText;
  }

  /**
   * Предупреждение о Caps Lock
   */
  handleCapsLock(event, passwordInput) {
    const capsOn = event.getModifierState && event.getModifierState('CapsLock');
    const group = passwordInput.closest('.input-group');
    if (!group) return;

    let warn = group.querySelector('.caps-lock-warning');
    if (capsOn) {
      if (!warn) {
        warn = document.createElement('div');
        warn.className = 'caps-lock-warning';
        warn.textContent = '⚠ Включён Caps Lock';
        group.appendChild(warn);
      }
    } else if (warn) {
      warn.remove();
    }
  }

  /**
   * Валидация имени пользователя
   */
  validateUsername(event) {
    const input = event.target;
    const username = input.value.trim();
    const inputGroup = input.closest('.input-group');

    // Clear previous errors
    inputGroup.classList.remove('error', 'success');
    const errorMsg = inputGroup.querySelector('.input-error-message');
    if (errorMsg) errorMsg.remove();

    if (!username) return;

    if (username.length < 3) {
      this.showFieldError(input, 'Минимум 3 символа');
      return;
    }

    if (!isUsernameUnique(username)) {
      this.showFieldError(input, 'Это имя уже занято');
      return;
    }

    inputGroup.classList.add('success');
  }

  /**
   * Валидация совпадения паролей
   */
  validatePasswordMatch(event) {
    const confirmInput = event.target;
    const passwordInput = document.querySelector('[name="password"]');
    const inputGroup = confirmInput.closest('.input-group');

    // Clear previous errors
    inputGroup.classList.remove('error', 'success');
    const errorMsg = inputGroup.querySelector('.input-error-message');
    if (errorMsg) errorMsg.remove();

    if (!confirmInput.value) return;

    if (confirmInput.value !== passwordInput.value) {
      this.showFieldError(confirmInput, 'Пароли не совпадают');
      return;
    }

    inputGroup.classList.add('success');
  }

  /**
   * Показать ошибку поля
   */
  showFieldError(input, message) {
    const inputGroup = input.closest('.input-group');
    inputGroup.classList.add('error');

    let errorElement = inputGroup.querySelector('.input-error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'input-error-message';
      inputGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
    input.setAttribute('aria-invalid', 'true');
  }

  /**
   * Обработка отправки формы
   */
  async handleSubmit(event) {
    event.preventDefault();

    const submitButton = document.querySelector('.btn-primary');
    if (submitButton && submitButton.disabled) return; // защита от двойного клика

    const formData = new FormData(event.target);

    const username = formData.get('username').trim();
    const password = formData.get('password');
    const passwordConfirm = formData.get('password_confirm');

    // Validation
    if (username.length < 3) {
      showToast('Имя пользователя должно быть минимум 3 символа', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Пароль должен быть минимум 8 символов', 'error');
      return;
    }

    if (password !== passwordConfirm) {
      showToast('Пароли не совпадают', 'error');
      return;
    }

    if (!isUsernameUnique(username)) {
      showToast('Это имя пользователя уже занято', 'error');
      return;
    }

    // Lock UI пока идёт PBKDF2 (~100мс)
    if (submitButton) {
      submitButton.classList.add('btn-loading');
      submitButton.disabled = true;
    }

    // Register user (async — пароль хешируется)
    let result;
    try {
      result = await registerUser(username, password);
    } catch (error) {
      console.error('Registration error:', error);
      result = { success: false, message: 'Не удалось завершить регистрацию' };
    }

    if (!result.success) {
      if (submitButton) {
        submitButton.classList.remove('btn-loading');
        submitButton.disabled = false;
      }
      showToast(result.message, 'error');
      return;
    }

    // Success
    if (submitButton) {
      submitButton.classList.remove('btn-loading');
      submitButton.classList.add('btn-success');
    }

    showToast('✓ Регистрация успешна!', 'success');

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RegisterPage();
});