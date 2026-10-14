/**
 * Create / edit monthly budget — fullscreen body, port of the reference
 * app.js openBudgetScreen().
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';
import { useOverlays } from '@/components/overlays';
import { MonthPickerBody } from '@/components/pickers';
import { Btn, Field, Helper, Segmented, SelectField } from '@/components/ui';
import { fmtMonth } from '@/lib/dates';
import { curSym, uid } from '@/lib/format';
import { useApp } from '@/store';
import type { Budget, Currency } from '@/lib/types';

export function BudgetFormBody({ budget, close }: { budget?: Budget; close: () => void }) {
  const app = useApp();
  const overlays = useOverlays();
  const isEdit = !!budget;
  const [name, setName] = useState(isEdit ? budget!.name : '');
  const [monthKey, setMonthKey] = useState(isEdit ? budget!.monthKey : app.monthKey);
  const [amount, setAmount] = useState(isEdit ? String(budget!.amount) : '');
  const [currency, setCurrency] = useState<Currency>(isEdit ? budget!.currency : 'PKR');
  const [nameErr, setNameErr] = useState('');
  const [amtErr, setAmtErr] = useState(false);

  const openMonthPicker = () =>
    overlays.openDialog(({ close: closePicker }) => (
      <MonthPickerBody
        currentKey={monthKey}
        onPick={(mk) => {
          closePicker();
          setMonthKey(mk);
        }}
        close={closePicker}
      />
    ));

  const save = () => {
    const trimmed = name.trim();
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!trimmed) {
      setNameErr('Enter a budget name');
      return;
    }
    const dup = app.budgets.some(
      (x) => x.monthKey === monthKey && x.name.toLowerCase() === trimmed.toLowerCase() && (!isEdit || x.id !== budget!.id),
    );
    if (dup) {
      setNameErr('A budget with this name already exists for this month');
      return;
    }
    if (!(amt > 0)) {
      setAmtErr(true);
      return;
    }
    let id: string;
    if (isEdit) {
      const updated: Budget = { ...budget!, name: trimmed, amount: amt, currency, monthKey };
      app.updateBudget(updated);
      id = updated.id;
    } else {
      id = uid();
      app.addBudget({ id, name: trimmed, monthKey, amount: amt, currency, categories: [] });
    }
    app.focusBudget(monthKey, id);
    close();
  };

  return (
    <>
      <Field
        icon="tag"
        placeholder="Monthly budget name"
        maxLength={24}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameErr('');
        }}
      />
      {nameErr ? <Helper error>{nameErr}</Helper> : null}
      <View style={styles.gap} />
      <SelectField icon="calendar" value={<Text style={styles.valueText}>{fmtMonth(monthKey)}</Text>} onPress={openMonthPicker} />
      <View style={styles.gap} />
      <Field
        prefix={curSym(currency)}
        placeholder="Budget amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setAmtErr(false);
        }}
      />
      {amtErr ? <Helper error>Enter a budget amount greater than 0</Helper> : null}
      <View style={styles.gap} />
      <Segmented options={['PKR', 'USD'] as const} value={currency} onChange={setCurrency} />
      <View style={styles.gap} />
      <View style={styles.gap} />
      <Btn block onPress={save}>
        {isEdit ? 'Save changes' : 'Create budget'}
      </Btn>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { height: 16 },
  valueText: { fontSize: 15.5, color: C.text },
});
