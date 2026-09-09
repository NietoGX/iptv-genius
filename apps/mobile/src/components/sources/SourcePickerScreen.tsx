import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAddM3uSource, useAddXtreamSource, useRefreshSource, useRemoveSource, useSources } from '../../queries/useSources';
import { useUiStore } from '../../state/useUiStore';
import { useFocusRing } from '../../hooks/useFocusRing';
import { focusRingStyle } from '../../theme/focus';
import type { Source } from '@iptv-genius/core/src/portable';

type FormMode = 'm3u' | 'xtream' | null;

export function SourcePickerScreen() {
  const { data: sources, isLoading } = useSources();
  const addM3u = useAddM3uSource();
  const addXtream = useAddXtreamSource();
  const removeSource = useRemoveSource();
  const refreshSource = useRefreshSource();
  const { openSource, openFavorites } = useUiStore();

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<TextInput>(null);
  const urlInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const nameFocus = useFocusRing();
  const urlFocus = useFocusRing();
  const usernameFocus = useFocusRing();
  const passwordFocus = useFocusRing();

  function resetForm(): void {
    setFormMode(null);
    setName('');
    setUrl('');
    setUsername('');
    setPassword('');
    setFormError(null);
  }

  // The on-screen-keyboard "Next"/"Done" action is a far more reliable way to
  // move between form fields than D-pad spatial search (which, empirically,
  // does not consistently land on the intended sibling between two stacked
  // TextInputs on this platform) — so typing through the form never requires
  // touching the D-pad at all.
  useEffect(() => {
    if (!formMode) return undefined;
    const timer = setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [formMode]);

  // Hardware back closes the form instead of falling through to the app
  // default (which, at this root screen, would exit the app entirely).
  useEffect(() => {
    if (!formMode) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      resetForm();
      return true;
    });
    return () => subscription.remove();
  }, [formMode]);

  function confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert('', message, [
        { text: 'No', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sí', onPress: () => resolve(true) },
      ]);
    });
  }

  async function handleSubmit(): Promise<void> {
    setFormError(null);
    try {
      if (formMode === 'm3u') {
        const result = await addM3u.mutateAsync({ name, url });
        if (result.xtreamSuggestion) {
          const { baseUrl, username: u, password: p } = result.xtreamSuggestion;
          const message = result.source
            ? `Esta lista parece ser una cuenta Xtream Codes (${baseUrl}).\n¿Quieres importarla también como cuenta Xtream para tener VOD, series y EPG?`
            : `Este enlace es de una cuenta Xtream Codes (${baseUrl}), no una lista M3U estática.\n¿Quieres importarlo como cuenta Xtream?`;
          const wantsXtream = await confirm(message);
          if (wantsXtream) {
            const xtreamName = result.source ? `${name} (Xtream)` : name;
            const xtreamSource = await addXtream.mutateAsync({ name: xtreamName, baseUrl, username: u, password: p });
            resetForm();
            openSource(xtreamSource.id);
            return;
          }
        }
        if (result.source) {
          resetForm();
          openSource(result.source.id);
          return;
        }
      } else if (formMode === 'xtream') {
        const source = await addXtream.mutateAsync({ name, baseUrl: url, username, password });
        resetForm();
        openSource(source.id);
        return;
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleRemove(source: Source): void {
    Alert.alert('', `¿Eliminar "${source.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeSource.mutate(source.id) },
    ]);
  }

  const busy = addM3u.isPending || addXtream.isPending;
  const hasSources = (sources ?? []).length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>IPTV Genius</Text>
        <Text style={styles.subtitle}>Elige una lista para empezar a ver</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          hasTVPreferredFocus={!hasSources}
          style={({ focused }: { focused: boolean }) => [styles.actionButton, focused && styles.focused]}
          onPress={() => setFormMode(formMode === 'm3u' ? null : 'm3u')}
        >
          <Text style={styles.actionText}>+ M3U</Text>
        </Pressable>
        <Pressable
          style={({ focused }: { focused: boolean }) => [styles.actionButton, focused && styles.focused]}
          onPress={() => setFormMode(formMode === 'xtream' ? null : 'xtream')}
        >
          <Text style={styles.actionText}>+ Xtream</Text>
        </Pressable>
      </View>

      {formMode && (
        <View style={styles.form}>
          <TextInput
            ref={nameInputRef}
            style={[styles.input, nameFocus.isFocused && styles.inputFocused]}
            placeholder="Nombre"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => urlInputRef.current?.focus()}
            {...nameFocus.focusHandlers}
          />
          {formMode === 'm3u' ? (
            <TextInput
              ref={urlInputRef}
              style={[styles.input, urlFocus.isFocused && styles.inputFocused]}
              placeholder="URL del .m3u/.m3u8"
              placeholderTextColor="#777"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              {...urlFocus.focusHandlers}
            />
          ) : (
            <>
              <TextInput
                ref={urlInputRef}
                style={[styles.input, urlFocus.isFocused && styles.inputFocused]}
                placeholder="http://servidor:puerto"
                placeholderTextColor="#777"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => usernameInputRef.current?.focus()}
                {...urlFocus.focusHandlers}
              />
              <TextInput
                ref={usernameInputRef}
                style={[styles.input, usernameFocus.isFocused && styles.inputFocused]}
                placeholder="Usuario"
                placeholderTextColor="#777"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                {...usernameFocus.focusHandlers}
              />
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, passwordFocus.isFocused && styles.inputFocused]}
                placeholder="Contraseña"
                placeholderTextColor="#777"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                {...passwordFocus.focusHandlers}
              />
            </>
          )}
          {formError && <Text style={styles.formError}>{formError}</Text>}
          <View style={styles.formActions}>
            <Pressable
              style={({ focused }: { focused: boolean }) => [styles.submitButton, focused && styles.focused]}
              onPress={handleSubmit}
              disabled={busy}
            >
              <Text style={styles.actionText}>{busy ? 'Añadiendo…' : 'Añadir'}</Text>
            </Pressable>
            <Pressable
              style={({ focused }: { focused: boolean }) => [styles.cancelButton, focused && styles.focused]}
              onPress={resetForm}
            >
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={({ focused }: { focused: boolean }) => [styles.favoritesButton, focused && styles.focused]}
        onPress={openFavorites}
      >
        <Text style={styles.favoritesText}>★ Favoritos</Text>
      </Pressable>

      {isLoading && <ActivityIndicator color="#fff" style={styles.loading} />}

      {!isLoading && (sources ?? []).length === 0 && (
        <Text style={styles.empty}>Añade tu primera lista M3U o cuenta Xtream arriba.</Text>
      )}

      <ScrollView style={styles.list}>
        {(sources ?? []).map((item, index) => (
          <View key={item.id} style={styles.sourceRow}>
            <Pressable
              hasTVPreferredFocus={index === 0}
              style={({ focused }: { focused: boolean }) => [styles.sourceMain, focused && styles.focused]}
              onPress={() => openSource(item.id)}
            >
              <Text style={styles.sourceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sourceTag}>{item.type}</Text>
            </Pressable>
            <Pressable
              style={({ focused }: { focused: boolean }) => [styles.iconButton, focused && styles.focused]}
              onPress={() => refreshSource.mutate(item.id)}
            >
              <Text style={styles.iconText}>⟳</Text>
            </Pressable>
            <Pressable
              style={({ focused }: { focused: boolean }) => [styles.iconButton, focused && styles.focused]}
              onPress={() => handleRemove(item)}
            >
              <Text style={styles.iconText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header: { marginBottom: 16 },
  h1: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionButton: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  form: { backgroundColor: '#161616', borderRadius: 8, padding: 12, marginBottom: 12, gap: 8 },
  input: { color: '#fff', backgroundColor: '#222', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  inputFocused: focusRingStyle,
  formError: { color: '#e05252', fontSize: 13 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  submitButton: { backgroundColor: '#2a4a3f', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  cancelButton: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  favoritesButton: { backgroundColor: '#1a1a1a', borderRadius: 6, padding: 12, marginBottom: 12 },
  favoritesText: { color: '#e0c34a', fontSize: 15, fontWeight: '600' },
  loading: { marginTop: 20 },
  list: { flex: 1 },
  empty: { color: '#888', textAlign: 'center', marginTop: 30 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sourceMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sourceName: { color: '#fff', fontSize: 15, flexShrink: 1 },
  sourceTag: { color: '#888', fontSize: 11, textTransform: 'uppercase', marginLeft: 8 },
  iconButton: { padding: 10, marginLeft: 6, borderRadius: 6 },
  iconText: { color: '#aaa', fontSize: 16 },
  focused: { backgroundColor: '#3a3a3a', ...focusRingStyle },
});
