/**
 * Generative Web Audio API Synthesizer
 * Real-time soundscapes and interface interactive audio for "Petersburg Code"
 */

class AudioSynth {
    constructor() {
      this.audioCtx = null;
      this.ambientNodes = [];
      this.ambientInterval = null;
      this.isPlayingAmbient = false;
    }
  
    /**
     * Инициализация контекста (ленивая, по требованию пользователя)
     */
    initContext() {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }
  
    /**
     * Воспроизвести мягкий клик интерфейса
     */
    playClick() {
      const enabled = localStorage.getItem('spb_settings_sounds') === 'true';
      if (!enabled) return;
  
      try {
        this.initContext();
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
  
        osc.connect(gain);
        gain.connect(ctx.destination);
  
        osc.type = 'triangle';
        // Мягкий гармоничный щелчок
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // нота До 5-й октавы
        osc.frequency.exponentialRampToValueAtTime(130.81, ctx.currentTime + 0.12); // До 3-й октавы
  
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } catch (e) {
        console.warn('Click SFX failed:', e);
      }
    }
  
    /**
     * Воспроизвести мягкое звуковое уведомление (всплывашка)
     */
    playNotification() {
      const enabled = localStorage.getItem('spb_settings_sounds') === 'true';
      if (!enabled) return;
  
      try {
        this.initContext();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        
        const playTone = (freq, delay, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.04, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
          osc.start(now + delay);
          osc.stop(now + delay + duration + 0.05);
        };
  
        // Играем красивый стеклянный арпеджио-аккорд
        playTone(523.25, 0, 0.4);    // C5
        playTone(659.25, 0.06, 0.4); // E5
        playTone(783.99, 0.12, 0.5); // G5
      } catch (e) {
        console.warn('Notification SFX failed:', e);
      }
    }
  
    /**
     * Запуск фонового генеративного эмбиента
     */
    startAmbient() {
      const enabled = localStorage.getItem('spb_settings_ambient') === 'true';
      if (!enabled) {
        this.stopAmbient();
        return;
      }
  
      if (this.isPlayingAmbient) {
        // Если уже запущено, проверим смену темы звука
        this.stopAmbient();
      }
  
      try {
        this.initContext();
        this.isPlayingAmbient = true;
        const soundscape = localStorage.getItem('spb_settings_soundscape') || 'neva';
  
        if (soundscape === 'neva') {
          this.playNevaAmbient();
        } else if (soundscape === 'isaac') {
          this.playIsaacAmbient();
        } else if (soundscape === 'peterhof') {
          this.playPeterhofAmbient();
        }
      } catch (e) {
        console.warn('Failed to start ambient synthesizer:', e);
      }
    }
  
