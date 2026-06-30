export function ProgressBar({ value }: { value: number }) {
  const pct = `${Math.min(1, Math.max(0, value)) * 100}%`;
  return (
    <div className="bg-surface rounded-[2px] h-[3px] overflow-hidden">
      <div
        className="h-full bg-tint rounded-[2px] transition-[width] duration-200"
        style={{ width: pct }}
      />
    </div>
  );
}
