#!/usr/bin/env node
/**
 * 生成 Plotline 应用图标（Node.js 纯内置模块实现）。
 * 输出 Tauri 需要的所有尺寸与格式：PNG、ICO、Square 系列。
 * v2 设计：更优雅的羽毛笔 + 时间线组合，柔和阴影，精致渐变。
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src-tauri/icons');

const SIZES = [32, 128, 256, 512, 1024];
const SQUARE_SIZES = [
  { name: 'Square30x30Logo', size: 30 },
  { name: 'Square44x44Logo', size: 44 },
  { name: 'Square71x71Logo', size: 71 },
  { name: 'Square89x89Logo', size: 89 },
  { name: 'Square107x107Logo', size: 107 },
  { name: 'Square142x142Logo', size: 142 },
  { name: 'Square150x150Logo', size: 150 },
  { name: 'Square284x284Logo', size: 284 },
  { name: 'Square310x310Logo', size: 310 },
];

// ===== 最小 Canvas 2D 实现（RGBA） =====
class MiniCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
    this._fillStyle = [0, 0, 0, 255];
    this._strokeStyle = [0, 0, 0, 255];
    this._lineWidth = 1;
    this._path = [];
  }

  set fillStyle(v) {
    if (v && v._gradient) {
      this._fillStyle = v;
      return;
    }
    this._fillStyle = parseColor(v);
  }
  set strokeStyle(v) {
    this._strokeStyle = parseColor(v);
  }
  set lineWidth(v) {
    this._lineWidth = v;
  }

  fillRect(x, y, w, h) {
    const fill = this._fillStyle;
    let r, g, b, a;
    if (fill && fill._gradient) {
      const x0 = Math.max(0, Math.floor(x));
      const y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(this.width, Math.ceil(x + w));
      const y1 = Math.min(this.height, Math.ceil(y + h));
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          [r, g, b, a] = fill.sample(px, py);
          this._setPixelSolid(px, py, r, g, b, a ?? 255);
        }
      }
      return;
    }
    [r, g, b, a] = fill;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this._setPixelSolid(px, py, r, g, b, a);
      }
    }
  }

  beginPath() {
    this._path = [];
  }
  moveTo(x, y) {
    this._path.push({ type: 'M', x, y });
  }
  lineTo(x, y) {
    this._path.push({ type: 'L', x, y });
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    this._path.push({ type: 'Q', cpx, cpy, x, y });
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this._path.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
  }
  closePath() {
    this._path.push({ type: 'Z' });
  }

  fill() {
    this._rasterize(true, false);
  }
  stroke() {
    this._rasterize(false, true);
  }

  _rasterize(fill, stroke) {
    const segs = [];
    let cur = { x: 0, y: 0 };
    let start = { x: 0, y: 0 };
    for (const cmd of this._path) {
      if (cmd.type === 'M') {
        cur = { x: cmd.x, y: cmd.y };
        start = { ...cur };
      } else if (cmd.type === 'L') {
        segs.push({ x1: cur.x, y1: cur.y, x2: cmd.x, y2: cmd.y });
        cur = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === 'Q') {
        flattenQuad(cur, cmd, segs, 8);
        cur = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === 'C') {
        flattenCubic(cur, cmd, segs, 12);
        cur = { x: cmd.x, y: cmd.y };
      } else if (cmd.type === 'Z') {
        segs.push({ x1: cur.x, y1: cur.y, x2: start.x, y2: start.y });
        cur = { ...start };
      }
    }

    if (fill) {
      for (let y = 0; y < this.height; y++) {
        const py = y + 0.5;
        const xs = [];
        for (const s of segs) {
          if ((s.y1 <= py && s.y2 > py) || (s.y2 <= py && s.y1 > py)) {
            const t = (py - s.y1) / (s.y2 - s.y1);
            xs.push(s.x1 + t * (s.x2 - s.x1));
          }
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i < xs.length; i += 2) {
          const x0 = Math.max(0, Math.floor(xs[i]));
          const x1 = Math.min(this.width, Math.ceil(xs[i + 1] ?? this.width));
          for (let x = x0; x < x1; x++) this._setPixel(x, y);
        }
      }
    }

    if (stroke && this._lineWidth > 0) {
      const [r, g, b, a] = this._strokeStyle;
      const lw = this._lineWidth;
      for (const s of segs) {
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        const steps = Math.max(1, Math.ceil(len));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = s.x1 + t * (s.x2 - s.x1);
          const y = s.y1 + t * (s.y2 - s.y1);
          for (let dy = -lw; dy <= lw; dy++) {
            for (let dx = -lw; dx <= lw; dx++) {
              if (dx * dx + dy * dy <= lw * lw + 0.5) {
                this._setPixelSolid(Math.round(x + dx), Math.round(y + dy), r, g, b, a);
              }
            }
          }
        }
      }
    }
  }

  _setPixelSolid(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    if (a >= 255) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      this.data[idx + 3] = a;
      return;
    }
    const inv = 255 - a;
    this.data[idx] = Math.round((r * a + this.data[idx] * inv) / 255);
    this.data[idx + 1] = Math.round((g * a + this.data[idx + 1] * inv) / 255);
    this.data[idx + 2] = Math.round((b * a + this.data[idx + 2] * inv) / 255);
    this.data[idx + 3] = Math.min(255, this.data[idx + 3] + a);
  }

  roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + rr, y);
    this.lineTo(x + w - rr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.lineTo(x + w, y + h - rr);
    this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.lineTo(x + rr, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.lineTo(x, y + rr);
    this.quadraticCurveTo(x, y, x + rr, y);
    this.closePath();
  }

  // 绘制填充多边形
  fillPolygon(points) {
    this._path = [];
    if (points.length < 3) return;
    this.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      this.lineTo(points[i][0], points[i][1]);
    }
    this.closePath();
    this.fill();
  }

  // 绘制填充椭圆
  fillEllipse(cx, cy, rx, ry) {
    this.beginPath();
    const n = Math.max(20, Math.ceil(Math.max(rx, ry) * 2));
    for (let i = 0; i <= n; i++) {
      const a = (2 * Math.PI * i) / n;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    this.closePath();
    this.fill();
  }
}

function flattenQuad(p0, cmd, segs, n) {
  let prev = p0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const it = 1 - t;
    const x = it * it * p0.x + 2 * it * t * cmd.cpx + t * t * cmd.x;
    const y = it * it * p0.y + 2 * it * t * cmd.cpy + t * t * cmd.y;
    segs.push({ x1: prev.x, y1: prev.y, x2: x, y2: y });
    prev = { x, y };
  }
}

function flattenCubic(p0, cmd, segs, n) {
  let prev = p0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const it = 1 - t;
    const it2 = it * it;
    const t2 = t * t;
    const x = it2 * it * p0.x + 3 * it2 * t * cmd.cp1x + 3 * it * t2 * cmd.cp2x + t2 * t * cmd.x;
    const y = it2 * it * p0.y + 3 * it2 * t * cmd.cp1y + 3 * it * t2 * cmd.cp2y + t2 * t * cmd.y;
    segs.push({ x1: prev.x, y1: prev.y, x2: x, y2: y });
    prev = { x, y };
  }
}

function parseColor(c) {
  if (Array.isArray(c)) {
    if (c.length >= 4) return [...c];
    return [...c.slice(0, 3), c[3] ?? 255];
  }
  if (typeof c !== 'string') return [0, 0, 0, 255];
  const s = c.replace(/\s/g, '');
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
    }
    if (hex.length === 8) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), parseInt(hex.slice(6, 8), 16)];
    }
  }
  const rgbMatch = s.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (rgbMatch) {
    return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3], 255];
  }
  const rgbaMatch = s.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (rgbaMatch) {
    return [+rgbaMatch[1], +rgbaMatch[2], +rgbaMatch[3], Math.round(+rgbaMatch[4] * 255)];
  }
  return [0, 0, 0, 255];
}

function createGradient(canvas, x0, y0, x1, y1, stops) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / len;
  const dy = (y1 - y0) / len;
  return {
    _gradient: true,
    stops,
    sample: (px, py) => {
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len));
      return interpolateStops(stops, t);
    },
  };
}

function createRadialGradient(cx, cy, stops) {
  return {
    _gradient: true,
    stops,
    sample: (px, py) => {
      const dist = Math.hypot(px - cx, py - cy) / (Math.max(cx, cy) * 1.5);
      const t = Math.max(0, Math.min(1, dist));
      return interpolateStops(stops, t);
    },
  };
}

function interpolateStops(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.offset && t <= b.offset) {
      const k = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
      const inv = 1 - k;
      return [
        Math.round(a.color[0] * inv + b.color[0] * k),
        Math.round(a.color[1] * inv + b.color[1] * k),
        Math.round(a.color[2] * inv + b.color[2] * k),
        Math.round((a.color[3] ?? 255) * inv + (b.color[3] ?? 255) * k),
      ];
    }
  }
  const last = stops[stops.length - 1].color;
  return [last[0], last[1], last[2], last[3] ?? 255];
}

MiniCanvas.prototype._setPixel = function (x, y) {
  const fill = this._fillStyle;
  let r, g, b, a;
  if (fill && fill._gradient) {
    [r, g, b, a] = fill.sample(x, y);
    a = a ?? 255;
  } else {
    [r, g, b, a] = fill;
  }
  this._setPixelSolid(x, y, r, g, b, a);
};

// ===== 辅助函数 =====
function thickPolygon(points, width) {
  if (points.length < 2) return [];
  const halfW = width / 2;
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    let dx, dy;
    if (i === 0) {
      dx = points[1][0] - points[0][0];
      dy = points[1][1] - points[0][1];
    } else if (i === points.length - 1) {
      dx = points[i][0] - points[i - 1][0];
      dy = points[i][1] - points[i - 1][1];
    } else {
      dx = points[i + 1][0] - points[i - 1][0];
      dy = points[i + 1][1] - points[i - 1][1];
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push([points[i][0] + nx * halfW, points[i][1] + ny * halfW]);
    right.push([points[i][0] - nx * halfW, points[i][1] - ny * halfW]);
  }
  return [...left, ...right.reverse()];
}

function curvePoints(fn, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(fn(i / steps));
  }
  return pts;
}

// ===== 绘制图标 =====
function drawIcon(size) {
  const canvas = new MiniCanvas(size, size);
  const pad = Math.round(size * 0.07);
  const r = Math.round(size * 0.22);

  // 径向暖色渐变背景
  const bgGrad = createRadialGradient(size / 2, size / 2, [
    { offset: 0, color: [240, 185, 130] },    // 中心暖亮
    { offset: 0.4, color: [220, 135, 60] },    // 暖琥珀
    { offset: 0.75, color: [180, 100, 35] },   // 深琥珀
    { offset: 1, color: [150, 75, 25] },       // 边缘陶土
  ]);
  canvas.fillStyle = bgGrad;
  canvas.fillRect(pad, pad, size - pad * 2, size - pad * 2);

  // 细内边框高光
  canvas.strokeStyle = 'rgba(255,255,255,0.30)';
  canvas.lineWidth = Math.max(1, size * 0.005);
  canvas.roundRect(pad + size * 0.008, pad + size * 0.008, size - pad * 2 - size * 0.016, size - pad * 2 - size * 0.016, r - size * 0.008);
  canvas.stroke();

  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const shadowOff = Math.max(1, Math.round(s * 0.008));
  const shadowColor = [80, 45, 20, 40];

  // 1. 笔杆（粗线）
  const penW = Math.max(3, Math.round(s * 0.032));
  const penPts = curvePoints((t) => {
    const x = cx - s * 0.08 + t * s * 0.16;
    const y = cy - s * 0.24 + t * s * 0.32 + Math.sin(t * Math.PI) * s * 0.015;
    return [x, y];
  }, 90);

  // 阴影
  canvas.fillStyle = shadowColor;
  canvas.fillPolygon(thickPolygon(penPts.map((p) => [p[0] + shadowOff, p[1] + shadowOff]), penW + 1));

  // 主笔杆
  canvas.fillStyle = [255, 255, 255, 255];
  canvas.fillPolygon(thickPolygon(penPts, penW));

  // 2. 笔尖（菱形）
  const tipX = cx + s * 0.08;
  const tipY = cy + s * 0.08;
  const tipS = Math.max(4, Math.round(s * 0.020));

  canvas.fillStyle = shadowColor;
  canvas.fillPolygon([
    [tipX + shadowOff, tipY - tipS + shadowOff],
    [tipX + tipS * 0.8 + shadowOff, tipY + shadowOff],
    [tipX + shadowOff, tipY + tipS + shadowOff],
    [tipX - tipS * 0.8 + shadowOff, tipY + shadowOff],
  ]);

  canvas.fillStyle = [255, 255, 255, 255];
  canvas.fillPolygon([
    [tipX, tipY - tipS],
    [tipX + tipS * 0.8, tipY],
    [tipX, tipY + tipS],
    [tipX - tipS * 0.8, tipY],
  ]);

  // 3. 波浪线（故事线）
  const storyW = Math.max(2, Math.round(s * 0.025));
  const storyPts = curvePoints((t) => {
    const x = cx - s * 0.20 + t * s * 0.40;
    const y = cy + s * 0.14 + Math.sin(t * Math.PI * 2) * s * 0.06;
    return [x, y];
  }, 120);

  canvas.fillStyle = shadowColor;
  canvas.fillPolygon(thickPolygon(storyPts.map((p) => [p[0] + shadowOff, p[1] + shadowOff]), storyW + 1));

  canvas.fillStyle = [255, 255, 255, 245];
  canvas.fillPolygon(thickPolygon(storyPts, storyW));

  // 4. 节点（圆点）
  const nodeR = Math.max(2, Math.round(s * 0.014));
  const nodes = [
    [cx - s * 0.14, cy + s * 0.14 + Math.sin(0.15 * Math.PI * 2) * s * 0.06],
    [cx, cy + s * 0.14 + Math.sin(0.5 * Math.PI * 2) * s * 0.06],
    [cx + s * 0.14, cy + s * 0.14 + Math.sin(0.85 * Math.PI * 2) * s * 0.06],
  ];

  for (const [nx, ny] of nodes) {
    canvas.fillStyle = shadowColor;
    canvas.fillEllipse(nx + 1, ny + 1, nodeR + 1, nodeR + 1);
    canvas.fillStyle = [255, 255, 255, 255];
    canvas.fillEllipse(nx, ny, nodeR, nodeR);
  }

  // 5. 羽毛小装饰
  const featherW = Math.max(1, Math.round(s * 0.012));
  for (const side of [-1, 1]) {
    const fPts = curvePoints((t) => {
      const x = cx - s * 0.08 + side * t * s * 0.05;
      const y = cy - s * 0.24 - t * s * 0.08 + Math.sin(t * Math.PI) * s * 0.015;
      return [x, y];
    }, 20);

    canvas.fillStyle = [255, 255, 255, 200];
    canvas.fillPolygon(thickPolygon(fPts, featherW));
  }

  // 圆角遮罩
  applyRoundedMask(canvas, pad, pad, size - pad * 2, size - pad * 2, r);

  return canvas.data;
}

function applyRoundedMask(canvas, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const dx = Math.max(x - px, px - (x + w), 0);
      const dy = Math.max(y - py, py - (y + h), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rr) {
        const idx = (py * canvas.width + px) * 4;
        canvas.data[idx + 3] = 0;
      } else if (dist > rr - 1) {
        const idx = (py * canvas.width + px) * 4;
        canvas.data[idx + 3] = Math.round(canvas.data[idx + 3] * (rr - dist));
      }
    }
  }
}

// ===== PNG 编码 =====
function pngEncode(rgba, width, height) {
  const chunks = [];
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  chunks.push(makeChunk('IHDR', ihdr));

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (width * 4 + 1) + 1 + x * 4;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      raw[dst + 3] = rgba[src + 3];
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  chunks.push(makeChunk('IDAT', idat));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  const table = CRC32_TABLE || (CRC32_TABLE = makeCrc32Table());
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}
let CRC32_TABLE;
function makeCrc32Table() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}

// ===== ICO 编码 =====
function icoEncode(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let offset = 6 + dirSize;
  const dirs = [];
  const data = [];
  for (const img of images) {
    const dir = Buffer.alloc(16);
    dir[0] = img.size;
    dir[1] = img.size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(img.png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirs.push(dir);
    data.push(img.png);
    offset += img.png.length;
  }
  return Buffer.concat([header, ...dirs, ...data]);
}

// ===== 主流程 =====
async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const pngBuffers = {};
  for (const size of SIZES) {
    const rgba = drawIcon(size);
    const png = pngEncode(rgba, size, size);
    const name = size === 1024 ? '1024x1024.png' : `${size}x${size}.png`;
    await writeFile(resolve(OUT_DIR, name), png);
    pngBuffers[size] = png;
    console.log(`generated ${name}`);
  }

  // icon.png = 512x512
  await writeFile(resolve(OUT_DIR, 'icon.png'), pngBuffers[512]);
  console.log('generated icon.png');

  // 128@2x.png = 256x256
  await writeFile(resolve(OUT_DIR, '128x128@2x.png'), pngBuffers[256]);
  console.log('generated 128x128@2x.png');

  // Square 系列
  for (const sq of SQUARE_SIZES) {
    const rgba = drawIcon(sq.size);
    const png = pngEncode(rgba, sq.size, sq.size);
    await writeFile(resolve(OUT_DIR, `${sq.name}.png`), png);
    console.log(`generated ${sq.name}.png`);
  }

  // ICO
  const ico = icoEncode([
    { size: 32, png: pngBuffers[32] },
    { size: 128, png: pngBuffers[128] },
    { size: 256, png: pngBuffers[256] },
  ]);
  await writeFile(resolve(OUT_DIR, 'icon.ico'), ico);
  console.log('generated icon.ico');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { MiniCanvas, parseColor, createGradient, createRadialGradient, interpolateStops, drawIcon, pngEncode };