    /**
     * Остановка фонового эмбиента
     */
    stopAmbient() {
      this.isPlayingAmbient = false;
      if (this.ambientInterval) {
        clearInterval(this.ambientInterval);
        this.ambientInterval = null;
      }
      
      // Мягкое глушение всех активных узлов генератора
      this.ambientNodes.forEach(node => {
        try {
          if (node.gainNode) {
            node.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
            node.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.2);
            setTimeout(() => {
              try { node.osc.stop(); } catch (_) {}
            }, 1500);
          } else {
            try { node.stop(); } catch (_) {}
          }
        } catch (err) {
          // Игнорируем ошибки уже остановленных осцилляторов
        }
      });
      this.ambientNodes = [];
    }
  
    /**
     * Эмбиент Невы: Модуляция глубоких гармонических волн и белый шум фильтра
     */
    playNevaAmbient() {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
  
      // Два низкочастотных осциллятора для создания глубокого, убаюкивающего плеска воды
      const createWaveOsc = (freq, gainVal) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        gainNode.gain.setValueAtTime(0, now);
        // Плавный вдох в звук
        gainNode.gain.linearRampToValueAtTime(gainVal, now + 3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        
        this.ambientNodes.push({ osc, gainNode });
  
        // Медленная модуляция громкости (имитация набега волны Невы каждые 8 секунд)
        let isUp = true;
        const interval = setInterval(() => {
          if (!this.isPlayingAmbient) return;
          const currentNow = ctx.currentTime;
          gainNode.gain.cancelScheduledValues(currentNow);
          gainNode.gain.linearRampToValueAtTime(isUp ? gainVal * 1.6 : gainVal * 0.4, currentNow + 4.0);
          isUp = !isUp;
        }, 4200);
  
        this.ambientNodes.push({ stop: () => clearInterval(interval) });
      };
  
      // Глубокий бинауральный ландшафт (65 Гц и 65.4 Гц для создания фазового биения волны)
      createWaveOsc(65.0, 0.08);
      createWaveOsc(65.4, 0.08);
      // Шелковистый третий тон для теплоты
      createWaveOsc(130.0, 0.04);
    }
  
    /**
     * Исаакий: Величественный и глубокий резонирующий хорал/орган
     */
    playIsaacAmbient() {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
  
      const frequencies = [110.0, 165.0, 220.0, 330.0]; // Пятая ступень и октавы для мощного созвучия
      
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const delay = index * 0.4; // Плавное, ступенчатое встраивание голосов хора
  
        osc.type = 'triangle'; // Тёплый, полый тон
        osc.frequency.setValueAtTime(freq, now);
  
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.015, now + 3.0 + delay);
  
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + delay);
  
        this.ambientNodes.push({ osc, gainNode });
      });
  
      // Периодический звон высоких монастырских колокольчиков (раз в 6 секунд)
      const bellInterval = setInterval(() => {
        if (!this.isPlayingAmbient) return;
        const bellNow = ctx.currentTime;
        
        // Выбираем ноту из церковной гаммы
        const bellNotes = [523.25, 587.33, 659.25, 783.99, 880.00];
        const randomFreq = bellNotes[Math.floor(Math.random() * bellNotes.length)];
        
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(randomFreq, bellNow);
        
        bellGain.gain.setValueAtTime(0, bellNow);
        bellGain.gain.linearRampToValueAtTime(0.02, bellNow + 0.05);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, bellNow + 3.0);
        
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        
        bellOsc.start(bellNow);
        bellOsc.stop(bellNow + 3.2);
      }, 5500);
  
      this.ambientNodes.push({ stop: () => clearInterval(bellInterval) });
    }
  
    /**
     * Петергоф: Хрустальные брызги пенных струй Большого каскада
     */
    playPeterhofAmbient() {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
  
      // Фоновый мягкий розовый шум бурлящей воды
      const oscBg1 = ctx.createOscillator();
      const oscBg2 = ctx.createOscillator();
      const bgGain = ctx.createGain();
  
      oscBg1.type = 'sine';
      oscBg2.type = 'triangle';
      oscBg1.frequency.setValueAtTime(90, now);
      oscBg2.frequency.setValueAtTime(90.3, now);
  
      bgGain.gain.setValueAtTime(0, now);
      bgGain.gain.linearRampToValueAtTime(0.05, now + 2.0);
  
      oscBg1.connect(bgGain);
      oscBg2.connect(bgGain);
      bgGain.connect(ctx.destination);
  
      oscBg1.start(now);
      oscBg2.start(now);
  
      this.ambientNodes.push({ osc: oscBg1, gainNode: bgGain });
      this.ambientNodes.push({ osc: oscBg2, gainNode: bgGain });
  
      // Капли воды / фонтанные брызги в стиле мажорной гаммы барокко (раз в 1-2 секунды)
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
  
      const generateWaterDrop = () => {
        if (!this.isPlayingAmbient) return;
        const dropNow = ctx.currentTime;
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        
        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(freq, dropNow);
        
        // Быстрая атака и спад для "водянистого" звука
        dropGain.gain.setValueAtTime(0, dropNow);
        dropGain.gain.linearRampToValueAtTime(0.015, dropNow + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, dropNow + 0.6);
        
        dropOsc.connect(dropGain);
        dropGain.connect(ctx.destination);
        
        dropOsc.start(dropNow);
        dropOsc.stop(dropNow + 0.7);
      };
  
      const dropInterval = setInterval(generateWaterDrop, 1200);
      this.ambientNodes.push({ stop: () => clearInterval(dropInterval) });
    }
  }
  
  // Экспортируем единственный экземпляр (синглтон)
  export const sfx = new AudioSynth();
  