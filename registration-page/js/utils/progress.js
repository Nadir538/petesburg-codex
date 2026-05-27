/**
 * Progress Management Utility
 * Управление прогрессом пользователя
 */

const PROGRESS_KEY = 'spb_progress';

/**
 * Получить прогресс пользователя
 */
export function getUserProgress() {
  const progress = localStorage.getItem(PROGRESS_KEY);
  
  if (progress) {
    return JSON.parse(progress);
  }
  
  return {};
}

/**
 * Сохранить прогресс главы (старый метод - для совместимости)
 */
export function saveProgress(chapterId, completedQuestions) {
  const progress = getUserProgress();
  
  if (!progress[chapterId]) {
    progress[chapterId] = {
      completedQuestions: 0,
      completedEpisodes: [],
      totalScore: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  
  progress[chapterId].completedQuestions = completedQuestions;
  progress[chapterId].lastUpdated = new Date().toISOString();
  
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Сохранить прогресс эпизода
 * @param {string} chapterId - ID главы (hermitage, isaac-cathedral, и т.д.)
 * @param {string} episodeId - ID эпизода (episode-1, episode-2, и т.д.)
 * @param {number} score - Набранные баллы
 */
export function saveEpisodeProgress(chapterId, episodeId, score) {
  const progress = getUserProgress();
  
  // Инициализация главы если её нет
  if (!progress[chapterId]) {
    progress[chapterId] = {
      completedEpisodes: [],
      totalScore: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Добавить эпизод если еще не пройден
  if (!progress[chapterId].completedEpisodes.includes(episodeId)) {
    progress[chapterId].completedEpisodes.push(episodeId);
  }
  
  // Добавить баллы
  progress[chapterId].totalScore = (progress[chapterId].totalScore || 0) + score;
  
  // Обновить timestamp
  progress[chapterId].lastUpdated = new Date().toISOString();
  
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  
  return progress[chapterId];
}

/**
 * Получить прогресс главы
 */
export function getChapterProgress(chapterId) {
  const progress = getUserProgress();
  return progress[chapterId] || { 
    completedEpisodes: [],
    totalScore: 0 
  };
}

/**
 * Проверить, пройден ли эпизод
 */
export function isEpisodeCompleted(chapterId, episodeId) {
  const chapterProgress = getChapterProgress(chapterId);
  return chapterProgress.completedEpisodes.includes(episodeId);
}

/**
 * Сбросить весь прогресс
 */
export function resetAllProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

/**
 * Сбросить прогресс конкретной главы
 */
export function resetChapterProgress(chapterId) {
  const progress = getUserProgress();
  delete progress[chapterId];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Вычислить процент завершения
 */
export function calculateProgress(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Получить общую статистику пользователя
 */
export function getTotalStats() {
  const progress = getUserProgress();
  let totalEpisodes = 0;
  let totalScore = 0;
  let totalChapters = 0;
  
  Object.keys(progress).forEach(chapterId => {
    const chapter = progress[chapterId];
    totalEpisodes += (chapter.completedEpisodes || []).length;
    totalScore += chapter.totalScore || 0;
    
    if ((chapter.completedEpisodes || []).length > 0) {
      totalChapters++;
    }
  });
  
  return {
    totalEpisodes,
    totalScore,
    totalChapters,
    totalPossibleEpisodes: 24, // 4 главы × 6 эпизодов
    completionPercentage: Math.round((totalEpisodes / 24) * 100)
  };
}