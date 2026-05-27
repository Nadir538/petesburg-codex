/**
 * Quiz Card Component
 * Компонент отображения квиза (вопросов)
 */

export const QuizCard = {
  /**
   * Рендер карточки квиза
   * @param {Object} question - Данные вопроса
   * @param {Object} answered - Состояние ответа (или null если не отвечено)
   * @returns {string} HTML строка
   */
  render(question = {}, answered = null) {
    if (!question) return '';

    const answers = question.answers || [];

    const answersHtml = answers.map(ans => {
      let extraClass = '';
      let disabledAttr = '';

      if (answered) {
        disabledAttr = 'disabled';
        if (ans.id === question.correctAnswer) {
          extraClass = 'correct';
        } else if (ans.id === answered.answerId) {
          extraClass = 'incorrect';
        } else {
          extraClass = 'muted';
        }
      }

      return `
        <button class="quiz-answer-btn ${extraClass}" data-answer-id="${ans.id}" ${disabledAttr}>
          <span class="option-marker"></span>
          <span class="option-text">${this.escapeHtml(ans.text)}</span>
        </button>
      `;
    }).join('');

    let feedbackHtml = '';
    if (answered) {
      const isCorrect = answered.isCorrect;
      feedbackHtml = `
        <div class="quiz-feedback-container fade-in">
          <div class="quiz-feedback-status ${isCorrect ? 'success' : 'error'}">
            <span class="feedback-icon">${isCorrect ? '🏆' : '💡'}</span>
            <div class="feedback-info">
              <span class="feedback-title">${isCorrect ? 'Правильно!' : 'Решение вопроса'}</span>
              <span class="feedback-subtitle">${isCorrect ? 'Отличная работа!' : 'Давайте разберемся'}</span>
            </div>
          </div>
          <p class="quiz-explanation">${this.escapeHtml(question.explanation || '')}</p>
          ${question.funFact ? `
            <div class="quiz-fun-fact">
              <span class="fun-fact-badge">📖 Любопытный факт</span>
              <p class="fun-fact-text">${this.escapeHtml(question.funFact)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="quiz-card" data-atmosphere="${question.atmosphere || 'default'}">
        <div class="quiz-header">
          <span class="quiz-badge">Вопрос</span>
          <span class="quiz-points">+${question.points || 10} баллов</span>
        </div>
        
        <h3 class="quiz-question">${this.escapeHtml(question.question || 'Вопрос')}</h3>
        
        <div class="quiz-answers-grid">
          ${answersHtml}
        </div>
        
        ${feedbackHtml}
      </div>
    `;
  },

  /**
   * Экранирование HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

export default QuizCard;
