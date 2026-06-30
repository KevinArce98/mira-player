import { ImageOff } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';

interface PosterCardProps {
  title: string;
  posterUrl?: string | null;
  subtitle?: string | null;
  progress?: number;
  width?: number;
  aspectRatio?: number;
  onPress?: () => void;
}

export function PosterCard({
  title,
  posterUrl,
  subtitle,
  progress,
  width,
  aspectRatio = 2 / 3,
  onPress,
}: PosterCardProps) {
  return (
    <div
      style={{ width: width ? `${width}px` : '100%', cursor: onPress ? 'pointer' : 'default' }}
      onClick={onPress}
      className="flex flex-col gap-1">
      <div
        style={{ aspectRatio: `${1} / ${1 / aspectRatio}` }}
        className="bg-surface border border-border rounded-md overflow-hidden relative flex items-center justify-center">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover block"
            loading="lazy"
            decoding="async"
            width={90}
            height={135}
          />
        ) : (
          <ImageOff size={24} className="text-muted" />
        )}
        {progress != null && progress > 0 ? (
          <div className="absolute bottom-0 left-0 right-0 px-1 pb-1">
            <ProgressBar value={progress} />
          </div>
        ) : null}
      </div>
      <p className="text-xs font-medium leading-tight text-fg line-clamp-2">{title}</p>
      {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
    </div>
  );
}
