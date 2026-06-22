import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { VnLineRow } from './VnView';
import type { Character, VnLine, VnScene } from '@/types';

vi.mock('@/features/vn/hooks', () => ({
  useUploadVnAsset: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

const t = (key: string) => key;

function makeLine(overrides: Partial<VnLine> = {}): VnLine {
  return {
    id: 'l1',
    sceneId: 's1',
    sortOrder: 0,
    lineType: 'dialog',
    characterId: null,
    speakerName: '旅人',
    text: '你好，世界。',
    emotion: '',
    choiceLabel: '',
    choiceTargetSceneId: null,
    spriteAssetPath: null,
    voicePath: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const characters: Character[] = [
  {
    id: 'c1',
    workspaceId: 'ws1',
    name: '旅人',
    aliases: [],
    avatar: null,
    description: '',
    appearance: '',
    backstory: '',
    goals: '',
    conflicts: '',
    arc: '',
    tags: [],
    color: '#C68A3E',
    eventIds: [],
    createdAt: '',
    updatedAt: '',
  },
];

const scenes: VnScene[] = [
  {
    id: 's1',
    workspaceId: 'ws1',
    title: '开场',
    background: '',
    backgroundAssetPath: null,
    bgmPath: null,
    outlineNodeId: null,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  },
];

describe('VnLineRow', () => {
  it('should render line text and speaker name', () => {
    render(
      <VnLineRow
        line={makeLine()}
        index={0}
        characters={characters}
        scenes={scenes}
        workspaceId="ws1"
        currentSceneId="s1"
        canMoveUp={false}
        canMoveDown={true}
        onChange={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
        t={t}
      />,
    );
    expect(screen.getByText('你好，世界。')).toBeInTheDocument();
    expect(screen.getByText('旅人')).toBeInTheDocument();
  });

  it('should call onReorder with up when up button is clicked', () => {
    const onReorder = vi.fn();
    render(
      <VnLineRow
        line={makeLine()}
        index={1}
        characters={characters}
        scenes={scenes}
        workspaceId="ws1"
        currentSceneId="s1"
        canMoveUp={true}
        canMoveDown={true}
        onChange={() => {}}
        onDelete={() => {}}
        onReorder={onReorder}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTitle('vn.reorderUp'));
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith('up');
  });

  it('should call onReorder with down when down button is clicked', () => {
    const onReorder = vi.fn();
    render(
      <VnLineRow
        line={makeLine()}
        index={0}
        characters={characters}
        scenes={scenes}
        workspaceId="ws1"
        currentSceneId="s1"
        canMoveUp={false}
        canMoveDown={true}
        onChange={() => {}}
        onDelete={() => {}}
        onReorder={onReorder}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTitle('vn.reorderDown'));
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith('down');
  });

  it('should disable reorder buttons when at boundaries', () => {
    render(
      <VnLineRow
        line={makeLine()}
        index={0}
        characters={characters}
        scenes={scenes}
        workspaceId="ws1"
        currentSceneId="s1"
        canMoveUp={false}
        canMoveDown={false}
        onChange={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
        t={t}
      />,
    );
    expect(screen.getByTitle('vn.reorderUp')).toBeDisabled();
    expect(screen.getByTitle('vn.reorderDown')).toBeDisabled();
  });
});
