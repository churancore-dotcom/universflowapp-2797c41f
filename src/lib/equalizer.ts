/**
 * Singleton equalizer engine — binds once per HTMLAudioElement,
 * survives modal open/close, and handles element swaps (crossfade).
 */

interface EQState {
  ctx: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  filters: BiquadFilterNode[];
  gainNode: GainNode | null;
  pannerNode: StereoPannerNode | null;
  convolverNode: ConvolverNode | null;
  convolverGain: GainNode | null;
  dryGain: GainNode | null;
  boundElement: HTMLAudioElement | null;
  spatialInterval: number | null;
  // Track which elements we've already called createMediaElementSource on
  // because it can only be called ONCE per element ever
  boundElements: WeakSet<HTMLAudioElement>;
}

const state: EQState = {
  ctx: null,
  source: null,
  filters: [],
  gainNode: null,
  pannerNode: null,
  convolverNode: null,
  convolverGain: null,
  dryGain: null,
  boundElement: null,
  spatialInterval: null,
  boundElements: new WeakSet(),
};

const FREQUENCIES = [32, 64, 125, 500, 1000, 4000, 8000, 16000];

function ensureContext(): AudioContext {
  if (!state.ctx || state.ctx.state === 'closed') {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    state.ctx = new Ctor();
  }
  return state.ctx;
}

function buildGraph(ctx: AudioContext, source: MediaElementAudioSourceNode) {
  // EQ filters
  const filters = FREQUENCIES.map((freq, i) => {
    const f = ctx.createBiquadFilter();
    f.type = i === 0 ? 'lowshelf' : i === FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
    f.frequency.value = freq;
    f.Q.value = 1.4;
    f.gain.value = 0;
    return f;
  });

  // Panner for 8D
  const panner = ctx.createStereoPanner();
  panner.pan.value = 0;

  // Reverb via convolver
  const convolver = ctx.createConvolver();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 2.5;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }
  convolver.buffer = impulse;

  const convolverGain = ctx.createGain();
  convolverGain.gain.value = 0;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  // Wire: source → filters → panner → dry/wet → master → destination
  source.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }
  filters[filters.length - 1].connect(panner);
  panner.connect(dryGain);
  panner.connect(convolver);
  convolver.connect(convolverGain);
  dryGain.connect(masterGain);
  convolverGain.connect(masterGain);
  masterGain.connect(ctx.destination);

  state.source = source;
  state.filters = filters;
  state.gainNode = masterGain;
  state.pannerNode = panner;
  state.convolverNode = convolver;
  state.convolverGain = convolverGain;
  state.dryGain = dryGain;
}

/**
 * Bind the equalizer to an audio element. Safe to call repeatedly —
 * it no-ops if already bound to the same element.
 */
export async function bindEqualizer(audio: HTMLAudioElement): Promise<boolean> {
  if (state.boundElement === audio && state.source) {
    // Already bound — just ensure context is running
    if (state.ctx?.state === 'suspended') {
      await state.ctx.resume();
    }
    return true;
  }

  // If this element was already bound before (e.g. crossfade swap back),
  // we can't call createMediaElementSource again
  if (state.boundElements.has(audio)) {
    // Element was previously bound but graph was rebuilt for another element.
    // We can't rebind — this is a browser limitation.
    // The old source is dead. We just need a fresh element.
    return false;
  }

  try {
    const ctx = ensureContext();
    
    // CRITICAL: Resume BEFORE creating source
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const wasPlaying = !audio.paused;

    // Disconnect old graph if switching elements
    if (state.source) {
      try { state.source.disconnect(); } catch {}
    }
    state.filters.forEach(f => { try { f.disconnect(); } catch {} });
    if (state.pannerNode) try { state.pannerNode.disconnect(); } catch {}
    if (state.convolverNode) try { state.convolverNode.disconnect(); } catch {}
    if (state.convolverGain) try { state.convolverGain.disconnect(); } catch {}
    if (state.dryGain) try { state.dryGain.disconnect(); } catch {}
    if (state.gainNode) try { state.gainNode.disconnect(); } catch {}

    const source = ctx.createMediaElementSource(audio);
    state.boundElements.add(audio);
    state.boundElement = audio;

    buildGraph(ctx, source);

    // Ensure playback continues
    if (wasPlaying && audio.paused) {
      await audio.play().catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('Equalizer bind failed:', err);
    return false;
  }
}

export function isConnected(): boolean {
  return state.boundElement !== null && state.source !== null;
}

export function setBandGain(index: number, gain: number) {
  if (state.filters[index]) {
    state.filters[index].gain.value = gain;
  }
}

export function setBands(gains: number[]) {
  gains.forEach((g, i) => {
    if (state.filters[i]) state.filters[i].gain.value = g;
  });
}

export function setBassBoost(boost: number, bandGains: number[]) {
  const factor = boost / 8;
  if (state.filters[0]) state.filters[0].gain.value = (bandGains[0] || 0) + factor;
  if (state.filters[1]) state.filters[1].gain.value = (bandGains[1] || 0) + factor * 0.7;
  if (state.filters[2]) state.filters[2].gain.value = (bandGains[2] || 0) + factor * 0.3;
}

export function setReverb(amount: number) {
  if (state.convolverGain && state.dryGain) {
    const wet = amount / 100;
    state.convolverGain.gain.value = wet * 0.6;
    state.dryGain.gain.value = 1 - wet * 0.3;
  }
}

export function setSpatialAudio(enabled: boolean) {
  // Clear previous interval
  if (state.spatialInterval) {
    clearInterval(state.spatialInterval);
    state.spatialInterval = null;
  }

  if (enabled && state.pannerNode) {
    let angle = 0;
    state.spatialInterval = window.setInterval(() => {
      angle += 0.04;
      if (state.pannerNode) {
        state.pannerNode.pan.value = Math.sin(angle) * 0.85;
      }
    }, 30);
  } else if (state.pannerNode) {
    state.pannerNode.pan.value = 0;
  }
}

export function resumeContext() {
  if (state.ctx?.state === 'suspended') {
    state.ctx.resume().catch(() => {});
  }
}
