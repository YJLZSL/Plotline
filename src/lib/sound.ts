/**
 * 全局音效合成：使用 Web Audio API 生成 8-bit / 木块风格短音效。
 * 不依赖任何外部音频文件，避免版权风险。
 */

export type SoundType = 'click' | 'switch' | 'complete' | 'explosion' | 'mine' | 'place' | 'levelup' | 'hiss';

let audioCtx: AudioContext | null = null;

interface WindowWithAudioContext extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const w = window as WindowWithAudioContext;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone({
  frequency,
  duration,
  type = 'square',
  volume = 0.05,
  slide,
}: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  slide?: number;
}) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise({ duration, volume = 0.05 }: { duration: number; volume?: number }) {
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + duration);
}

export function playSound(type: SoundType) {
  switch (type) {
    case 'click':
      // 木块敲击：短促方波，频率下滑
      playTone({ frequency: 600, duration: 0.08, type: 'square', volume: 0.04, slide: 300 });
      break;
    case 'switch':
      // 拉杆：两个短音
      playTone({ frequency: 800, duration: 0.06, type: 'square', volume: 0.04 });
      setTimeout(() => playTone({ frequency: 500, duration: 0.06, type: 'square', volume: 0.04 }), 60);
      break;
    case 'complete':
      // 完成：快速上行琶音
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => playTone({ frequency: f, duration: 0.12, type: 'square', volume: 0.05 }), i * 80),
      );
      break;
    case 'explosion':
      // 爆炸：噪声爆 + 低频下滑
      playNoise({ duration: 0.35, volume: 0.08 });
      playTone({ frequency: 120, duration: 0.35, type: 'sawtooth', volume: 0.08, slide: 40 });
      break;
    case 'mine':
      // 挖掘：短促噪声 + 高频下滑
      playNoise({ duration: 0.12, volume: 0.04 });
      playTone({ frequency: 700, duration: 0.12, type: 'sawtooth', volume: 0.03, slide: 200 });
      break;
    case 'place':
      // 放置方块：短促低鸣 + 轻微噪声
      playTone({ frequency: 180, duration: 0.08, type: 'square', volume: 0.05 });
      playNoise({ duration: 0.06, volume: 0.02 });
      break;
    case 'levelup':
      // 升级/获得经验：明亮上行短音
      [880, 1109, 1319, 1760].forEach((f, i) =>
        setTimeout(() => playTone({ frequency: f, duration: 0.1, type: 'square', volume: 0.04 }), i * 60),
      );
      break;
    case 'hiss':
      // 苦力怕嘶嘶声：短促白噪声+高频下滑
      playNoise({ duration: 0.2, volume: 0.04 });
      playTone({ frequency: 900, duration: 0.2, type: 'sawtooth', volume: 0.03, slide: 200 });
      break;
  }
}

let enabled = true;
export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

export function playSoundIfEnabled(type: SoundType) {
  if (enabled) playSound(type);
}
