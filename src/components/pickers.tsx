/**
 * Month and time pickers — port of the reference app.js openMonthPicker()
 * and openTimePicker(), rendered as dialog bodies.
 */

import { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';
import { MONTHS } from '@/lib/dates';
import { Btn } from '@/components/ui';

/* ---------- month picker ---------- */

export function MonthPickerBody({
  currentKey,
  onPick,
  close,
}: {
  currentKey: string;
  onPick: (monthKey: string) => void;
  close: () => void;
}) {
  const [yy, setYy] = useState(Number(currentKey.slice(0, 4)));
  const [mm] = useState(Number(currentKey.slice(5, 7)) - 1);

  const pick = (i: number) => {
    close();
    onPick(`${yy}-${String(i + 1).padStart(2, '0')}`);
  };

  const rows: number[][] = [];
  for (let i = 0; i < 12; i += 3) rows.push([i, i + 1, i + 2]);

  return (
    <>
      <Text style={styles.dialogTitle}>Select month</Text>
      <View style={styles.mpYear}>
        <Pressable style={styles.mpNav} onPress={() => setYy((y) => y - 1)} accessibilityLabel="Previous year" accessibilityRole="button">
          <Text style={styles.mpNavText}>‹</Text>
        </Pressable>
        <Text style={styles.mpYr}>{yy}</Text>
        <Pressable style={styles.mpNav} onPress={() => setYy((y) => y + 1)} accessibilityLabel="Next year" accessibilityRole="button">
          <Text style={styles.mpNavText}>›</Text>
        </Pressable>
      </View>
      {rows.map((row, ri) => (
        <View key={row[0]} style={[styles.mpRow, ri === rows.length - 1 && styles.mpRowLast]}>
          {row.map((i) => {
            const sel = i === mm;
            return (
              <Pressable key={i} onPress={() => pick(i)} accessibilityRole="button" style={[styles.mpCell, sel && styles.mpCellSel]}>
                <Text style={[styles.mpCellText, sel && styles.mpCellTextSel]}>{MONTHS[i]}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.dialogActions}>
        <Btn variant="text" onPress={close}>
          Cancel
        </Btn>
      </View>
    </>
  );
}

/* ---------- time picker ---------- */

const DIAL = 236;
const RADIUS = 94;
const CENTER = DIAL / 2;
const NUM = 38;

export function TimePickerBody({
  initialMins,
  onPick,
  close,
}: {
  initialMins: number;
  onPick: (mins: number) => void;
  close: () => void;
}) {
  const [hour12, setHour12] = useState((Math.floor(initialMins / 60) % 12) || 12);
  const [minute, setMinute] = useState((Math.round((initialMins % 60) / 5) * 5) % 60);
  const [pm, setPm] = useState(Math.floor(initialMins / 60) >= 12);
  const [mode, setMode] = useState<'h' | 'm'>('h');

  const handDeg = mode === 'h' ? (hour12 % 12) * 30 : minute * 6;

  const tapNum = (i: number) => {
    if (mode === 'h') {
      setHour12(i === 0 ? 12 : i);
      setMode('m');
    } else {
      setMinute(i * 5);
    }
  };

  const nums = [];
  for (let i = 0; i < 12; i++) {
    const ang = ((i * 30 - 90) * Math.PI) / 180;
    const x = CENTER + RADIUS * Math.cos(ang);
    const y = CENTER + RADIUS * Math.sin(ang);
    const sel = mode === 'h' ? i === hour12 % 12 : minute === i * 5;
    nums.push(
      <Pressable
        key={i}
        onPress={() => tapNum(i)}
        accessibilityRole="button"
        style={[styles.tpNum, { left: x - NUM / 2, top: y - NUM / 2 }, sel && styles.tpNumSel]}>
        <Text style={[styles.tpNumText, sel && styles.tpNumTextSel]}>{mode === 'h' ? (i === 0 ? 12 : i) : String(i * 5).padStart(2, '0')}</Text>
      </Pressable>,
    );
  }

  return (
    <>
      <View style={styles.tpDisplay}>
        <Pressable onPress={() => setMode('h')} style={[styles.tpDispBtn, mode === 'h' && styles.tpDispSel]} accessibilityLabel="Hour" accessibilityRole="button">
          <Text style={[styles.tpDispText, mode === 'h' && styles.tpDispTextSel]}>{hour12}</Text>
        </Pressable>
        <Text style={styles.tpSep}>:</Text>
        <Pressable onPress={() => setMode('m')} style={[styles.tpDispBtn, mode === 'm' && styles.tpDispSel]} accessibilityLabel="Minutes" accessibilityRole="button">
          <Text style={[styles.tpDispText, mode === 'm' && styles.tpDispTextSel]}>{String(minute).padStart(2, '0')}</Text>
        </Pressable>
        <Text style={styles.tpMer}>{pm ? 'PM' : 'AM'}</Text>
      </View>
      <Text style={styles.tpCaption}>{mode === 'h' ? 'Select hour' : 'Select minutes'}</Text>
      <View style={styles.tpAmpm}>
        <Pressable onPress={() => setPm(false)} style={[styles.tpAmpmBtn, !pm && styles.tpAmpmSel]} accessibilityRole="button">
          <Text style={[styles.tpAmpmText, !pm && styles.tpAmpmTextSel]}>AM</Text>
        </Pressable>
        <Pressable onPress={() => setPm(true)} style={[styles.tpAmpmBtn, pm && styles.tpAmpmSel]} accessibilityRole="button">
          <Text style={[styles.tpAmpmText, pm && styles.tpAmpmTextSel]}>PM</Text>
        </Pressable>
      </View>
      <View style={styles.tpDial}>
        {/* Rotating container is full-dial sized so rotation happens around the dial center. */}
        <View style={[styles.tpHandWrap, { transform: [{ rotate: `${handDeg}deg` }] }]}>
          <View style={styles.tpHand}>
            <View style={styles.tpKnob} />
          </View>
        </View>
        <View style={styles.tpCenter} />
        {nums}
      </View>
      <View style={styles.tpActions}>
        <Btn variant="text" onPress={close}>
          Cancel
        </Btn>
        <Btn variant="text" onPress={() => onPick(((hour12 % 12) + (pm ? 12 : 0)) * 60 + minute)}>
          OK
        </Btn>
      </View>
    </>
  );
}

const DIALOG_WIDTH = Math.min(Dimensions.get('window').width - 56, 340);

const styles = StyleSheet.create({
  dialogTitle: { fontSize: 20.5, fontWeight: '800', color: C.text },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 16 },
  tpActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 14 },
  // ref .mp-year { margin: 10px 0 12px }
  mpYear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 },
  mpNav: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  mpNavText: { fontSize: 24, color: C.text2, fontWeight: '600' },
  mpYr: { fontSize: 17, fontWeight: '700', color: C.text },
  mpRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  mpRowLast: { marginBottom: 0 },
  mpCell: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  mpCellSel: { backgroundColor: C.primary },
  mpCellText: { fontSize: 14, fontWeight: '600', color: C.text2 },
  mpCellTextSel: { color: '#fff' },
  tpDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 2 },
  tpDispBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 14 },
  tpDispSel: { backgroundColor: C.primaryContainer },
  // ref .tp-display button { font-size: 34px; line-height: 1.15 }
  tpDispText: { fontSize: 34, fontWeight: '800', lineHeight: 39.1, color: C.text, fontVariant: ['tabular-nums'] },
  tpDispTextSel: { color: C.primary },
  tpSep: { fontSize: 30, fontWeight: '700', color: C.text3 },
  // ref .tp-display .mer { align-self: center } (display row is baseline-aligned)
  tpMer: { fontSize: 15, fontWeight: '700', color: C.text2, marginLeft: 8, alignSelf: 'center' },
  tpCaption: { textAlign: 'center', color: C.text3, fontSize: 12.5, marginTop: 8 },
  tpAmpm: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 10 },
  tpAmpmBtn: {
    width: 64,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.outline2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tpAmpmSel: { backgroundColor: C.primaryContainer, borderColor: 'transparent' },
  tpAmpmText: { fontSize: 14, fontWeight: '700', color: C.text2 },
  tpAmpmTextSel: { color: C.onPrimaryContainer },
  tpDial: {
    width: DIAL,
    height: DIAL,
    marginTop: 14,
    borderRadius: DIAL / 2,
    backgroundColor: C.tileBg,
    alignSelf: 'center',
  },
  tpHandWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DIAL,
    height: DIAL,
    alignItems: 'center',
  },
  tpHand: {
    width: 2.5,
    height: RADIUS - 6,
    marginTop: CENTER - (RADIUS - 6),
    borderRadius: 99,
    backgroundColor: C.primary,
  },
  tpKnob: {
    position: 'absolute',
    top: -5,
    left: (2.5 - 13) / 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.primary,
  },
  tpCenter: {
    position: 'absolute',
    left: CENTER - 5,
    top: CENTER - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  tpNum: {
    position: 'absolute',
    width: NUM,
    height: NUM,
    borderRadius: NUM / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tpNumSel: { backgroundColor: C.primaryContainer },
  tpNumText: { fontSize: 14.5, fontWeight: '600', color: C.text2, fontVariant: ['tabular-nums'] },
  tpNumTextSel: { color: C.onPrimaryContainer, fontWeight: '800' },
});

export const dialogWidth = DIALOG_WIDTH;
