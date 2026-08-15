import { describe, it, expect, beforeEach } from 'vitest';

import {
  AI_OUTPUT_HISTORY_LIMIT,
  isDuplicateVersion,
  trimVersions,
  useAiOutputHistory,
  type AiOutputVersion,
} from './aiOutputHistory';

function makeVersion(
  overrides: Partial<AiOutputVersion> = {},
): AiOutputVersion {
  return {
    id: 'v1',
    sessionId: 's1',
    content: '第一条回复',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('aiOutputHistory pure functions', () => {
  it('should detect duplicate by sessionId and content', () => {
    expect(
      isDuplicateVersion([makeVersion()], makeVersion({ id: 'v2' })),
    ).toBe(true);
    expect(
      isDuplicateVersion(
        [makeVersion()],
        makeVersion({ id: 'v2', content: '不同内容' }),
      ),
    ).toBe(false);
    expect(
      isDuplicateVersion(
        [makeVersion()],
        makeVersion({ id: 'v2', sessionId: 's2' }),
      ),
    ).toBe(false);
  });

  it('should trim oldest versions beyond the limit', () => {
    const versions = Array.from({ length: 35 }, (_, i) =>
      makeVersion({ id: `v${i}`, content: `内容${i}` }),
    );
    const trimmed = trimVersions(versions);
    expect(trimmed).toHaveLength(AI_OUTPUT_HISTORY_LIMIT);
    expect(trimmed[0]?.id).toBe('v5');
    expect(trimmed.at(-1)?.id).toBe('v34');
  });

  it('should keep all versions when under the limit', () => {
    const versions = [makeVersion(), makeVersion({ id: 'v2', content: '内容2' })];
    expect(trimVersions(versions)).toEqual(versions);
  });
});

describe('useAiOutputHistory store', () => {
  beforeEach(() => {
    useAiOutputHistory.setState({ versions: [] });
  });

  it('should record versions and list by session', () => {
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ sessionId: 's1', content: 'a' }));
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v2', sessionId: 's1', content: 'b' }));
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v3', sessionId: 's2', content: 'c' }));

    expect(useAiOutputHistory.getState().listBySession('s1')).toHaveLength(2);
    expect(useAiOutputHistory.getState().listBySession('s2')).toHaveLength(1);
  });

  it('should not record duplicate sessionId + content', () => {
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ sessionId: 's1', content: 'same' }));
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v2', sessionId: 's1', content: 'same' }));

    expect(useAiOutputHistory.getState().versions).toHaveLength(1);
  });

  it('should enforce the 30-version cap when recording', () => {
    for (let i = 0; i < AI_OUTPUT_HISTORY_LIMIT + 5; i += 1) {
      useAiOutputHistory
        .getState()
        .recordVersion(makeVersion({ id: `v${i}`, content: `内容${i}` }));
    }
    const versions = useAiOutputHistory.getState().versions;
    expect(versions).toHaveLength(AI_OUTPUT_HISTORY_LIMIT);
    expect(versions[0]?.id).toBe('v5');
  });

  it('should delete a version by id', () => {
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v1', content: 'a' }));
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v2', content: 'b' }));

    useAiOutputHistory.getState().deleteVersion('v1');

    expect(useAiOutputHistory.getState().versions.map((v) => v.id)).toEqual(['v2']);
  });

  it('should clear versions for one session only', () => {
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v1', sessionId: 's1', content: 'a' }));
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v2', sessionId: 's2', content: 'b' }));

    useAiOutputHistory.getState().clearSession('s1');

    expect(useAiOutputHistory.getState().listBySession('s1')).toHaveLength(0);
    expect(useAiOutputHistory.getState().listBySession('s2')).toHaveLength(1);
  });

  it('should clear all versions', () => {
    useAiOutputHistory
      .getState()
      .recordVersion(makeVersion({ id: 'v1', content: 'a' }));
    useAiOutputHistory.getState().clearAll();
    expect(useAiOutputHistory.getState().versions).toHaveLength(0);
  });
});
