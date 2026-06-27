import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

import { useAiConnectionTest } from './hooks';
import { testAiConnection } from './api';
import { createWrapper } from './hooks';

vi.mock('./api', () => ({
  testAiConnection: vi.fn(),
}));

describe('useAiConnectionTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when disabled', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useAiConnectionTest('https://api.example.com/v1', 'sk-test', 'model', 'openai', false),
      { wrapper: createWrapper(qc) },
    );

    expect(result.current.isFetching).toBe(false);
    expect(testAiConnection).not.toHaveBeenCalled();
  });

  it('should fetch when enabled and config valid', async () => {
    vi.mocked(testAiConnection).mockResolvedValue({
      status: 'ok',
      latencyMs: 120,
      message: 'ok',
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useAiConnectionTest('https://api.example.com/v1', 'sk-test', 'model', 'openai', true),
      { wrapper: createWrapper(qc) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      status: 'ok',
      latencyMs: 120,
      message: 'ok',
    });
    expect(testAiConnection).toHaveBeenCalledWith({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
      model: 'model',
    });
  });

  it('should allow ollama provider without api key', async () => {
    vi.mocked(testAiConnection).mockResolvedValue({
      status: 'ok',
      latencyMs: 50,
      message: 'ok',
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useAiConnectionTest('http://localhost:11434/v1', '', 'qwen2.5:7b', 'ollama', true),
      { wrapper: createWrapper(qc) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(testAiConnection).toHaveBeenCalled();
  });
});
