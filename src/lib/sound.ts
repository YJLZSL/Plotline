/**
 * 全局音效合成：使用 Web Audio API 生成 8-bit / 木块风格短音效。
 * 不依赖任何外部音频文件，避免版权风险。
 */

export type SoundType = 'click' | 'switch' | 'complete' | 'explosion';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
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
      // 升级：快速上行琶音
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => playTone({ frequency: f, duration: 0.12, type: 'square', volume: 0.05 }), i * 80),
      );
      break;
    case 'explosion':
      // 爆炸：噪声爆 + 低频下滑
      playTone({ frequency: 120, duration: 0.35, type: 'sawtooth', volume: 0.08, slide: 40 });
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
