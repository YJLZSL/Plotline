import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react';

import { Button, Input, Label, Switch } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { toastError } from '@/stores/toast';
import type { AppSettings } from '@/types';
import { AI_PROVIDERS, getProviderPreset } from '@/features/ai/providers';
import {
  useAiConnectionTest,
  useAiModelsQuery,
} from '@/features/ai/hooks';

interface AiSettingsSectionProps {
  draft: AppSettings;
  set: (patch: Partial<AppSettings>) => void;
  saved: AppSettings | undefined;
}

type ConnectionStatus = 'unconfigured' | 'testing' | 'ok' | 'error';

export function AiSettingsSection({ draft, set, saved }: AiSettingsSectionProps) {
  const { t } = useI18n();
  const [showKey, setShowKey] = useState(false);
  const prevSavedRef = useRef<AppSettings | undefined>(undefined);
  const testQuery = useAiConnectionTest(
    draft.aiBaseUrl,
    draft.aiApiKey,
    draft.aiModel,
    draft.aiProvider,
    false,
  );

  const providerPreset = getProviderPreset(draft.aiProvider);
  const apiKeyValid =
    draft.aiProvider === 'ollama' || draft.aiApiKey.trim().length >= 1;

  const runTest = useCallback(async () => {
    try {
      await testQuery.refetch();
    } catch (err) {
      toastError(err);
    }
  }, [testQuery]);

  useEffect(() => {
    if (!saved) return;
    const savedChanged =
      !prevSavedRef.current ||
      prevSavedRef.current.aiBaseUrl !== saved.aiBaseUrl ||
      prevSavedRef.current.aiApiKey !== saved.aiApiKey ||
      prevSavedRef.current.aiModel !== saved.aiModel ||
      prevSavedRef.current.aiProvider !== saved.aiProvider;
    if (savedChanged) {
      prevSavedRef.current = saved;
      if (
        draft.aiEnabled &&
        draft.aiBaseUrl.trim().length > 0 &&
        (draft.aiApiKey.trim().length > 0 || draft.aiProvider === 'ollama')
      ) {
        void runTest();
      }
    }
  }, [saved, draft, testQuery.refetch, runTest]);

  const status: ConnectionStatus = (() => {
    if (!draft.aiEnabled) return 'unconfigured';
    if (draft.aiBaseUrl.trim().length === 0) return 'unconfigured';
    if (
      draft.aiApiKey.trim().length === 0 &&
      draft.aiProvider !== 'ollama'
    ) {
      return 'unconfigured';
    }
    if (testQuery.isFetching) return 'testing';
    if (testQuery.error) return 'error';
    if (testQuery.data) {
      return testQuery.data.status === 'ok' ? 'ok' : 'error';
    }
    return 'unconfigured';
  })();

  const statusMeta = {
    unconfigured: {
      label: t('ai.statusUnconfigured'),
      dot: 'bg-text-secondary',
      bg: 'bg-bg-elevated',
      border: 'border-border',
      text: 'text-text-secondary',
    },
    testing: {
      label: t('ai.statusTesting'),
      dot: 'bg-yellow-500',
      bg: 'bg-yellow-500/5',
      border: 'border-yellow-500/20',
      text: 'text-yellow-600',
    },
    ok: {
      label: t('ai.statusConnected'),
      dot: 'bg-green-500',
      bg: 'bg-green-500/5',
      border: 'border-green-500/20',
      text: 'text-green-600',
    },
    error: {
      label: t('ai.statusFailed'),
      dot: 'bg-red-500',
      bg: 'bg-red-500/5',
      border: 'border-red-500/20',
      text: 'text-red-600',
    },
  }[status];

  const maskedKey = (() => {
    const key = draft.aiApiKey.trim();
    if (key.length === 0) return t('ai.apiKeyEmpty');
    if (key.length <= 8) return '•'.repeat(key.length);
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          'rounded-[12px] border px-4 py-4 transition-colors',
          statusMeta.bg,
          statusMeta.border,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-[10px] border bg-bg-surface',
                statusMeta.border,
              )}
            >
              <Server className={cn('h-5 w-5', statusMeta.text)} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {t('ai.connectionStatus')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    statusMeta.dot,
                    status === 'testing' && 'animate-pulse',
                  )}
                />
                <span className={cn('text-sm font-medium', statusMeta.text)}>
                  {statusMeta.label}
                </span>
                {testQuery.data && status !== 'testing' && (
                  <span className="text-xs text-text-secondary">
                    {t('ai.latency', { ms: testQuery.data.latencyMs })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={testQuery.isFetching}
            disabled={
              !draft.aiEnabled ||
              draft.aiBaseUrl.trim().length === 0 ||
              (draft.aiApiKey.trim().length === 0 &&
                draft.aiProvider !== 'ollama')
            }
            onClick={() => void runTest()}
            className="gap-1.5"
          >
            {testQuery.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t('ai.testConnection')}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">{t('ai.providerLabel')}:</span>
            <span className="inline-flex items-center gap-1.5 text-text-primary">
              <span
                className="h-5 w-5 flex items-center justify-center rounded-[6px]"
                style={{
                  backgroundColor: `${providerPreset.color}1A`,
                  color: providerPreset.color,
                }}
              >
                {providerPreset.icon}
              </span>
              {providerPreset.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">{t('ai.modelLabel')}:</span>
            <span className="text-text-primary">
              {draft.aiModel || t('ai.modelNotSet')}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="text-text-secondary">{t('ai.baseUrlLabel')}:</span>
            <span className="text-text-primary truncate">
              {draft.aiBaseUrl || t('ai.baseUrlNotSet')}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="text-text-secondary">{t('ai.apiKeyLabel')}:</span>
            <span className="text-text-primary font-mono">{maskedKey}</span>
          </div>
        </div>

        {status === 'error' && testQuery.data && (
          <div className="mt-3 rounded-[8px] bg-red-500/5 border border-red-500/10 px-3 py-2 text-xs text-red-600 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p>{testQuery.data.message}</p>
              <p className="mt-1 text-text-secondary">
                {t('ai.connectionErrorHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      <Section title={t('settings.aiEnabled')}>
        <Switch
          checked={draft.aiEnabled}
          onCheckedChange={(checked) => set({ aiEnabled: checked })}
          data-testid="ai-enabled-toggle"
        />
      </Section>

      <Section title={t('settings.aiProvider')}>
        <div className="grid grid-cols-3 gap-2">
          {AI_PROVIDERS.map((p) => {
            const active = draft.aiProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  const patch: Partial<AppSettings> = { aiProvider: p.id };
                  if (p.baseUrl) {
                    patch.aiBaseUrl = p.baseUrl;
                  }
                  if (p.defaultModel && !draft.aiModel) {
                    patch.aiModel = p.defaultModel;
                  }
                  set(patch);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-left transition-all',
                  active
                    ? 'border-accent bg-accent/10 text-text-primary'
                    : 'border-border bg-bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary',
                )}
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px]"
                  style={{ backgroundColor: `${p.color}1A`, color: p.color }}
                >
                  {p.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-text-secondary">
                    {p.description}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 flex-shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t('settings.aiBaseUrl')}>
        <Input
          value={draft.aiBaseUrl}
          onChange={(e) => set({ aiBaseUrl: e.target.value })}
          placeholder="https://api.openai.com/v1"
        />
        <p className="mt-1.5 text-xs text-text-secondary">
          {providerPreset.name} — {providerPreset.description}
        </p>
      </Section>

      <Section title={t('settings.aiModel')}>
        <ModelSelector draft={draft} set={set} />
      </Section>

      <Section title={t('settings.aiApiKey')}>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={draft.aiApiKey}
            onChange={(e) => set({ aiApiKey: e.target.value })}
            placeholder="sk-..."
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[6px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            title={showKey ? t('ai.hideKey') : t('ai.showKey')}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {!apiKeyValid && draft.aiEnabled && draft.aiProvider !== 'ollama' && (
          <p className="mt-1.5 text-xs text-yellow-600 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {t('ai.apiKeyHint')}
          </p>
        )}
        {draft.aiApiKey.trim().length > 0 &&
          draft.aiApiKey.trim().length < 8 &&
          draft.aiProvider !== 'ollama' && (
            <p className="mt-1.5 text-xs text-yellow-600 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {t('ai.apiKeyFormatHint')}
            </p>
          )}
        {providerPreset.keyUrl && (
          <a
            href={providerPreset.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            {t('settings.aiGetKey')}
            <ExternalLinkIcon />
          </a>
        )}
      </Section>

      <Section title={t('settings.aiRagEnabled')}>
        <Switch
          checked={draft.aiRagEnabled}
          onCheckedChange={(checked) => set({ aiRagEnabled: checked })}
        />
      </Section>

      <Section title={t('settings.aiSystemPrompt')}>
        <TextareaLike
          value={draft.aiSystemPrompt}
          onChange={(v) => set({ aiSystemPrompt: v })}
          placeholder={t('settings.aiSystemPromptPlaceholder')}
        />
        <p className="mt-1.5 text-xs text-text-secondary">
          {t('settings.aiSystemPromptHint')}
        </p>
      </Section>
    </div>
  );
}

function ModelSelector({
  draft,
  set,
}: {
  draft: AppSettings;
  set: (patch: Partial<AppSettings>) => void;
}) {
  const { t } = useI18n();
  const modelsQuery = useAiModelsQuery(
    draft.aiBaseUrl,
    draft.aiApiKey,
    draft.aiEnabled,
  );
  const providerPreset = getProviderPreset(draft.aiProvider);
  const hasModels = (modelsQuery.data?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={draft.aiModel}
            onChange={(e) => set({ aiModel: e.target.value })}
            className={cn(
              'w-full h-10 rounded-[6px] border bg-bg-surface px-3 text-sm appearance-none',
              modelsQuery.error ? 'border-red-500' : 'border-border',
            )}
          >
            <option value="">
              {providerPreset.defaultModel || 'gpt-4o-mini'}
            </option>
            {modelsQuery.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
        </div>
        <Button
          variant="secondary"
          size="icon"
          loading={modelsQuery.isFetching}
          onClick={() => modelsQuery.refetch()}
          title={t('ai.refreshModels')}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {modelsQuery.error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('ai.modelListError')}
        </p>
      )}

      {!modelsQuery.isFetching &&
        draft.aiEnabled &&
        draft.aiBaseUrl.trim().length > 0 &&
        draft.aiApiKey.trim().length > 0 &&
        !modelsQuery.error &&
        !hasModels && (
          <p className="text-xs text-text-secondary flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('ai.noModels')}
          </p>
        )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-semibold">{title}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TextareaLike({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={5}
      className="w-full rounded-[6px] border border-border bg-bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20"
    />
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
