import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoPlayer } from '../player/VideoPlayer';
import { focusRingStyle } from '../../theme/focus';
import { FolderColumn } from '../channels/FolderColumn';
import { ChannelColumn } from '../channels/ChannelColumn';
import { EpgSearchPanel } from '../epg/EpgSearchPanel';
import { useUiStore } from '../../state/useUiStore';
import { useSources } from '../../queries/useSources';
import { useChannelsByCategory } from '../../queries/useChannels';
import { useFavorites } from '../../queries/useFavorites';

export function BrowseScreen() {
  const { activeSourceId, activeIsFavorites, selectedCategory, nowPlaying, closeSource } = useUiStore();
  const { data: sources } = useSources();
  const activeSource = sources?.find((s) => s.id === activeSourceId) ?? null;
  const [guideMode, setGuideMode] = useState(false);

  const categoryChannels = useChannelsByCategory(!activeIsFavorites ? activeSourceId : null, selectedCategory);
  const favorites = useFavorites();

  const title = activeIsFavorites ? 'Favoritos' : (activeSource?.name ?? 'Cargando…');

  // Handled here (not in the app-level BackHandler) so back exits guide mode
  // first, only falling through to closeSource once the guide is already closed.
  useEffect(() => {
    if (!guideMode) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setGuideMode(false);
      return true;
    });
    return () => subscription.remove();
  }, [guideMode]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ focused }: { focused: boolean }) => [styles.backButton, focused && styles.focused]}
          onPress={closeSource}
        >
          <Text style={styles.backText}>← Cambiar lista</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!activeIsFavorites && activeSourceId !== null && (
          <Pressable
            style={({ focused }: { focused: boolean }) => [
              styles.guideToggle,
              guideMode && styles.guideToggleActive,
              focused && styles.focused,
            ]}
            onPress={() => setGuideMode((v) => !v)}
          >
            <Text style={styles.guideToggleText}>{guideMode ? '← Volver a canales' : '📅 Guía'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.playerContainer}>
        <VideoPlayer channel={nowPlaying} />
      </View>

      <View style={styles.body}>
        {guideMode && activeSourceId !== null ? (
          <EpgSearchPanel sourceId={activeSourceId} />
        ) : activeIsFavorites ? (
          <ChannelColumn
            channels={favorites.data ?? []}
            isLoading={favorites.isLoading}
            emptyMessage="No tienes favoritos todavía."
            searchPlaceholder="Buscar en favoritos…"
            autoFocusFirstItem
          />
        ) : (
          activeSourceId !== null && (
            <View style={styles.bodyRow}>
              <FolderColumn sourceId={activeSourceId} />
              <ChannelColumn
                channels={categoryChannels.data ?? []}
                isLoading={categoryChannels.isLoading}
                emptyMessage="Esta categoría está vacía."
                placeholderMessage={selectedCategory === undefined ? 'Selecciona una carpeta' : undefined}
                searchPlaceholder="Buscar canales…"
              />
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  backButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  backText: { color: '#ccc', fontSize: 14 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  guideToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#222' },
  guideToggleActive: { backgroundColor: '#2a4a3f' },
  guideToggleText: { color: '#fff', fontSize: 13 },
  focused: { backgroundColor: '#333', ...focusRingStyle },
  playerContainer: { height: 320 },
  body: { flex: 1 },
  bodyRow: { flex: 1, flexDirection: 'row' },
});
