/**
 * Expense and category sheet bodies — port of the reference app.js
 * openExpenseSheet() and openCategorySheet().
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { C } from '@/constants/theme';
import { useOverlays } from '@/components/overlays';
import { TimePickerBody } from '@/components/pickers';
import { Btn, Field, Helper, QuietRow, SelectField } from '@/components/ui';
import { CAT_ICONS, Icon } from '@/lib/icons';
import { fmtDay } from '@/lib/dates';
import { curSym, fmtTime, nowMins, uid } from '@/lib/format';
import { useApp } from '@/store';
import type { Budget, Category, Expense } from '@/lib/types';

/* ---------- dropdown value used by the expense sheet ---------- */

function IconValue({ icon, name, nameStyle }: { icon: string; name: string; nameStyle?: TextStyle }) {
  return (
    <View style={styles.ddVal}>
      <View style={styles.ddIc}>
        <Icon name={icon} size={16} color={C.onPrimaryContainer} />
      </View>
      <Text style={[styles.ddName, nameStyle]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/* ---------- log / edit expense ---------- */

export function ExpenseSheetBody({
  budget,
  catId,
  expense,
  date,
  close,
}: {
  budget: Budget;
  catId?: string;
  expense?: Expense;
  date: string;
  close: () => void;
}) {
  const app = useApp();
  const overlays = useOverlays();
  const isEdit = !!expense;
  const cats = budget.categories;
  const [selCat, setSelCat] = useState(catId ?? cats[0].id);
  const [time, setTime] = useState(isEdit ? expense!.time : nowMins());
  const [note, setNote] = useState(isEdit ? expense!.note : '');
  const [amount, setAmount] = useState(isEdit ? String(expense!.amount) : '');
  const [ddOpen, setDdOpen] = useState(false);
  const [amtErr, setAmtErr] = useState(false);
  const dk = isEdit ? expense!.date : date;

  const selected = cats.find((c) => c.id === selCat) ?? cats[0];

  const openTimePicker = () =>
    overlays.openDialog(({ close: closePicker }) => (
      <TimePickerBody
        initialMins={time}
        onPick={(m) => {
          closePicker();
          setTime(m);
        }}
        close={closePicker}
      />
    ));

  const save = () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!(amt > 0)) {
      setAmtErr(true);
      return;
    }
    const trimmed = note.trim();
    if (isEdit) {
      app.updateExpense(budget.id, { ...expense!, note: trimmed, amount: amt, time, date: dk }, selCat);
    } else {
      app.addExpense(budget.id, selCat, { id: uid(), date: dk, note: trimmed, amount: amt, time });
      app.setExpandedCat(selCat);
    }
    close();
  };

  return (
    <>
      <QuietRow icon="calendar">
        Logging for <Text style={styles.bold}>{fmtDay(dk)}</Text>
      </QuietRow>
      <View style={styles.gap} />
      <View>
        <SelectField
          icon="tag"
          value={<IconValue icon={selected.icon} name={selected.name} />}
          onPress={() => setDdOpen((o) => !o)}
        />
        {ddOpen ? (
          <>
            <Pressable style={styles.ddBackdrop} onPress={() => setDdOpen(false)} accessibilityLabel="Close menu" />
            <View style={styles.ddMenu}>
              <ScrollView style={styles.ddScroll} bounces={false}>
                {cats.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setSelCat(o.id);
                      setDdOpen(false);
                    }}
                    accessibilityRole="button"
                    style={[styles.ddOpt, o.id === selCat && styles.ddOptSel]}>
                    <IconValue icon={o.icon} name={o.name} nameStyle={styles.ddOptText} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
      <View style={styles.gap} />
      <Field icon="pencil" placeholder="Note" maxLength={60} value={note} onChangeText={setNote} />
      <View style={styles.gap} />
      <Field
        prefix={curSym(budget.currency)}
        placeholder="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setAmtErr(false);
        }}
      />
      {amtErr ? <Helper error>Enter an amount greater than 0</Helper> : null}
      <View style={styles.gap} />
      <SelectField icon="clock" value={<Text style={styles.valueText}>{fmtTime(time)}</Text>} onPress={openTimePicker} />
      <View style={styles.gap} />
      <View style={styles.gap} />
      <Btn block onPress={save}>
        {isEdit ? 'Save changes' : 'Log expense'}
      </Btn>
    </>
  );
}

/* ---------- create / edit category ---------- */

