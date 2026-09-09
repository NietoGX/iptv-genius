import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChannelCategory } from '../../db';
import { useChannelCategories } from '../../queries/useChannels';
import { useFavoriteCategories, useToggleFavoriteCategory } from '../../queries/useFavorites';
import { useUiStore } from '../../state/useUiStore';
import { useFocusRing } from '../../hooks/useFocusRing';
import { focusRingStyle } from '../../theme/focus';

const ROW_HEIGHT = 44;

interface CategoryRowProps {
  category: ChannelCategory;
  isActive: boolean;
  isFavorite: boolean;
  autoFocus?: boolean;
  onOpen: (groupTitle: string | null) => void;
  onToggleFavorite: (groupTitle: string | null, isFavorite: boolean) => void;
}

const CategoryRow = memo(function CategoryRow({
  category,
  isActive,
  isFavorite,
  autoFocus,
  onOpen,
  onToggleFavorite,
}: CategoryRowProps) {
  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <Pressable
        hasTVPreferredFocus={autoFocus}
        style={({ focused }: { focused: boolean }) => [styles.name, focused && styles.focused]}
        onPress={() => onOpen(category.groupTitle)}
      >
        <Text style={styles.nameText} numberOfLines={1}>
          {category.groupTitle ?? 'Sin categoría'}
        </Text>
        <Text style={styles.count}>{category.count}</Text>
      </Pressable>
      <Pressable
        style={({ focused }: { focused: boolean }) => [styles.favButton, focused && styles.focused]}
        onPress={() => onToggleFavorite(category.groupTitle, isFavorite)}
      >
        <Text style={[styles.favIcon, isFavorite && styles.favIconActive]}>{isFavorite ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
});

interface FolderColumnProps {
  sourceId: number;
}

export function FolderColumn({ sourceId }: FolderColumnProps) {
  const selectedCategory = useUiStore((s) => s.selectedCategory);
  const openCategory = useUiStore((s) => s.openCategory);
  const categories = useChannelCategories(sourceId);
  const favoriteCategories = useFavoriteCategories(sourceId);
  const toggleFavoriteCategory = useToggleFavoriteCategory(sourceId);
  const [search, setSearch] = useState('');
  const { isFocused: searchFocused, focusHandlers: searchFocusHandlers } = useFocusRing();

  const favoriteSet = useMemo(
    () => new Set((favoriteCategories.data ?? []).map((f) => f.groupTitle)),
    [favoriteCategories.data]
  );

  const items = useMemo(() => {
    const all = categories.data ?? [];
    const filtered = search.trim()
      ? all.filter((c) => (c.groupTitle ?? 'Sin categoría').toLowerCase().includes(search.trim().toLowerCase()))
      : all;
    const favorited = filtered.filter((c) => favoriteSet.has(c.groupTitle));
    const rest = filtered.filter((c) => !favoriteSet.has(c.groupTitle));
    return [...favorited, ...rest];
  }, [categories.data, search, favoriteSet]);

  function handleToggleFavorite(groupTitle: string | null, isFavorite: boolean): void {
    toggleFavoriteCategory.mutate({ groupTitle, isFavorite });
  }

  return (
    <View style={styles.column}>
      <Text style={styles.title}>Carpetas</Text>
      <TextInput
        style={[styles.search, searchFocused && styles.searchFocused]}
        placeholder="Buscar carpetas…"
        placeholderTextColor="#777"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...searchFocusHandlers}
      />
      {categories.isLoading && <ActivityIndicator color="#fff" style={styles.loading} />}
      {!categories.isLoading && items.length === 0 && (
        <Text style={styles.empty}>{search.trim() ? 'Sin resultados.' : 'Esta lista no tiene canales todavía.'}</Text>
      )}
      {!categories.isLoading && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.groupTitle)}
          getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          renderItem={({ item, index }) => (
            <CategoryRow
              category={item}
              isActive={item.groupTitle === selectedCategory}
              isFavorite={favoriteSet.has(item.groupTitle)}
              autoFocus={index === 0}
              onOpen={openCategory}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: 260, backgroundColor: '#101010', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#2a2a2a' },
  title: { color: '#888', fontSize: 12, textTransform: 'uppercase', padding: 10, paddingBottom: 4 },
  search: {
    color: '#fff',
    backgroundColor: '#222',
    marginHorizontal: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchFocused: focusRingStyle,
  loading: { marginTop: 20 },
  empty: { color: '#888', textAlign: 'center', marginTop: 20, paddingHorizontal: 12, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingLeft: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  rowActive: { backgroundColor: '#1c2f2b' },
  name: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '100%', paddingRight: 6, borderRadius: 4 },
  nameText: { color: '#fff', fontSize: 14, flexShrink: 1 },
  count: { color: '#777', fontSize: 12, marginLeft: 6 },
  favButton: { padding: 10, borderRadius: 4 },
  favIcon: { color: '#666', fontSize: 16 },
  favIconActive: { color: '#e0c34a' },
  focused: { backgroundColor: '#333', ...focusRingStyle },
});
