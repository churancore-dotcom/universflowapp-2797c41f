/**
 * Singleton audio engine — owns the AudioContext and routes audio
 * through EQ filters, reverb, and analyser.
 * 
 * CRITICAL: createMediaElementSource() can only be called ONCE per
 * HTMLAudioElement. We cache sources in a WeakMap to handle element reuse.
 * 
 * Graph: source → inputGain → analyser → filters[0..7] → dryGain → masterGain → destination
 *                                                       → convolver → wetGain → masterGain
 * Reverb wet is capped at 0.35 to NEVER mute audio.
 */

const FREQUENCIES = [32, 64, 125, 500, 1000, 4000, 8000, 16000];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private el: HTMLAudioElement | null = null;

  private inputGain: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private boundSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  private currentSource: MediaElementAudioSourceNode | null = null;
  private graphBuilt = false;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new C();
      this.graphBuilt = false;
    }
    return this.ctx;
  }

  private ensureGraph() {
    if (this.graphBuilt) return;
    const ctx = this.getCtx();

    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = 1;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.filters = FREQUENCIES.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.Q.value = i === 0 || i === FREQUENCIES.length - 1 ? 1 : 2.0;
      f.gain.value = 0;
      return f;
    });

    // Reverb impulse
    this.convolver = ctx.createConvolver();
    const sr = ctx.sampleRate;
    const len = sr * 2;
    const impulse = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    this.convolver.buffer = impulse;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;

    // Wire: input → analyser → filters → last filter splits to dry + convolver
    this.inputGain.connect(this.analyserNode);
    this.analyserNode.connect(this.filters[0]);
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    const lastFilter = this.filters[this.filters.length - 1];
    lastFilter.connect(this.dryGain);
    lastFilter.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.graphBuilt = true;
    console.log('[AudioEngine] Graph built');
    this.restoreSettings();
  }

  async bind(audio: HTMLAudioElement): Promise<boolean> {
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      this.ensureGraph();

      if (this.el === audio && this.currentSource) return true;

      if (this.currentSource) {
        try { this.currentSource.disconnect(this.inputGain!); } catch {}
      }

      let source = this.boundSources.get(audio);
      if (!source) {
        source = ctx.createMediaElementSource(audio);
        this.boundSources.set(audio, source);
      }

      source.connect(this.inputGain!);
      this.currentSource = source;
      this.el = audio;
      console.log('[AudioEngine] Bound, state:', ctx.state);
      return true;
    } catch (err) {
      console.error('[AudioEngine] Bind failed:', err);
      return false;
    }
  }

  private restoreSettings() {
    try {
      const bandsStr = localStorage.getItem('eq_bands');
      if (bandsStr) {
        const bands = JSON.parse(bandsStr);
        if (Array.isArray(bands)) {
          this.setBands(bands.map((b: any) => b.gain ?? 0));
        }
      }
      const bass = Number(localStorage.getItem('eq_bass')) || 0;
      if (bass > 0) {
        const bandsData = JSON.parse(localStorage.getItem('eq_bands') || '[]');
        this.setBassBoost(bass, bandsData.map((b: any) => b.gain ?? 0));
      }
      const reverb = Number(localStorage.getItem('eq_reverb')) || 0;
      if (reverb > 0) this.setReverb(reverb);
    } catch {}
  }

  get connected(): boolean {
    return this.el !== null && this.currentSource !== null && this.graphBuilt;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  async resume() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  setBands(gains: number[]) {
    gains.forEach((g, i) => {
      if (this.filters[i]) this.filters[i].gain.value = g;
    });
  }

  setBassBoost(boost: number, bandGains: number[]) {
    if (!this.filters.length) return;
    const factor = boost / 5;
    if (this.filters[0]) this.filters[0].gain.value = (bandGains[0] || 0) + factor;
    if (this.filters[1]) this.filters[1].gain.value = (bandGains[1] || 0) + factor * 0.8;
    if (this.filters[2]) this.filters[2].gain.value = (bandGains[2] || 0) + factor * 0.4;
  }

  // CRITICAL: wet capped at 0.35 so audio NEVER goes silent
  setReverb(amount: number) {
    if (this.wetGain && this.dryGain) {
      const wet = Math.min(0.35, amount / 100);
      this.wetGain.gain.value = wet;
      this.dryGain.gain.value = 1 - wet * 0.3;
    }
  }

  // No-op kept for backward compat — 8D removed
  set8D(_enabled: boolean) {}
}

export const audioEngine = new AudioEngine();
