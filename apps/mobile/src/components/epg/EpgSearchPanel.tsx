import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEpgSearch, useHasGuideData } from '../../queries/useEpg';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUiStore } from '../../state/useUiStore';
import { useFocusRing } from '../../hooks/useFocusRing';
import { focusRingStyle } from '../../theme/focus';

function formatDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString([], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface EpgSearchPanelProps {
  sourceId: number;
}

export function EpgSearchPanel({ sourceId }: EpgSearchPanelProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const { data, isLoading } = useEpgSearch(sourceId, debounced);
  const { data: hasGuideData, isLoading: isCheckingGuide } = useHasGuideData(sourceId);
  const play = useUiStore((s) => s.play);
  const { isFocused: searchFocused, focusHandlers: searchFocusHandlers } = useFocusRing();

  const results = data ?? [];
  const isSearching = debounced.trim().length > 0;

  return (
    <View style={styles.column}>
      <TextInput
        style={[styles.search, searchFocused && styles.searchFocused]}
        placeholder="Buscar en la guía (ej. fútbol, noticias)…"
        placeholderTextColor="#777"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
        {...searchFocusHandlers}
      />

      {!isSearching && !isCheckingGuide && hasGuideData === false && (
        <Text style={styles.empty}>
          Todavía no se ha descargado la guía completa de esta lista. Actualízala desde "Cambiar lista", o
          espera unos segundos si acabas de añadirla.
        </Text>
      )}
      {!isSearching && (hasGuideData !== false || isCheckingGuide) && (
        <Text style={styles.empty}>Escribe para buscar programas de hoy en adelante.</Text>
      )}
      {isSearching && isLoading && <ActivityIndicator color="#fff" style={styles.loading} />}
      {isSearching && !isLoading && results.length === 0 && hasGuideData === false && (
        <Text style={styles.empty}>
          Esta lista todavía no tiene guía descargada, así que no hay nada que buscar. Actualízala desde
          "Cambiar lista".
        </Text>
      )}
      {isSearching && !isLoading && results.length === 0 && hasGuideData !== false && (
        <Text style={styles.empty}>Sin resultados.</Text>
      )}

      {isSearching && !isLoading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.channel.id}-${index}`}
          renderItem={({ item: { channel, programme } }) => (
            <Pressable
              style={({ focused }: { focused: boolean }) => [styles.item, focused && styles.itemFocused]}
              onPress={() => play(channel)}
            >
              {channel.logoUrl ? (
                <Image source={{ uri: channel.logoUrl }} style={styles.logo} />
              ) : (
                <View style={styles.logo} />
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                  {programme.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {channel.name} · {formatDateTime(programme.startTs)}
                </Text>
              </View>
            </Pressable>
          )}
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
  item: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 6, marginHorizontal: 8 },
  itemFocused: { backgroundColor: '#333', ...focusRingStyle },
  logo: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#222', marginRight: 10 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 14 },
  meta: { color: '#888', fontSize: 12, marginTop: 2 },
});
