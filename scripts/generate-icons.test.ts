import { describe, it, expect } from 'vitest';

import { parseColor, interpolateStops, createGradient, drawIcon, pngEncode } from './generate-icons.mjs';

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#C68A3E')).toEqual([198, 138, 62, 255]);
  });

  it('parses 8-digit hex with alpha', () => {
    expect(parseColor('#C68A3E80')).toEqual([198, 138, 62, 128]);
  });

  it('parses rgb()', () => {
    expect(parseColor('rgb(255, 128, 0)')).toEqual([255, 128, 0, 255]);
  });

  it('parses rgba() with float alpha', () => {
    expect(parseColor('rgba(255, 128, 0, 0.5)')).toEqual([255, 128, 0, 128]);
  });

  it('preserves array with alpha', () => {
    expect(parseColor([10, 20, 30, 40])).toEqual([10, 20, 30, 40]);
  });

  it('adds alpha to short array', () => {
    expect(parseColor([10, 20, 30])).toEqual([10, 20, 30, 255]);
  });

  it('returns black for unknown strings', () => {
    expect(parseColor('not-a-color')).toEqual([0, 0, 0, 255]);
  });
});

describe('interpolateStops', () => {
  const stops = [
    { offset: 0, color: [0, 0, 0] },
    { offset: 1, color: [255, 255, 255] },
  ];

  it('returns start color at t=0', () => {
    expect(interpolateStops(stops, 0)).toEqual([0, 0, 0, 255]);
  });

  it('returns end color at t=1', () => {
    expect(interpolateStops(stops, 1)).toEqual([255, 255, 255, 255]);
  });

  it('interpolates midpoint', () => {
    expect(interpolateStops(stops, 0.5)).toEqual([128, 128, 128, 255]);
  });

  it('clamps alpha for colors without explicit alpha', () => {
    const s = [{ offset: 0, color: [100, 100, 100] }];
    expect(interpolateStops(s, 0)).toEqual([100, 100, 100, 255]);
  });
});

describe('createGradient', () => {
  it('samples along the gradient direction', () => {
    const canvas = { width: 64, height: 64 } as any;
    const grad = createGradient(canvas, 0, 0, 64, 0, [
      { offset: 0, color: [0, 0, 0] },
      { offset: 1, color: [100, 100, 100] },
    ]);
    expect(grad.sample(0, 0)).toEqual([0, 0, 0, 255]);
    expect(grad.sample(64, 0)).toEqual([100, 100, 100, 255]);
    const mid = grad.sample(32, 0);
    expect(mid[0]).toBeGreaterThanOrEqual(49);
    expect(mid[0]).toBeLessThanOrEqual(51);
  });
});

describe('drawIcon', () => {
  it('produces expected size buffer', () => {
    const data = drawIcon(64);
    expect(data.length).toBe(64 * 64 * 4);
  });

  it('has warm background and white curve without pure black holes', () => {
    const data = drawIcon(128);
    let blackPixels = 0;
    let warmPixels = 0;
    let whitePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a === 0) continue;
      if (r > 160 && g > 100 && b < 100) warmPixels++;
      else if (r > 200 && g > 200 && b > 200) whitePixels++;
      else if (r < 10 && g < 10 && b < 10) blackPixels++;
    }
    expect(warmPixels).toBeGreaterThan(8000);
    expect(whitePixels).toBeGreaterThan(100);
    expect(blackPixels).toBe(0);
  });

  it('has transparent corners from rounded mask', () => {
    const size = 128;
    const data = drawIcon(size);
    const corner = (0 * size + 0) * 4;
    expect(data[corner + 3]).toBe(0);
    const otherCorner = ((size - 1) * size + (size - 1)) * 4;
    expect(data[otherCorner + 3]).toBe(0);
  });
});

describe('pngEncode', () => {
  it('encodes a valid PNG signature', () => {
    const rgba = Buffer.alloc(4 * 4 * 4, 0);
    const png = pngEncode(rgba, 4, 4);
    expect(png[0]).toBe(0x89);
    expect(png.toString('ascii', 1, 4)).toBe('PNG');
  });
});
