import { describe, expect, it, vi, beforeEach } from 'vitest';

import { collectAiContext } from '@/features/ai/contextCollector';
import { useAiContextStore } from '@/stores/aiContext';

import { buildAssistantContext } from './hooks';

vi.mock('@/features/ai/contextCollector', () => ({
  collectAiContext: vi.fn(),
}));

describe('buildAssistantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiContextStore.setState({ selection: null });
  });

  it('should return an empty context for the none mode without collecting data', async () => {
    vi.mocked(collectAiContext).mockResolvedValue({ scope: 'whole_workspace' });
    await expect(buildAssistantContext('ws-1', 'none')).resolves.toEqual({});
    expect(collectAiContext).not.toHaveBeenCalled();
  });

  it('should pass the global selected entity into the context collector', async () => {
    vi.mocked(collectAiContext).mockResolvedValue({});
    useAiContextStore.setState({
      selection: { type: 'event', id: 'e1', label: '序幕', content: '雪夜' },
    });

    await buildAssistantContext('ws-1', 'current_event');

    expect(collectAiContext).toHaveBeenCalledWith(
      'ws-1',
      ['workspaceSummary', 'timeline', 'selectedEntity'],
      expect.objectContaining({ type: 'event', id: 'e1' }),
    );
  });

  it('should pass null when nothing is selected', async () => {
    vi.mocked(collectAiContext).mockResolvedValue({});
    await buildAssistantContext('ws-1', 'whole_workspace');
    expect(collectAiContext).toHaveBeenCalledWith(
      'ws-1',
      expect.any(Array),
      null,
    );
  });
});
