/**
 * Wizard Chess 3D - High Fidelity Audio & Voice Engine
 * Procedural Web Audio API sound synthesis + Web Speech synthesis + On-screen cinematic voice prompts.
 * Includes:
 *  - Weapon Clash & Melee Combat impacts (steel ringing, blade whooshes, armor bash)
 *  - Stone Shatter & Crumble Physics (bass detonations, granite fracture micro-bursts, tumbling debris)
 *  - Piece Selection Cues & Custom Character Voice Quotes (Pawn, Knight, Bishop, Rook, Queen, King)
 *  - Piece Locomotion & Heavy Stone Sliding
 *  - Check / Checkmate & Game Fanfares
 */

export type VoiceLanguageMode = 'zh' | 'en' | 'off';

export interface VoiceBannerData {
  pieceType: string;
  pieceColor: 'w' | 'b';
  pieceName: string;
  quote: string;
  action: 'select' | 'move' | 'attack' | 'check' | 'checkmate';
  visible: boolean;
}

const PIECE_NAMES_ZH: Record<string, string> = {
  pawn: '兵 (Pawn)',
  knight: '骑士 (Knight)',
  bishop: '主教 (Bishop)',
  rook: '战车 (Rook)',
  queen: '王后 (Queen)',
  king: '国王 (King)'
};

const PIECE_NAMES_EN: Record<string, string> = {
  pawn: 'Pawn',
  knight: 'Knight',
  bishop: 'Bishop',
  rook: 'Rook',
  queen: 'Queen',
  king: 'King'
};

