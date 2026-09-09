/**
 * IPTV Genius — Android TV
 *
 * @format
 */

import { useEffect } from 'react';
import { BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourcePickerScreen } from './src/components/sources/SourcePickerScreen';
import { BrowseScreen } from './src/components/browse/BrowseScreen';
import { EpgScheduleModal } from './src/components/epg/EpgScheduleModal';
import { useUiStore } from './src/state/useUiStore';

const queryClient = new QueryClient();

function AppContent() {
  const activeSourceId = useUiStore((s) => s.activeSourceId);
  const activeIsFavorites = useUiStore((s) => s.activeIsFavorites);
  const closeSource = useUiStore((s) => s.closeSource);
  const isBrowsing = activeSourceId !== null || activeIsFavorites;

  useEffect(() => {
    if (!isBrowsing) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSource();
      return true;
    });
    return () => subscription.remove();
  }, [isBrowsing, closeSource]);

  return (
    <View style={styles.container}>
      {isBrowsing ? <BrowseScreen /> : <SourcePickerScreen />}
      <EpgScheduleModal />
    </View>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
});

export default App;
