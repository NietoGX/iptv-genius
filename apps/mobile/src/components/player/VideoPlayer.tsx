import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Video, { type OnBufferData, type OnVideoErrorData } from 'react-native-video';
import type { Channel } from '@iptv-genius/core/src/portable';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'buffering' | 'error';

interface VideoPlayerProps {
  channel: Channel | null;
}

export function VideoPlayer({ channel }: VideoPlayerProps) {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(channel ? 'loading' : 'idle');
    setErrorMessage(null);
  }, [channel?.id]);

  return (
    <View style={styles.container}>
      {channel ? (
        <Video
          key={channel.id}
          source={{ uri: channel.streamUrl }}
          style={styles.video}
          resizeMode="contain"
          onLoadStart={() => setStatus('loading')}
          onLoad={() => setStatus('playing')}
          onBuffer={({ isBuffering }: OnBufferData) => setStatus(isBuffering ? 'buffering' : 'playing')}
          onError={(e: OnVideoErrorData) => {
            setStatus('error');
            setErrorMessage(e.error?.errorString ?? e.error?.localizedDescription ?? 'Error desconocido');
          }}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Selecciona un canal</Text>
        </View>
      )}

      {channel && status === 'loading' && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {channel && status === 'buffering' && (
        <View style={styles.overlayCorner}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      )}

      {channel && status === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>No se pudo reproducir «{channel.name}»</Text>
          {errorMessage && <Text style={styles.errorDetail}>{errorMessage}</Text>}
        </View>
      )}

      {channel && (
        <View style={styles.titleBar}>
          <Text style={styles.titleText} numberOfLines={1}>
            {channel.name}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#666', fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
  },
  overlayCorner: { position: 'absolute', top: 12, right: 12 },
  errorText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  errorDetail: { color: '#ccc', fontSize: 12, marginTop: 6, textAlign: 'center' },
  titleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  titleText: { color: '#fff', fontSize: 14 },
});
