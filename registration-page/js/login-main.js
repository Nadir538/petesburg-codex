/**
 * Login Page Script
 */

import FormTitle from './components/FormTitle.js';
import InputField from './components/InputField.js';
import SubmitButton from './components/SubmitButton.js';

import { showToast } from './utils/animations.js';
import { loginUser, getCurrentUser } from './utils/auth.js';

class LoginPage {
  constructor() {
    this.init();
  }

  init() {
    // Если уже залогинен — сразу на dashboard
    if (getCurrentUser()) {
      window.location.replace('dashboard.html');
      return;
    }

    this.renderComponents();
    this.attachEvents();
  }

  renderComponents() {
    const titleContainer = document.getElementById('form-title-container');

    titleContainer.innerHTML = FormTitle.render({
      title: 'Вход',
      subtitle: 'Добро пожаловать обратно'
    });

    const fieldsContainer = document.getElementById('form-fields-container');

    fieldsContainer.innerHTML = `
      ${InputField.render({
        name: 'username',
        type: 'text',
        label: 'Имя пользователя',
        placeholder: 'Введите имя пользователя',
        icon: 'user',
        required: true,
        autocomplete: 'username'
      })}

      ${InputField.render({
        name: 'password',
        type: 'password',
        label: 'Пароль',
        placeholder: 'Введите пароль',
        icon: 'lock',
        required: true,
        autocomplete: 'current-password'
      })}
    `;

    const buttonContainer = document.getElementById('submit-button-container');

    buttonContainer.innerHTML = SubmitButton.render({
      text: 'Войти',
      type: 'submit'
    });

    this.setupPasswordToggles();
    this.setupCapsLockWarning();
  }

  /**
   * Toggle видимости пароля (как в форме регистрации)
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
          if (icon) icon.setAttribute('href', '#icon-eye-off');
          button.setAttribute('aria-label', 'Скрыть пароль');
        } else {
          input.type = 'password';
          if (icon) icon.setAttribute('href', '#icon-eye');
          button.setAttribute('aria-label', 'Показать пароль');
        }
      });
    });
  }

  /**
   * Предупреждение о включённом Caps Lock в поле пароля
   */
  setupCapsLockWarning() {
    const passwordInput = document.querySelector('[name="password"]');
    if (!passwordInput) return;

    const handler = (event) => {
      const capsOn = event.getModifierState && event.getModifierState('CapsLock');
      const group = passwordInput.closest('.input-group');
      if (!group) return;

      let warn = group.querySelector('.input-hint-message');
      if (capsOn) {
        if (!warn) {
          warn = document.createElement('div');
          warn.className = 'input-hint-message';
          warn.textContent = '⚠ Включён Caps Lock';
          group.appendChild(warn);
        }
      } else if (warn) {
        warn.remove();
      }
    };

    passwordInput.addEventListener('keydown', handler);
    passwordInput.addEventListener('keyup', handler);
    passwordInput.addEventListener('blur', () => {
      const warn = passwordInput.closest('.input-group')?.querySelector('.input-hint-message');
      if (warn) warn.remove();
    });
  }

  attachEvents() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  async handleSubmit(event) {
    event.preventDefault();

    const submitButton = document.querySelector('.btn-primary');
    if (submitButton && submitButton.disabled) return;

    const formData = new FormData(event.target);
    const username = (formData.get('username') || '').trim();
    const password = formData.get('password') || '';

    if (!username || !password) {
      showToast('Введите имя пользователя и пароль', 'error');
      return;
    }

    if (submitButton) {
      submitButton.classList.add('btn-loading');
      submitButton.disabled = true;
    }

    let result;
    try {
      result = await loginUser(username, password);
    } catch (error) {
      console.error('Login error:', error);
      result = { success: false, message: 'Ошибка входа' };
    }

    if (!result.success) {
      if (submitButton) {
        submitButton.classList.remove('btn-loading');
        submitButton.disabled = false;
      }
      showToast(result.message, 'error');
      return;
    }

    if (submitButton) {
      submitButton.classList.remove('btn-loading');
      submitButton.classList.add('btn-success');
    }

    showToast(`Добро пожаловать, ${username}!`, 'success');

    // Если был сохранён URL, куда хотел пользователь — вернёмся туда
    let redirectTo = 'dashboard.html';
    try {
      const stored = sessionStorage.getItem('spb_redirect_after_login');
      if (stored) {
        sessionStorage.removeItem('spb_redirect_after_login');
        redirectTo = stored;
      }
    } catch (_) { /* ignore */ }

    setTimeout(() => {
      window.location.href = redirectTo;
    }, 900);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginPage();
});
