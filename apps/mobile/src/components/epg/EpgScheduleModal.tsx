import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EpgEntry } from '@iptv-genius/core/src/portable';
import { useUiStore } from '../../state/useUiStore';
import { useChannelSchedule } from '../../queries/useEpg';
import { focusRingStyle } from '../../theme/focus';

const PIXELS_PER_MINUTE = 1.6;
const MIN_BLOCK_HEIGHT = 56;
const MAX_BLOCK_HEIGHT = 260;
/** Gap rendered between items via marginBottom — also fed into the
 * cumulative height math below so the "now" line still lands correctly. */
const ITEM_GAP = 10;

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatDay(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function isToday(ts: number): boolean {
  return new Date(ts * 1000).toDateString() === new Date().toDateString();
}

function blockHeight(entry: EpgEntry): number {
  const minutes = (entry.stopTs - entry.startTs) / 60;
  return Math.min(MAX_BLOCK_HEIGHT, Math.max(MIN_BLOCK_HEIGHT, Math.round(minutes * PIXELS_PER_MINUTE)));
}

interface DayGroup {
  label: string;
  today: boolean;
  items: EpgEntry[];
}

function groupByDay(entries: EpgEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const label = formatDay(entry.startTs);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, today: isToday(entry.startTs), items: [entry] });
  }
  return groups;
}

function TimelineDay({ group }: { group: DayGroup }) {
  const nowTs = Date.now() / 1000;

  let cumulativeHeight = 0;
  let nowOffset: number | null = null;
  const rows = group.items.map((entry) => {
    const height = blockHeight(entry);
    const current = group.today && entry.startTs <= nowTs && entry.stopTs > nowTs;
    if (current) {
      const fraction = (nowTs - entry.startTs) / (entry.stopTs - entry.startTs);
      nowOffset = cumulativeHeight + fraction * height;
    }
    cumulativeHeight += height + ITEM_GAP;
    return { entry, height, current };
  });
  const trackHeight = Math.max(0, cumulativeHeight - ITEM_GAP);

  return (
    <View style={styles.day}>
      <Text style={styles.dayLabel}>
        {group.label}
        {group.today ? ' · Hoy' : ''}
      </Text>
      <View style={[styles.track, { height: trackHeight }]}>
        {rows.map(({ entry, height, current }, index) => (
          <View key={index} style={[styles.item, current && styles.itemCurrent, { height, marginBottom: ITEM_GAP }]}>
            <View style={styles.itemTime}>
              <Text style={styles.itemDate}>{formatShortDate(entry.startTs)}</Text>
              <Text style={styles.itemHours}>
                {formatTime(entry.startTs)}–{formatTime(entry.stopTs)}
              </Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {entry.title}
              </Text>
              {height >= 90 && entry.description ? (
                <Text style={styles.itemDesc} numberOfLines={3}>
                  {entry.description}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        {nowOffset !== null && (
          <View style={[styles.nowLine, { top: nowOffset }]}>
            <Text style={styles.nowLineLabel}>
              {new Date(nowTs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function EpgScheduleModal() {
  const channel = useUiStore((s) => s.scheduleChannel);
  const closeSchedule = useUiStore((s) => s.closeSchedule);
  const { data, isLoading } = useChannelSchedule(channel?.id ?? null);
  const groups = useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <Modal visible={!!channel} transparent animationType="fade" onRequestClose={closeSchedule}>
      {/* Not focusable: TV has no "tap outside to dismiss" gesture, and
          leaving this in the D-pad tab order would let focus land on an
          invisible full-screen element. Dismissal is the ✕ button or hardware back. */}
      <Pressable style={styles.overlay} onPress={closeSchedule} focusable={false}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()} focusable={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {channel?.name}
            </Text>
            <Pressable
              hasTVPreferredFocus
              onPress={closeSchedule}
              hitSlop={10}
              style={({ focused }: { focused: boolean }) => [styles.closeButton, focused && styles.closeFocused]}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {isLoading && <Text style={styles.empty}>Cargando…</Text>}
            {!isLoading && groups.length === 0 && (
              <Text style={styles.empty}>No hay datos de programación para este canal.</Text>
            )}
            {!isLoading && groups.map((group, index) => <TimelineDay key={index} group={group} />)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', height: '85%', backgroundColor: '#181818', borderRadius: 10, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 12 },
  closeButton: { padding: 6, borderRadius: 4 },
  closeFocused: focusRingStyle,
  close: { color: '#ccc', fontSize: 18 },
  body: { flex: 1 },
  bodyContent: { padding: 14 },
  empty: { color: '#888', textAlign: 'center', marginTop: 30 },
  day: { marginBottom: 18 },
  dayLabel: { color: '#9aa', fontSize: 13, textTransform: 'capitalize', marginBottom: 8 },
  track: { position: 'relative' },
  item: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 6,
    padding: 8,
    overflow: 'hidden',
  },
  itemCurrent: { backgroundColor: '#1c2f2b', borderColor: '#4caf80', borderWidth: 1 },
  itemTime: { width: 90 },
  itemDate: { color: '#888', fontSize: 11 },
  itemHours: { color: '#ccc', fontSize: 12, marginTop: 2 },
  itemContent: { flex: 1, paddingLeft: 8 },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  itemDesc: { color: '#aaa', fontSize: 12, marginTop: 4 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#e05252' },
  nowLineLabel: {
    position: 'absolute',
    right: 0,
    top: -16,
    color: '#e05252',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