export function CategorySheetBody({
  budget,
  cat,
  close,
}: {
  budget: Budget;
  cat?: Category;
  close: () => void;
}) {
  const app = useApp();
  const overlays = useOverlays();
  const isEdit = !!cat;
  const [name, setName] = useState(isEdit ? cat!.name : '');
  const [limit, setLimit] = useState(isEdit ? String(cat!.dailyLimit) : '');
  const [icon, setIcon] = useState<string>(isEdit ? cat!.icon : 'basket');
  const [reminder, setReminder] = useState<number | null>(isEdit ? cat!.reminder : null);
  const [nameErr, setNameErr] = useState(false);
  const [limitErr, setLimitErr] = useState(false);
  const [gridW, setGridW] = useState(0);
  // Narrowed copies: safe to read even in create mode (React Compiler hoists
  // captured property reads into render-time memo deps).
  const catId = cat?.id;
  const catName = cat?.name;

  const tile = gridW > 0 ? (gridW - 5 * 9) / 6 : 0;

  const openTimePicker = () =>
    overlays.openDialog(({ close: closePicker }) => (
      <TimePickerBody
        initialMins={reminder ?? 540}
        onPick={(m) => {
          closePicker();
          setReminder(m);
        }}
        close={closePicker}
      />
    ));

  const save = () => {
    const trimmed = name.trim();
    const lim = parseFloat(limit.replace(/,/g, ''));
    if (!trimmed) {
      setNameErr(true);
      return;
    }
    if (!(lim > 0)) {
      setLimitErr(true);
      return;
    }
    if (isEdit) {
      app.updateCategory(budget.id, { ...cat!, name: trimmed, dailyLimit: lim, reminder, icon });
    } else {
      app.addCategory(budget.id, { id: uid(), name: trimmed, dailyLimit: lim, reminder, icon, expenses: [] });
    }
    close();
  };

  const remove = () => {
    if (catId == null) return;
    overlays.openConfirmDialog({
      title: 'Delete category?',
      message: `This will also delete all expenses logged under "${catName ?? ''}". This cannot be undone.`,
      onConfirm() {
        app.deleteCategory(budget.id, catId);
        close();
      },
    });
  };

  return (
    <>
      <Field
        icon="tag"
        placeholder="Name of category"
        maxLength={24}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameErr(false);
        }}
      />
      {nameErr ? <Helper error>Enter a category name</Helper> : null}
      <View style={styles.gap} />
      <Field
        prefix={curSym(budget.currency)}
        placeholder="Daily limit"
        keyboardType="decimal-pad"
        value={limit}
        onChangeText={(v) => {
          setLimit(v);
          setLimitErr(false);
        }}
      />
      {limitErr ? <Helper error>Enter a daily limit greater than 0</Helper> : null}
      <View style={styles.gap} />
      <SelectField
        icon="alarm"
        isPlaceholder={reminder == null}
        placeholder="Reminder time (Optional)"
        value={
          <Text style={reminder == null ? styles.placeholderText : styles.valueText}>
            {reminder != null ? fmtTime(reminder) : ''}
          </Text>
        }
        onPress={openTimePicker}
      />
      <View style={styles.gap} />
      <View style={styles.pickerHead}>
        <Text style={styles.pickerTtl}>Choose an icon</Text>
        <View style={styles.pickerPreview}>
          <View style={styles.mini}>
            <Icon name={icon} size={16} color={C.onPrimaryContainer} />
          </View>
          <Text style={styles.pickerNm} numberOfLines={1}>
            {name.trim() || 'Category'}
          </Text>
        </View>
      </View>
      <View style={styles.iconGrid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {tile > 0
          ? CAT_ICONS.map((i) => (
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
                accessibilityRole="button"
                accessibilityLabel={i}
                style={[styles.iconTile, { width: tile, height: tile }, i === icon && styles.iconTileSel]}>
                <Icon name={i} size={20} color={i === icon ? C.onPrimaryContainer : C.tileFg} />
              </Pressable>
            ))
          : null}
      </View>
      <View style={styles.gap} />
      <View style={styles.gap} />
      <Btn block onPress={save}>
        {isEdit ? 'Save changes' : 'Create category'}
      </Btn>
      {isEdit ? (
        <>
          <View style={styles.gap} />
          <Btn variant="text" danger block onPress={remove}>
            Delete category
          </Btn>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  gap: { height: 16 },
  bold: { fontWeight: '600', color: C.text },
  valueText: { fontSize: 15.5, color: C.text },
  placeholderText: { fontSize: 15.5, color: C.text3 },
  // ref .field.select .val { gap: 9px }
  ddVal: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 },
  ddIc: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ddName: { fontSize: 15.5, color: C.text, flexShrink: 1 },
  ddBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'transparent', zIndex: 15 },
  ddMenu: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    zIndex: 20,
    padding: 6,
    borderRadius: 16,
    backgroundColor: C.surface2,
    shadowColor: '#202624',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 28,
    shadowOpacity: 0.14,
    elevation: 6,
    maxHeight: 232,
  },
  ddScroll: { maxHeight: 220 },
  // ref .dd-opt { padding: 10px 12px; font-weight: 550 }
  ddOpt: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  ddOptText: { fontWeight: '600' },
  ddOptSel: { backgroundColor: C.primaryContainer },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  pickerTtl: { fontSize: 14.5, fontWeight: '600', color: C.text2 },
  pickerPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  mini: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerNm: { fontSize: 13.5, fontWeight: '600', color: C.text, maxWidth: 110 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
  iconTile: {
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.tileBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSel: { borderColor: C.primary, backgroundColor: C.primaryContainer },
});
