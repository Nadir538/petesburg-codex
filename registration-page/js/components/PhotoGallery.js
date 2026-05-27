/**
 * Photo Gallery Component
 * Компонент фото-галереи
 */

import GalleryItem from './GalleryItem.js';

const PhotoGallery = {
  /**
   * Рендер галереи
   * @param {Array} items - Массив элементов галереи
   * @returns {string} HTML строка
   */
  render(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return this.renderEmpty();
    }

    return `
      <div class="photo-gallery" role="list" aria-label="Фотогалерея достопримечательностей">
        ${items.map(item => GalleryItem.render(item)).join('')}
      </div>
    `;
  },

  /**
   * Рендер пустого состояния
   * @returns {string} HTML строка
   */
  renderEmpty() {
    return `
      <div class="gallery-empty">
        <p>Фотографии не найдены</p>
      </div>
    `;
  }
};

export default PhotoGallery;