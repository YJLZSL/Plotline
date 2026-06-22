export function StatusBar({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <footer className="h-8 flex items-center justify-between px-4 border-t border-border bg-bg-surface text-xs text-text-secondary flex-shrink-0">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </footer>
  );
}
