/**
 * Story Engine - Управляет логикой сторителлинга
 */

export class StoryEngine {
    constructor(storyData) {
      this.storyData = storyData;
    }
  
    getEpisode(episodeId) {
      return this.storyData.episodes.find(ep => ep.id === episodeId);
    }
  
    getPrologue() {
      return this.storyData.prologue;
    }
  
    getEpilogue() {
      return this.storyData.epilogue;
    }
  
    getQuestions(episodeId) {
      const episode = this.getEpisode(episodeId);
      return episode ? episode.questions : [];
    }
  
    isLastEpisode(episodeId) {
      const episode = this.getEpisode(episodeId);
      return episode && episode.isFinal;
    }
  
    getNextEpisode(episodeId) {
      const episode = this.getEpisode(episodeId);
      if (!episode) return null;
  
      const currentIndex = this.storyData.episodes.findIndex(ep => ep.id === episodeId);
      const nextIndex = currentIndex + 1;
  
      if (nextIndex < this.storyData.episodes.length) {
        return this.storyData.episodes[nextIndex].id;
      }
  
      return null;
    }
  }