const PIECE_QUOTES = {
  select: {
    zh: {
      pawn: [
        '前哨步兵，听候调遣！',
        '步兵就位，推进阵线！',
        '长枪在手，随时出战！',
        '誓死守卫圣所！'
      ],
      knight: [
        '铁骑纵跃，突袭破阵！',
        '战马长嘶，随时冲锋！',
        '侧翼包抄，取敌将首级！',
        '跨越障碍，直击敌阵！'
      ],
      bishop: [
        '圣所主教，斜线裁决！',
        '神圣法阵开启，斜向破敌！',
        '神明指引光之轨迹！',
        '以圣堂之名，涤荡邪祟！'
      ],
      rook: [
        '巍巍城堡，碾碎敌军！',
        '巨石战车推进，坚不可摧！',
        '重锤已备，攻城拔寨！',
        '要塞出击，所向披靡！'
      ],
      queen: [
        '王权之下，皆为尘土！',
        '整座棋盘，尽在我的掌控！',
        '让敌人见识王后的盛怒！',
        '无可匹敌的力量降临！'
      ],
      king: [
        '圣所王旗所向，众志成城！',
        '王座不可动摇，全军戒备！',
        '为了王国的荣耀，稳扎稳打！',
        '号令三军，护卫圣坛！'
      ]
    },
    en: {
      pawn: [
        'Pawn ready for the battle line!',
        'Advancing as you command!',
        'Shields up, holding the front!',
        'Ready to march into glory!'
      ],
      knight: [
        'The iron steed leaps into battle!',
        'Flanking maneuver engaged!',
        'Vaulting the line, strike swift!',
        'Gallop to the front!'
      ],
      bishop: [
        'The Sanctum guides our diagonal path.',
        'Divine judgment will fall.',
        'By the sacred rites of stone.',
        'Cleansing the long corridors!'
      ],
      rook: [
        'The stone fortress marches forward!',
        'Unyielding granite rolls on!',
        'Crush their defenses into dust!',
        'Heavy tower advancing!'
      ],
      queen: [
        'Total dominion! None shall stand before me!',
        'The board bows to my decree!',
        'Bow down before the Queen!',
        'Absolute checkmate awaits!'
      ],
      king: [
        'The crown commands the sanctum!',
        'Stand firm, guard the sacred altar!',
        'Commanding the battlefield!',
        'For the realm and the throne!'
      ]
    }
  },
  attack: {
    zh: {
      pawn: ['步兵刺杀，破开缺口！', '以死相搏！', '向前冲杀！'],
      knight: ['战马冲撞，重戟横扫！', '铁蹄践踏！', '突袭斩杀！'],
      bishop: ['神圣审判，碎石分崩！', '圣光裁决！', '受死吧！'],
      rook: ['要塞碾压，化为碎石！', '碎石崩裂！', '全军覆没！'],
      queen: ['化作灰烬吧！', '无人能挡王权制裁！', '绝对湮灭！'],
      king: ['王者之剑，斩落敌寇！', '圣所绝不退让！', '王威赫赫！']
    },
    en: {
      pawn: ['Spear thrust! Break their line!', 'For the front!'],
      knight: ['Lance strike! Trample them!', 'Flank attack!'],
      bishop: ['Divine wrath cleanses this tile!', 'Sanctum smite!'],
      rook: ['Granite ram, pulverize them!', 'Wall smash!'],
      queen: ['Reduced to dust! Bow down!', 'Total annihilation!'],
      king: ['By the King\'s sword! Stand fast!', 'Royal retribution!']
    }
  },
  check: {
    zh: '将军！王座危急！',
    en: 'Check! The King is under threat!'
  },
  checkmate: {
    zh: '绝杀将死！胜负已定！',
    en: 'Checkmate! The Sanctum has spoken!'
  }
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private soundEnabled: boolean = true;
  private voiceMode: VoiceLanguageMode = 'zh';
  private language: 'zh' | 'en' = 'zh';
  private masterVolume: number = 0.85;

  private noiseBuffer: AudioBuffer | null = null;
  private currentBanner: VoiceBannerData | null = null;
  private bannerTimer: any = null;
  private listeners: Set<(state: AudioState) => void> = new Set();

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.ensureContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  private loadSettings() {
    try {
      const savedSound = localStorage.getItem('wc_sound_enabled');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedLang = localStorage.getItem('wc_language');
      if (savedLang === 'zh' || savedLang === 'en') {
        this.language = savedLang;
      }

      const savedVoice = localStorage.getItem('wc_voice_mode') as VoiceLanguageMode;
      if (savedVoice === 'zh' || savedVoice === 'en' || savedVoice === 'off') {
        this.voiceMode = savedVoice;
      } else {
        this.voiceMode = this.language;
      }

      const savedVol = localStorage.getItem('wc_master_vol');
      if (savedVol !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(savedVol)));
    } catch (e) {
      // Ignore storage errors in restricted contexts
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('wc_sound_enabled', String(this.soundEnabled));
      localStorage.setItem('wc_voice_mode', this.voiceMode);
      localStorage.setItem('wc_language', this.language);
      localStorage.setItem('wc_master_vol', String(this.masterVolume));
    } catch (e) {}
  }

  public subscribe(cb: (state: AudioState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public getState(): AudioState {
    return {
      soundEnabled: this.soundEnabled,
      voiceMode: this.voiceMode,
      language: this.language,
      masterVolume: this.masterVolume,
      currentBanner: this.currentBanner
    };
  }

  public getLanguage(): 'zh' | 'en' {
    return this.language;
  }

  public setLanguage(lang: 'zh' | 'en'): 'zh' | 'en' {
    this.language = lang;
    // Requirement: Voice follows UI language switch
    if (this.voiceMode !== 'off') {
      this.voiceMode = lang;
    }
    this.saveSettings();
    this.notify();
    this.playUiClick();
    const win = window as any;
    if (win?.wizardChess?.setLanguage) {
      win.wizardChess.setLanguage(lang);
    }
    return this.language;
  }

  public toggleLanguage(): 'zh' | 'en' {
    const next = this.language === 'zh' ? 'en' : 'zh';
    return this.setLanguage(next);
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.soundEnabled ? this.masterVolume : 0, this.ctx.currentTime);
    }
    this.saveSettings();
    this.notify();
    if (this.soundEnabled) this.playUiClick();
    return this.soundEnabled;
  }

  public cycleVoiceMode(): VoiceLanguageMode {
    if (this.voiceMode === 'zh') {
      this.voiceMode = 'en';
      this.language = 'en';
    } else if (this.voiceMode === 'en') {
      this.voiceMode = 'off';
    } else {
      this.voiceMode = 'zh';
      this.language = 'zh';
    }

    const win = window as any;
    if (win?.wizardChess?.setLanguage) {
      win.wizardChess.setLanguage(this.language);
    }

    this.saveSettings();
    this.notify();
    this.playUiClick();
    return this.voiceMode;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.soundEnabled ? this.masterVolume : 0, this.ctx.currentTime);
    }
    this.saveSettings();
    this.notify();
  }

  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.soundEnabled ? this.masterVolume : 0;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.95;
      this.sfxGain.connect(this.masterGain);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 1.0;
      this.voiceGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.35;
      this.ambientGain.connect(this.masterGain);

      this.generateNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    // Pink-like smoothed noise
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = data[i];
    }
    this.noiseBuffer = buffer;
  }

  // =========================================================================
  // Voice Synthesis & Dialogue Prompt Overlay
  // =========================================================================
  public triggerPieceVoice(
    pieceType: string,
    color: 'w' | 'b',
    action: 'select' | 'move' | 'attack' | 'check' | 'checkmate'
  ) {
    if (this.voiceMode === 'off') return;

    let quote = '';
    const lang = this.voiceMode;
    const quotesPool = (PIECE_QUOTES as any)[action]?.[lang]?.[pieceType] ||
      PIECE_QUOTES.select[lang][pieceType as keyof typeof PIECE_QUOTES.select.zh];

    if (Array.isArray(quotesPool)) {
      quote = quotesPool[Math.floor(Math.random() * quotesPool.length)];
    } else if (typeof quotesPool === 'string') {
      quote = quotesPool;
    }

    if (!quote && action === 'check') {
      quote = PIECE_QUOTES.check[lang];
    } else if (!quote && action === 'checkmate') {
      quote = PIECE_QUOTES.checkmate[lang];
    }

    const pieceName = lang === 'zh'
      ? PIECE_NAMES_ZH[pieceType] || pieceType
      : PIECE_NAMES_EN[pieceType] || pieceType;

    // Show visual banner
    this.showVoiceBanner({
      pieceType,
      pieceColor: color,
      pieceName,
      quote: quote || `${pieceName} moving!`,
      action,
      visible: true
    });

    // Speak line using Web Speech Synthesis with tailored voice modulation
    this.speakLine(quote, pieceType);
  }

  private speakLine(text: string, pieceType: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.voiceMode === 'zh' ? 'zh-CN' : 'en-US';
      utter.volume = this.soundEnabled ? Math.min(1, this.masterVolume * 1.1) : 0;

      // Piece role voice personality
      switch (pieceType) {
        case 'queen':
          utter.pitch = 1.15;
          utter.rate = 1.0;
          break;
        case 'king':
          utter.pitch = 0.82;
          utter.rate = 0.92;
          break;
        case 'rook':
          utter.pitch = 0.75;
          utter.rate = 0.88;
          break;
        case 'bishop':
          utter.pitch = 1.05;
          utter.rate = 0.95;
          break;
        case 'knight':
          utter.pitch = 1.0;
          utter.rate = 1.08;
          break;
        default:
          utter.pitch = 1.0;
          utter.rate = 1.02;
          break;
      }

      window.speechSynthesis.speak(utter);
    } catch (e) {
      // Speech synthesis error fallback gracefully
    }
  }

  private showVoiceBanner(data: VoiceBannerData) {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.currentBanner = data;
    this.notify();

    // Auto fade out after 3.2 seconds
    this.bannerTimer = setTimeout(() => {
      if (this.currentBanner) {
        this.currentBanner = { ...this.currentBanner, visible: false };
        this.notify();
      }
    }, 3200);
  }

  // =========================================================================
  // Procedural Sound Effects (Web Audio API)
  // =========================================================================

  /**
   * Sound 1: Piece Selection Harmonic Sanctum Chime
   */
  public playPieceSelect(pieceType: string, color: 'w' | 'b') {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const baseFreqs: Record<string, number> = {
      pawn: 440,
      knight: 494,
      bishop: 554,
      rook: 330,
      queen: 659,
      king: 277
    };
    const freq = baseFreqs[pieceType] || 440;

    // Resonant chime oscillator 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    gain1.gain.setValueAtTime(0.28, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    // Harmonic bell overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.75, t);
    gain2.gain.setValueAtTime(0.12, t);
    gain2.gain.exponentialRampToValueAtTime(0.0005, t + 0.28);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc1.start(t);
    osc1.stop(t + 0.5);
    osc2.start(t);
    osc2.stop(t + 0.35);

    // Trigger voice dialogue prompt
    this.triggerPieceVoice(pieceType, color, 'select');
  }

  /**
   * Sound 2: Piece Slide / Glide Motion
   */
  public playPieceMoveStart(pieceType: string, isCapture: boolean, dist: number) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = ctx.currentTime;
    const duration = Math.min(1.2, 0.4 + dist * 0.12);

    // Stone friction rubbing against marble board
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pieceType === 'rook' ? 420 : 680, t);
    filter.Q.setValueAtTime(1.8, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(pieceType === 'rook' ? 0.25 : 0.16, t + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noiseSource.start(t);
    noiseSource.stop(t + duration);

    // Extra piece-specific flavor: Knight hooves / galloping rhythm
    if (pieceType === 'knight') {
      this.playKnightHoofSteps(duration);
    }
  }

  private playKnightHoofSteps(duration: number) {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const stepCount = Math.max(2, Math.floor(duration / 0.18));

    for (let i = 0; i < stepCount; i++) {
      const stepT = now + i * 0.16 + 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, stepT);
      osc.frequency.exponentialRampToValueAtTime(65, stepT + 0.07);

      g.gain.setValueAtTime(0.22, stepT);
      g.gain.exponentialRampToValueAtTime(0.001, stepT + 0.08);

      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(stepT);
      osc.stop(stepT + 0.09);
    }
  }

  /**
   * Sound 3: Solid Stone Pedestal Clack / Landing
   */
  public playPieceLand(pieceType: string) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // Heavy low-end stone thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // High crisp marble surface tap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(950, t);
    snapOsc.frequency.exponentialRampToValueAtTime(220, t + 0.04);

    snapGain.gain.setValueAtTime(0.18, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    snapOsc.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snapOsc.start(t);
    snapOsc.stop(t + 0.06);
  }

  /**
   * Sound 4: Melee Combat Weapon Collision & Steel Clash (兵器撞击格斗音效)
   * Plays exactly when the attacker's weapon strikes the defender's shield/weapon
   */
  public playWeaponClash(attackerType: string, defenderType: string, attackerColor: 'w' | 'b') {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. Sharp Metallic Ring & Overtone Cluster (Sword/Spear/Axe clash)
    const metallicFrequencies = [1280, 2150, 3420, 5200];
    metallicFrequencies.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f + (Math.random() * 80 - 40), t);

      const vol = 0.22 / (idx + 1);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.28 + idx * 0.05);

      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });

    // 2. High-speed weapon whoosh & spark scrape burst
    if (this.noiseBuffer) {
      const sparkSource = ctx.createBufferSource();
      sparkSource.buffer = this.noiseBuffer;
      const sparkFilter = ctx.createBiquadFilter();
      sparkFilter.type = 'highpass';
      sparkFilter.frequency.setValueAtTime(2200, t);
      sparkFilter.frequency.exponentialRampToValueAtTime(900, t + 0.15);

      const sparkGain = ctx.createGain();
      sparkGain.gain.setValueAtTime(0.38, t);
      sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      sparkSource.connect(sparkFilter);
      sparkFilter.connect(sparkGain);
      sparkGain.connect(this.sfxGain);
      sparkSource.start(t);
      sparkSource.stop(t + 0.22);
    }

    // 3. Deep Kinetic Armor Concussion Thud
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(240, t);
    bassOsc.frequency.exponentialRampToValueAtTime(45, t + 0.16);

    bassGain.gain.setValueAtTime(0.55, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    bassOsc.connect(bassGain);
    bassGain.connect(this.sfxGain);
    bassOsc.start(t);
    bassOsc.stop(t + 0.24);

    // Call out attack battle line
    this.triggerPieceVoice(attackerType, attackerColor, 'attack');
  }

  /**
   * Sound 5: Stone Shatter Physics Explosion & Rubble Tumbling (碎石崩裂粉碎音效)
   * Plays when defender disintegrates into stone fragments
   */
  public playStoneShatter(defenderType: string, defenderColor: 'w' | 'b') {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. Heavy Tectonic Bass Shatter Boom
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(110, t);
    boomOsc.frequency.exponentialRampToValueAtTime(28, t + 0.35);

    boomGain.gain.setValueAtTime(0.75, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(t);
    boomOsc.stop(t + 0.45);

    // 2. Multi-stage Granite Cracking Noise Bursts
    if (this.noiseBuffer) {
      const bursts = [
        { offset: 0, dur: 0.25, freq: 1100, gain: 0.5 },
        { offset: 0.05, dur: 0.28, freq: 750, gain: 0.42 },
        { offset: 0.11, dur: 0.32, freq: 1400, gain: 0.35 },
        { offset: 0.19, dur: 0.38, freq: 520, gain: 0.28 }
      ];

      bursts.forEach((b) => {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bFilter = ctx.createBiquadFilter();
        bFilter.type = 'bandpass';
        bFilter.frequency.setValueAtTime(b.freq, t + b.offset);
        bFilter.Q.setValueAtTime(1.5, t + b.offset);

        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(b.gain, t + b.offset);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + b.offset + b.dur);

        src.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.sfxGain!);
        src.start(t + b.offset);
        src.stop(t + b.offset + b.dur + 0.05);
      });
    }

    // 3. Shards bouncing & tumbling onto altar stones
    for (let i = 0; i < 5; i++) {
      const bounceT = t + 0.18 + i * 0.07 + Math.random() * 0.04;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'triangle';
      const bounceFreq = 400 + Math.random() * 600;
      bOsc.frequency.setValueAtTime(bounceFreq, bounceT);
      bOsc.frequency.exponentialRampToValueAtTime(bounceFreq * 0.4, bounceT + 0.05);

      bGain.gain.setValueAtTime(0.12 - i * 0.018, bounceT);
      bGain.gain.exponentialRampToValueAtTime(0.001, bounceT + 0.06);

      bOsc.connect(bGain);
      bGain.connect(this.sfxGain);
      bOsc.start(bounceT);
      bOsc.stop(bounceT + 0.07);
    }
  }

  /**
   * Sound 6: Check Alert
   */
  public playCheckAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    // Dramatic Gothic Sanctum Bell Toll
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(261.63, t); // C4

    bellGain.gain.setValueAtTime(0.48, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bellOsc.start(t);
    bellOsc.stop(t + 1.3);

    this.showVoiceBanner({
      pieceType: 'king',
      pieceColor: 'w',
      pieceName: this.voiceMode === 'zh' ? '国王 (King)' : 'King',
      quote: PIECE_QUOTES.check[this.voiceMode === 'zh' ? 'zh' : 'en'],
      action: 'check',
      visible: true
    });
    this.speakLine(PIECE_QUOTES.check[this.voiceMode === 'zh' ? 'zh' : 'en'], 'king');
  }

  /**
   * Sound 7: Checkmate Victory & Judgment Fanfare
   */
  public playCheckmate(winnerColor: 'w' | 'b') {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25]; // C Major Sanctum triumph

    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.12);

      g.gain.setValueAtTime(0.35, t + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 1.8);

      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 2.0);
    });

    this.showVoiceBanner({
      pieceType: 'king',
      pieceColor: winnerColor,
      pieceName: winnerColor === 'w' ? '白方圣所 (White Sanctum)' : '黑方圣殿 (Black Sanctum)',
      quote: PIECE_QUOTES.checkmate[this.voiceMode === 'zh' ? 'zh' : 'en'],
      action: 'checkmate',
      visible: true
    });
    this.speakLine(PIECE_QUOTES.checkmate[this.voiceMode === 'zh' ? 'zh' : 'en'], 'queen');
  }

  /**
   * Sound 8: Subtle UI button click
   */
  public playUiClick() {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

export interface AudioState {
  soundEnabled: boolean;
  voiceMode: VoiceLanguageMode;
  language: 'zh' | 'en';
  masterVolume: number;
  currentBanner: VoiceBannerData | null;
}

export const audioEngine = new AudioEngine();
