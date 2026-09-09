import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Channel } from '@iptv-genius/core/src/portable';
import { useNowNext } from '../../queries/useEpg';
import { useUiStore } from '../../state/useUiStore';
import { focusRingStyle } from '../../theme/focus';

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function EpgLine({ channel }: { channel: Channel }) {
  const { data } = useNowNext(channel.id);
  const openSchedule = useUiStore((s) => s.openSchedule);
  if (!data?.now) return null;

  const { now, next } = data;
  const nowSec = Date.now() / 1000;
  const progress = Math.min(100, Math.max(0, ((nowSec - now.startTs) / (now.stopTs - now.startTs)) * 100));

  return (
    <Pressable
      onPress={() => openSchedule(channel)}
      style={({ focused }: { focused: boolean }) => [styles.epgLine, focused && styles.focused]}
    >
      <Text style={styles.epgTitle} numberOfLines={1}>
        {now.title}
        {next ? `  ·  después: ${next.title} (${formatTime(next.startTs)})` : ''}
      </Text>
      <View style={styles.epgBar}>
        <View style={[styles.epgBarFill, { width: `${progress}%` }]} />
      </View>
    </Pressable>
  );
}

export interface ChannelRowProps {
  channel: Channel;
  isFavorite: boolean;
  isActive: boolean;
  autoFocus?: boolean;
  onPlay: (channel: Channel) => void;
  onToggleFavorite: (channelId: number, isFavorite: boolean) => void;
}

export const ChannelRow = memo(function ChannelRow({
  channel,
  isFavorite,
  isActive,
  autoFocus,
  onPlay,
  onToggleFavorite,
}: ChannelRowProps) {
  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      {channel.logoUrl ? (
        <Image source={{ uri: channel.logoUrl }} style={styles.logo} />
      ) : (
        <View style={styles.logo} />
      )}
      <Pressable
        hasTVPreferredFocus={autoFocus}
        style={({ focused }: { focused: boolean }) => [styles.info, focused && styles.focused]}
        onPress={() => onPlay(channel)}
      >
        <Text style={styles.name} numberOfLines={1}>
          {channel.name}
        </Text>
        {channel.kind === 'live' && <EpgLine channel={channel} />}
      </Pressable>
      <Pressable
        style={({ focused }: { focused: boolean }) => [styles.favButton, focused && styles.focused]}
        onPress={() => onToggleFavorite(channel.id, isFavorite)}
      >
        <Text style={[styles.favIcon, isFavorite && styles.favIconActive]}>{isFavorite ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
  },
  rowActive: { backgroundColor: '#1c2f2b' },
  logo: { width: 32, height: 32, borderRadius: 4, backgroundColor: '#222', marginRight: 10 },
  info: { flex: 1, paddingVertical: 6, borderRadius: 4 },
  name: { color: '#fff', fontSize: 15 },
  epgLine: { marginTop: 3, borderRadius: 3 },
  epgTitle: { color: '#9aa', fontSize: 12 },
  epgBar: { height: 3, backgroundColor: '#333', borderRadius: 2, marginTop: 3, overflow: 'hidden' },
  epgBarFill: { height: '100%', backgroundColor: '#4caf80' },
  favButton: { padding: 10, borderRadius: 4 },
  favIcon: { color: '#666', fontSize: 20 },
  favIconActive: { color: '#e0c34a' },
  focused: { backgroundColor: '#333', ...focusRingStyle },
});
