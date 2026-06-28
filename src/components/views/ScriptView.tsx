import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Film, MapPin, Users } from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  StatusDot,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useWorkspaceSelectionStore } from '@/stores/workspaceSelection';
import { useEventsQuery, useTracksQuery } from '@/features/timeline/hooks';
import { computeTrackAnchors, sortEventsForScript } from '@/features/timeline/scriptSort';
import { useCharactersQuery } from '@/features/characters/hooks';
import { useLocationsQuery } from '@/features/map/hooks';
import { formatEventTime, formatEventDuration } from '@/lib/time';
import type { Event, EventStatus, Track } from '@/types';

const STATUS_STYLES: Record<
  EventStatus,
  { labelKey: string; dot: string }
> = {
  draft: { labelKey: 'timeline.event.statusDraft', dot: 'bg-text-secondary/60' },
  done: { labelKey: 'timeline.event.statusDone', dot: 'bg-status-done' },
  revise: { labelKey: 'timeline.event.statusRevise', dot: 'bg-status-revise' },
};

interface ScriptViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function ScriptView({ workspaceId, workspaceName }: ScriptViewProps) {
  const { t, i18n } = useI18n();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { data: events = [] } = useEventsQuery(workspaceId);
  const { data: tracks = [] } = useTracksQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const { data: locations = [] } = useLocationsQuery(workspaceId);

  const selectedEventId = useWorkspaceSelectionStore((s) => s.selectedEventId);
  const selectEvent = useWorkspaceSelectionStore((s) => s.selectEvent);

  const scriptEvents = useMemo(() => {
    const trackMap = new Map(tracks.map((tr) => [tr.id, tr]));
    const trackAnchor = computeTrackAnchors(events);
    return [...events]
      .map((ev) => ({ ev, track: trackMap.get(ev.trackId) }))
      .filter((item): item is { ev: Event; track: Track } => !!item.track)
      .sort((a, b) => sortEventsForScript(a.ev, b.ev, trackAnchor));
  }, [events, tracks]);

  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedEventId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
  }, [selectedEventId, reduced]);

  const handleSelect = (ev: Event) => {
    selectEvent(ev.id);
    navigate(`/workspaces/${workspaceId}/timeline`);
  };

  return (
    <>
      <Toolbar
        title={t('script.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/workspaces/${workspaceId}/timeline`)}
            className="gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            {t('script.backToTimeline')}
          </Button>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {scriptEvents.length === 0 ? (
          <EmptyState
            icon={<Film className="h-10 w-10" />}
            title={t('script.emptyTitle')}
            description={t('script.emptyDescription')}
            action={
              <Button onClick={() => navigate(`/workspaces/${workspaceId}/timeline`)}>
                {t('script.emptyCta')}
              </Button>
            }
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {scriptEvents.map(({ ev, track }, index) => {
              const isSelected = ev.id === selectedEventId;
              const status = STATUS_STYLES[ev.status];
              const displayTime = formatEventTime(ev, i18n.language);
              const duration = formatEventDuration(ev, i18n.language);
              const associatedCharacters = characters.filter((c) =>
                ev.characterIds.includes(c.id),
              );
              const location = locations.find((l) => l.id === ev.locationId);

              return (
                <motion.div
                  key={ev.id}
                  ref={isSelected ? selectedRef : undefined}
                  data-testid="script-event-item"
                  data-event-id={ev.id}
                  data-selected={isSelected}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...MOTION_BASE, delay: Math.min(index * 0.03, 0.15) }}
                  onClick={() => handleSelect(ev)}
                  className={cn(
                    'group relative rounded-[10px] border bg-bg-surface p-4 cursor-pointer transition-colors',
                    isSelected
                      ? 'border-accent ring-2 ring-accent/30 shadow-[var(--shadow-elevated)]'
                      : 'border-border/60 hover:border-accent/40 hover:bg-bg-elevated/50',
                  )}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[10px]"
                    style={{ backgroundColor: ev.color ?? track.color }}
                  />

                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-text-primary truncate">
                        {ev.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {displayTime}
                          {duration && ` · ${duration}`}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          <span
                            className="h-2 w-2 rounded-full mr-1"
                            style={{ backgroundColor: track.color }}
                          />
                          {track.name}
                        </Badge>
                        <Badge variant="status" className="text-[10px]">
                          <StatusDot status={ev.status} />
                          {ev.dateType === 'relative' ? t('timeline.relativeBadge') : t(status.labelKey)}
                        </Badge>
                      </div>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(ev);
                          }}
                          className="text-xs text-accent hover:underline"
                        >
                          {t('script.locateInTimeline')}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">{t('script.locateInTimelineHint')}</TooltipContent>
                    </Tooltip>
                  </div>

                  {ev.description && (
                    <p className="text-sm text-text-secondary/90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {ev.description}
                    </p>
                  )}

                  {(associatedCharacters.length > 0 || location) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      {associatedCharacters.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary">
                          <Users className="h-3 w-3" />
                          {associatedCharacters.map((c) => c.name).join(', ')}
                        </div>
                      )}
                      {location && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary">
                          <MapPin className="h-3 w-3" />
                          {location.name}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
