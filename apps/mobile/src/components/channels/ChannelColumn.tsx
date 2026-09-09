import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Channel } from '@iptv-genius/core/src/portable';
import { ChannelRow } from './ChannelRow';
import { useFavorites, useToggleFavorite } from '../../queries/useFavorites';
import { useUiStore } from '../../state/useUiStore';
import { useFocusRing } from '../../hooks/useFocusRing';
import { focusRingStyle } from '../../theme/focus';

const ROW_HEIGHT = 64;

interface ChannelColumnProps {
  channels: Channel[];
  isLoading: boolean;
  emptyMessage: string;
  placeholderMessage?: string;
  searchPlaceholder?: string;
  /** Whether this column is the primary content of its screen (e.g. the
   * favorites list) and should grab initial D-pad focus on its first row.
   * False when a sibling FolderColumn should get initial focus instead. */
  autoFocusFirstItem?: boolean;
}

export function ChannelColumn({
  channels,
  isLoading,
  emptyMessage,
  placeholderMessage,
  searchPlaceholder = 'Buscar canales…',
  autoFocusFirstItem = false,
}: ChannelColumnProps) {
  const nowPlaying = useUiStore((s) => s.nowPlaying);
  const play = useUiStore((s) => s.play);
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const [search, setSearch] = useState('');
  const { isFocused: searchFocused, focusHandlers: searchFocusHandlers } = useFocusRing();

  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((c) => c.id)), [favorites.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.trim().toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, search]);

  function handleToggleFavorite(channelId: number, isFavorite: boolean): void {
    toggleFavorite.mutate({ channelId, isFavorite });
  }

  if (placeholderMessage) {
    return (
      <View style={styles.column}>
        <Text style={styles.empty}>{placeholderMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.column}>
      <TextInput
        style={[styles.search, searchFocused && styles.searchFocused]}
        placeholder={searchPlaceholder}
        placeholderTextColor="#777"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...searchFocusHandlers}
      />
      {isLoading && <ActivityIndicator color="#fff" style={styles.loading} />}
      {!isLoading && filtered.length === 0 && (
        <Text style={styles.empty}>{search.trim() ? 'Sin resultados.' : emptyMessage}</Text>
      )}
      {!isLoading && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          renderItem={({ item, index }) => (
            <ChannelRow
              channel={item}
              isFavorite={favoriteIds.has(item.id)}
              isActive={nowPlaying?.id === item.id}
              autoFocus={autoFocusFirstItem && index === 0}
              onPlay={play}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          windowSize={7}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, backgroundColor: '#141414' },
  search: {
    color: '#fff',
    backgroundColor: '#222',
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  searchFocused: focusRingStyle,
  loading: { marginTop: 20 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20, paddingHorizontal: 16 },
});
