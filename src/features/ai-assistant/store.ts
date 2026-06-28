import { create } from 'zustand';

import type { AiAgentId, AiAssistantContextMode } from '@/types';

interface AiAssistantState {
  currentAgentId: AiAgentId;
  contextMode: AiAssistantContextMode;
  currentSessionId: string | null;
  input: string;
  isStreaming: boolean;
  streamingContent: string;
  showAgentPanel: boolean;
  showContextPanel: boolean;
  setCurrentAgentId: (id: AiAgentId) => void;
  setContextMode: (mode: AiAssistantContextMode) => void;
  setCurrentSessionId: (id: string | null) => void;
  setInput: (input: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setShowAgentPanel: (show: boolean) => void;
  setShowContextPanel: (show: boolean) => void;
  resetStreaming: () => void;
}

export const useAiAssistantStore = create<AiAssistantState>()((set) => ({
  currentAgentId: 'chat',
  contextMode: 'whole_workspace',
  currentSessionId: null,
  input: '',
  isStreaming: false,
  streamingContent: '',
  showAgentPanel: false,
  showContextPanel: false,
  setCurrentAgentId: (id) => set({ currentAgentId: id }),
  setContextMode: (mode) => set({ contextMode: mode }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setInput: (input) => set({ input }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  setShowAgentPanel: (showAgentPanel) => set({ showAgentPanel }),
  setShowContextPanel: (showContextPanel) => set({ showContextPanel }),
  resetStreaming: () => set({ isStreaming: false, streamingContent: '' }),
}));
