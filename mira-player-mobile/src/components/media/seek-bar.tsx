import { useEffect, useRef, useState } from 'react';
import { GestureResponderHandlers, LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function SeekBar({
  position,
  onSeek,
  onScrub,
  onScrubStart,
  onScrubEnd,
}: {
  position: number;
  onSeek: (fraction: number) => void;
  onScrub?: (fraction: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}) {
  const theme = useTheme();
  const widthRef = useRef(0);
  const pageXRef = useRef(0);
  const viewRef = useRef<View>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [handlers, setHandlers] = useState<GestureResponderHandlers | null>(null);

  const callbacks = useRef({ onSeek, onScrub, onScrubStart, onScrubEnd });
  useEffect(() => {
    callbacks.current = { onSeek, onScrub, onScrubStart, onScrubEnd };
  });

  useEffect(() => {
    const fractionFromX = (absX: number) => {
      const w = widthRef.current || 1;
      return Math.max(0, Math.min(1, (absX - pageXRef.current) / w));
    };
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setScrubbing(true);
        callbacks.current.onScrubStart?.();
        const f = fractionFromX(e.nativeEvent.pageX);
        setScrubValue(f);
        callbacks.current.onScrub?.(f);
      },
      onPanResponderMove: (e) => {
        const f = fractionFromX(e.nativeEvent.pageX);
        setScrubValue(f);
        callbacks.current.onScrub?.(f);
      },
      onPanResponderRelease: (e) => {
        const f = fractionFromX(e.nativeEvent.pageX);
        callbacks.current.onSeek(f);
        setScrubbing(false);
        callbacks.current.onScrubEnd?.();
      },
      onPanResponderTerminate: () => {
        setScrubbing(false);
        callbacks.current.onScrubEnd?.();
      },
    });
    setHandlers(responder.panHandlers);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    viewRef.current?.measure((_x, _y, _w, _h, px) => {
      pageXRef.current = px;
    });
  };

  const value = Math.max(0, Math.min(1, scrubbing ? scrubValue : position));

  return (
    <View ref={viewRef} onLayout={onLayout} style={styles.hitArea} {...(handlers ?? {})}>
      <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <View style={[styles.fill, { width: `${value * 100}%`, backgroundColor: theme.tint }]} />
      </View>
      <View
        style={[
          styles.thumb,
          { left: `${value * 100}%`, backgroundColor: theme.tint, transform: [{ scale: scrubbing ? 1.3 : 1 }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: { height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
});
