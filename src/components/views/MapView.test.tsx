import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render } from '@testing-library/react';

import { LocationNode } from './MapView';
import { exportMapAsPng } from '@/features/map/export';

describe('LocationNode', () => {
  const baseLocation = {
    id: 'l1',
    workspaceId: 'ws',
    name: 'Home',
    description: '',
    posX: 100,
    posY: 100,
    color: '#C68A3E',
    linkedEventId: null,
    characterIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render emoji icon directly', () => {
    const { container } = render(
      <svg>
        <LocationNode
          location={{ ...baseLocation, icon: '🏠' }}
          index={0}
          selected={false}
          linkMode={false}
          onClick={() => {}}
          onDrag={() => {}}
          onEdit={() => {}}
        />
      </svg>,
    );
    const text = container.querySelector('text');
    expect(text).toHaveTextContent('🏠');
  });

  it('should render Lucide icon for icon name', () => {
    const { container } = render(
      <svg>
        <LocationNode
          location={{ ...baseLocation, icon: 'Castle' }}
          index={0}
          selected={false}
          linkMode={false}
          onClick={() => {}}
          onDrag={() => {}}
          onEdit={() => {}}
        />
      </svg>,
    );
    expect(container.querySelector('foreignObject')).toBeInTheDocument();
    // Lucide 图标会渲染为嵌套的 svg 元素
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });
});

describe('exportMapAsPng', () => {
  beforeAll(() => {
    const mockContext = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,test');
    SVGSVGElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    // jsdom 不会触发 Image.onload，这里手动触发
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      #src = '';
      set src(value: string) {
        this.#src = value;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this.#src;
      }
    } as unknown as typeof Image;
  });

  it('should generate a PNG data URL', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '300');
    document.body.appendChild(svg);

    const dataUrl = await exportMapAsPng(svg, { filename: 'map.png' });

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    document.body.removeChild(svg);
  });
});
