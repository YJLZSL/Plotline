import { describe, expect, it, beforeEach } from 'vitest';

import { useVnSpriteOffsetsStore } from './vnSpriteOffsets';

describe('vnSpriteOffsets store', () => {
  beforeEach(() => {
    useVnSpriteOffsetsStore.setState({ offsets: {} });
  });

  it('should persist a clamped sprite offset per line', () => {
    useVnSpriteOffsetsStore.getState().setOffset('line-1', { x: 42, y: 88 });
    useVnSpriteOffsetsStore.getState().setOffset('line-2', { x: -10, y: 200 });
    const offsets = useVnSpriteOffsetsStore.getState().offsets;
    expect(offsets['line-1']).toEqual({ x: 42, y: 88 });
    expect(offsets['line-2']).toEqual({ x: 0, y: 100 });
  });

  it('should reset a single offset without touching others', () => {
    useVnSpriteOffsetsStore.getState().setOffset('line-1', { x: 20, y: 30 });
    useVnSpriteOffsetsStore.getState().setOffset('line-2', { x: 60, y: 70 });
    useVnSpriteOffsetsStore.getState().resetOffset('line-1');
    const offsets = useVnSpriteOffsetsStore.getState().offsets;
    expect(offsets['line-1']).toBeUndefined();
    expect(offsets['line-2']).toEqual({ x: 60, y: 70 });
  });
});
