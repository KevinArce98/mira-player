import { ImageOff, Tv } from 'lucide-react';
import { useNowNext } from '@/hooks/data/use-epg';
import type { Contenido } from '@/types/models';

export function ChannelRow({
  channel,
  onPress,
}: {
  channel: Contenido;
  onPress: () => void;
}) {
  const epg = useNowNext(channel.stream_id);
  const now = epg.data?.now;

  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3 px-4 py-3 w-full text-left transition-colors border-0 border-b border-border bg-transparent cursor-pointer hover:bg-surface">
      <div className="w-11 h-11 rounded-md bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
        {channel.poster_url ? (
          <img
            src={channel.poster_url}
            alt={channel.nombre}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Tv size={20} className="text-muted" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold truncate text-fg">{channel.nombre}</p>
        <p className="text-xs truncate text-muted">
          {now ? now.title : (channel.categoria ?? '')}
        </p>
      </div>
    </button>
  );
}
