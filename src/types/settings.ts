export type Theme = 'light' | 'dark' | 'sepia';
export type Language = 'zh-CN' | 'zh-TW' | 'en';
export type DefaultView = 'timeline' | 'characters' | 'outline' | 'statistics' | 'notebook' | 'map' | 'vn' | 'worldbuilding';
export type TimelineZoom = 'year' | 'month' | 'day' | 'hour';
export type FontTheme = 'sans' | 'mono' | 'pixel';

export interface AppSettings {
  theme: Theme;
  accentColor: string;
  language: Language;
  editorFont: string;
  uiFont: string;
  fontSize: number;
  backupPath: string;
  autoBackup: boolean;
  backupIntervalHours: number;
  defaultView: DefaultView;
  timelineZoom: TimelineZoom;
  fontTheme: FontTheme;
  aiProvider: string;
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiEnabled: boolean;
  aiRagEnabled: boolean;
  aiSystemPrompt: string;
  splashEnabled: boolean;
  splashDurationMs: number;
}

export interface UpdateSettingsInput {
  theme?: Theme;
  accentColor?: string;
  language?: Language;
  editorFont?: string;
  uiFont?: string;
  fontSize?: number;
  backupPath?: string;
  autoBackup?: boolean;
  backupIntervalHours?: number;
  defaultView?: DefaultView;
  timelineZoom?: TimelineZoom;
  fontTheme?: FontTheme;
  aiProvider?: string;
  aiModel?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiEnabled?: boolean;
  aiRagEnabled?: boolean;
  aiSystemPrompt?: string;
  splashEnabled?: boolean;
  splashDurationMs?: number;
}

export interface Statistics {
  workspaceId: string;
  totalEvents: number;
  totalCharacters: number;
  totalTracks: number;
  totalNotes: number;
  totalOutlineNodes: number;
  statusBreakdown: {
    draft: number;
    done: number;
    revise: number;
  };
  characterAppearances: Array<{
    characterId: string;
    characterName: string;
    count: number;
  }>;
  trackEventCounts: Array<{
    trackId: string;
    trackName: string;
    count: number;
  }>;
}
