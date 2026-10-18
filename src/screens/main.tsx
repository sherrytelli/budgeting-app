/**
 * Main screen — port of the reference index.html #screen-main and the
 * rendering/interaction logic in app.js: month header, budget carousel,
 * 7-day date strip, category panel, and the FAB action menu.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BudgetFormBody } from '@/components/budget-form';
import { useOverlays } from '@/components/overlays';
import { MonthPickerBody } from '@/components/pickers';
import { CategorySheetBody, ExpenseSheetBody } from '@/components/sheets';
import { IconBtn, PressableScale } from '@/components/ui';
import { C, R, shadow } from '@/constants/theme';
import { addDays, DAY_L, daysInMonth, fmtDay, fmtMonth, fromKey, keyOf, today } from '@/lib/dates';
import { fmtNum, fmtTime, money } from '@/lib/format';
import { Icon } from '@/lib/icons';
import { useAuth } from '@/lib/auth';
import { useDailyReminderScheduling } from '@/lib/reminders';
import type { Budget, Category, Expense } from '@/lib/types';
import { budgetSpent, daySpent, useApp } from '@/store';

export default function MainScreen() {
  const app = useApp();
  const auth = useAuth();
  // Schedule today's category reminders for the current month's budgets.
  useDailyReminderScheduling();
  const insets = useSafeAreaInsets();
  const overlays = useOverlays();
  const [menuOpen, setMenuOpen] = useState(false);

  // Guard like the reference boot(): no token → back to the login screen.
  // The screen stays blank until auth resolves, so the protected UI never flashes.
  const authed = auth.ready && !!auth.token;
  useEffect(() => {
    if (auth.ready && !auth.token) void router.replace('/');
  }, [auth.ready, auth.token]);

  // enterApp(): reset the view to the current month once auth is ready (once).
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current || !auth.ready) return;
    enteredRef.current = true;
    app.enterMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready]);

  const list = app.monthBudgets();
  const has = list.length > 0;
  const active = app.activeBudget();

  const openExpenseSheet = (catId?: string, expense?: Expense, budget?: Budget) => {
    const b = budget ?? app.activeBudget();
    if (!b || b.categories.length === 0) return;
    overlays.openSheet(expense ? 'Edit expense' : 'Log expense', ({ close }) => (
      <ExpenseSheetBody budget={b} catId={catId} expense={expense} date={app.selectedDate} close={close} />
    ));
  };
  const openCategorySheet = (cat?: Category) => {
    const b = app.activeBudget();
    if (!b) return;
    overlays.openSheet(cat ? 'Edit category' : 'Create category', ({ close }) => (
      <CategorySheetBody budget={b} cat={cat} close={close} />
    ));
  };
  const openBudgetScreen = (budget?: Budget) => {
    overlays.openFullscreen(budget ? 'Edit monthly budget' : 'Create monthly budget', ({ close }) => (
      <BudgetFormBody budget={budget} close={close} />
    ));
  };

  if (!authed) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={() =>
          overlays.openDialog(({ close }) => (
            <MonthPickerBody currentKey={app.monthKey} onPick={app.switchMonth} close={close} />
          ))
        }
        accessibilityRole="button"
        accessibilityLabel="Choose month"
        style={[styles.monthHeader, { marginTop: 14 + insets.top }]}>
        <Text style={styles.monthLabel} numberOfLines={1}>
          {fmtMonth(app.monthKey)}
        </Text>
        <Icon name="calendar" size={21} color={C.primary} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, !has && { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={app.refreshing}
            onRefresh={app.refresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }>
        {!has ? (
          app.budgetsLoaded ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="wallet" size={42} color={C.onPrimaryContainer} />
              </View>
              <Text style={styles.emptyMsg}>
                There is no monthly budget for the month.{'\n'}Create a budget first.
              </Text>
              <PressableScale onPress={() => openBudgetScreen()} style={styles.emptyBtn}>
                <View style={styles.emptyBtnInner}>
                  <Text style={styles.emptyBtnText}>Create budget</Text>
                </View>
              </PressableScale>
            </View>
          ) : null
        ) : (
          <>
            <BudgetCarousel
              budgets={list}
              idx={app.budgetIdx}
              onIdxChange={app.setBudgetIdx}
              onEdit={(b) => openBudgetScreen(b)}
              onDelete={(b) =>
                overlays.openConfirmDialog({
                  title: 'Delete budget?',
                  message:
                    'This will also delete all categories and expenses in this budget. This cannot be undone.',
                  onConfirm: () => app.deleteBudget(b.id),
                })
              }
            />
            {list.length > 1 ? (
              <View style={styles.dots}>
                {list.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => app.setBudgetIdx(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Budget ${i + 1}`}
                    style={[styles.dot, i === app.budgetIdx && styles.dotOn]}
                  />
                ))}
              </View>
            ) : null}
            <DateStrip
              windowStart={app.windowStart}
              selectedDate={app.selectedDate}
              onSelect={app.selectDate}
              onWindowChange={app.setWindowStart}
            />
            {active ? (
              <Panel
                budget={active}
                selectedDate={app.selectedDate}
                expandedCat={app.expandedCat}
                onToggle={app.toggleExpanded}
                onEditCategory={(c) => openCategorySheet(c)}
                onDeleteCategory={(c) =>
                  overlays.openConfirmDialog({
                    title: 'Delete category?',
                    message: `This will also delete all expenses logged under "${c.name}". This cannot be undone.`,
                    onConfirm: () => app.deleteCategory(active.id, c.id),
                  })
                }
                onEditExpense={(c, e) => openExpenseSheet(c.id, e, active)}
                onDeleteExpense={(c, e) =>
                  overlays.openConfirmDialog({
                    title: 'Delete expense?',
                    message: `"${e.note || 'This expense'}" will be removed. This cannot be undone.`,
                    onConfirm: () => app.deleteExpense(active.id, c.id, e.id),
                  })
                }
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {has && active ? (
        <>
          <Pressable
            onPress={() => setMenuOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={[styles.fab, { bottom: 24 + insets.bottom }]}>
            <Animated.View style={{ transform: [{ rotate: menuOpen ? '45deg' : '0deg' }] }}>
              <Icon name="plus" size={25} color={C.onPrimary} />
            </Animated.View>
          </Pressable>
          {menuOpen ? (
            <View style={StyleSheet.absoluteFill}>
              <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
              <View style={[styles.pills, { bottom: 102 + insets.bottom }]}>
                <MenuPill
                  delay={40}
                  icon="receipt"
                  label="Log expense"
                  disabled={active.categories.length === 0 || fromKey(app.selectedDate) > today()}
                  hint={
                    fromKey(app.selectedDate) > today() ? "Can't log expenses for future dates" : undefined
                  }
                  onPress={() => {
                    setMenuOpen(false);
                    openExpenseSheet();
                  }}
                />
                <MenuPill
                  delay={90}
                  icon="tag"
                  label="Create category"
                  onPress={() => {
                    setMenuOpen(false);
                    openCategorySheet();
                  }}
                />
                <MenuPill
                  delay={140}
                  icon="calplus"
                  label="Create monthly budget"
                  onPress={() => {
                    setMenuOpen(false);
                    openBudgetScreen();
                  }}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/* ---------- budget carousel ---------- */

function BudgetCarousel({
  budgets,
  idx,
  onIdxChange,
  onEdit,
  onDelete,
}: {
  budgets: Budget[];
  idx: number;
  onIdxChange: (i: number) => void;
  onEdit: (b: Budget) => void;
  onDelete: (b: Budget) => void;
}) {
  const [w, setW] = useState(0);
  const [tx] = useState(() => new Animated.Value(0));
  const prevIdx = useRef(idx);

  useEffect(() => {
    if (w === 0) return;
    const animate = prevIdx.current !== idx;
    prevIdx.current = idx;
    if (animate) {
      Animated.timing(tx, {
        toValue: -idx * w,
        duration: 320,
        easing: Easing.bezier(0.25, 1, 0.35, 1),
        useNativeDriver: true,
      }).start();
    } else {
      tx.setValue(-idx * w);
    }
  }, [idx, w, tx]);

  const pan = useMemo(() => {
    // Track offset is derived from the committed index, so the handlers need
    // no mutable gesture state (idx only changes on release).
    const base = () => -idx * (w || 1);
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const n = budgets.length;
        let v = base() + g.dx;
        if ((idx === 0 && g.dx > 0) || (idx === n - 1 && g.dx < 0)) {
          v = base() + g.dx * 0.35;
        }
        tx.setValue(v);
      },
      onPanResponderRelease: (_, g) => {
        const n = budgets.length;
        let next = idx;
        if (g.dx < -w * 0.18) next = Math.min(n - 1, idx + 1);
        else if (g.dx > w * 0.18) next = Math.max(0, idx - 1);
        if (next !== idx) onIdxChange(next);
        else {
          Animated.timing(tx, {
            toValue: -idx * w,
            duration: 320,
            easing: Easing.bezier(0.25, 1, 0.35, 1),
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [tx, idx, w, budgets.length, onIdxChange]);

  return (
    <View style={styles.carouselViewport} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Animated.View style={[styles.carouselTrack, w > 0 ? { width: w * budgets.length } : null, { transform: [{ translateX: tx }] }]}>
        {budgets.map((b) => {
          const spent = budgetSpent(b);
          const over = spent > b.amount;
          const pct = Math.min(100, b.amount ? (spent / b.amount) * 100 : 0);
          return (
            <View key={b.id} style={[styles.card, w > 0 ? { width: w } : null]}>
              <View style={styles.bcTop}>
                <Text style={styles.bcName} numberOfLines={1}>
                  {b.name}
                </Text>
                <View style={styles.bcActions}>
                  <IconBtn name="pencil" label="Edit budget" onPress={() => onEdit(b)} />
                  <IconBtn name="trash" danger label="Delete budget" onPress={() => onDelete(b)} />
                </View>
              </View>
              <Text style={styles.bcAmount}>
                {money(spent, b.currency)} <Text style={styles.bcTotal}>/ {money(b.amount, b.currency)}</Text>
              </Text>
              <View style={styles.bcBar}>
                <View style={[styles.bcBarFill, over && styles.bcBarOver, { width: `${pct}%` }]} />
              </View>
              <Text style={[styles.bcStatus, over && styles.bcStatusOver]}>
                {over
                  ? `${money(spent - b.amount, b.currency)} over budget`
                  : `${money(b.amount - spent, b.currency)} under budget`}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/* ---------- date strip ---------- */

/** Gap between two day cells. Must match `styles.stripTrack`. */
const DAY_GAP = 6;
const DAYS_VISIBLE = 7;

function DateStrip({
  windowStart,
  selectedDate,
  onSelect,
  onWindowChange,
}: {
  windowStart: Date;
  selectedDate: string;
  onSelect: (k: string) => void;
  onWindowChange: (d: Date) => void;
}) {
  const [wrapW, setWrapW] = useState(0);
  const [tx] = useState(() => new Animated.Value(0));
  const [locked, setLocked] = useState(false);
  const tKey = keyOf(today());

  // The whole month is laid out as one track, so days that slide into view are
  // always already there — nothing pops in and no gap trails the strip. Before
  // the first layout pass the cell size is unknown, so the plain 7-day window
  // is rendered instead (identical geometry, so nothing shifts visually).
  const measured = wrapW > 0;
  const cellW = measured ? (wrapW - DAY_GAP * (DAYS_VISIBLE - 1)) / DAYS_VISIBLE : 0;
  const step = measured ? cellW + DAY_GAP : 0;

  const monthStart = useMemo(
    () => new Date(windowStart.getFullYear(), windowStart.getMonth(), 1),
    [windowStart],
  );
  const days = daysInMonth(monthStart.getFullYear(), monthStart.getMonth());

  const monthCells = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < days; i++) out.push(addDays(monthStart, i));
    return out;
  }, [monthStart, days]);

  const windowCells = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < DAYS_VISIBLE; i++) out.push(addDays(windowStart, i));
    return out;
  }, [windowStart]);

  // Index of the first visible day inside the month, in days.
  const lead = Math.round((windowStart.getTime() - monthStart.getTime()) / 86400000);
  const base = -lead * step;

  // Park the track whenever the window changes from the outside — first
  // measurement, month or budget switch. A swipe puts the track on exactly this
  // value on its own, so re-parking after one is a no-op; that is what keeps
  // the strip from jumping back for a frame at the end of a swipe.
  useLayoutEffect(() => {
    tx.setValue(base);
  }, [tx, base]);

  const pan = useMemo(() => {
    const settle = (to: number, duration: number, easing: typeof Easing.ease) =>
      Animated.timing(tx, { toValue: to, duration, easing, useNativeDriver: true });

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !locked && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (!step) return;
        tx.setValue(base + g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (!step) return;
        const back = () => settle(base, 200, Easing.out(Easing.quad)).start();
        if (Math.abs(g.dx) <= 8) {
          back();
          return;
        }
        // Days to move, clamped so the visible window stays inside the month.
        const shift = Math.max(-lead, Math.min(days - DAYS_VISIBLE - lead, -Math.round(g.dx / step)));
        if (shift === 0) {
          back();
          return;
        }
        const next = addDays(windowStart, shift);
        setLocked(true);
        settle(base - shift * step, 220, Easing.inOut(Easing.ease)).start(() => {
          onWindowChange(next);
          // Always unlock, even if the animation is interrupted, so the strip
          // can never get stuck in its locked state.
          setLocked(false);
        });
      },
      onPanResponderTerminate: () => {
        settle(base, 200, Easing.out(Easing.quad)).start();
        setLocked(false);
      },
    });
  }, [tx, step, base, lead, days, windowStart, onWindowChange, locked]);

  const cells = measured ? monthCells : windowCells;

  return (
    <View style={styles.stripWrap} onLayout={(e) => setWrapW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Animated.View
        style={[
          styles.stripTrack,
          measured && { width: days * cellW + DAY_GAP * (days - 1) },
          { transform: [{ translateX: tx }] },
        ]}>
        {cells.map((d) => {
          const k = keyOf(d);
          const sel = k === selectedDate;
          const isToday = k === tKey;
          return (
            <Pressable
              key={k}
              onPress={() => onSelect(k)}
              accessibilityRole="button"
              accessibilityLabel={fmtDay(k)}
              style={[
                styles.dayCell,
                measured && { flex: 0, width: cellW },
                sel && styles.dayCellSel,
                isToday && !sel && styles.dayCellToday,
              ]}>
              {isToday && !sel ? <View pointerEvents="none" style={styles.dayDot} /> : null}
              <Text style={[styles.dayW, sel && styles.dayWSel]}>{DAY_L[d.getDay()]}</Text>
              <Text style={[styles.dayN, sel && styles.dayNSel]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

/* ---------- expenses panel ---------- */

function Panel({
  budget,
  selectedDate,
  expandedCat,
  onToggle,
  onEditCategory,
  onDeleteCategory,
  onEditExpense,
  onDeleteExpense,
}: {
  budget: Budget;
  selectedDate: string;
  expandedCat: string | null;
  onToggle: (catId: string) => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (c: Category) => void;
  onEditExpense: (c: Category, e: Expense) => void;
  onDeleteExpense: (c: Category, e: Expense) => void;
}) {
  if (budget.categories.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelEmpty}>
          No categories yet.{'\n'}Tap + to create one.
        </Text>
      </View>
    );
  }
  const total = budget.categories.reduce((s, c) => s + daySpent(c, selectedDate), 0);
  const dayTotal = budget.categories.reduce((s, c) => s + c.dailyLimit, 0);
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelHeadText}>Expenses · {fmtDay(selectedDate)}</Text>
        <Text style={styles.panelHeadAmt}>
          {money(total, budget.currency)} / {money(dayTotal, budget.currency)} today
        </Text>
      </View>
      {budget.categories.map((c) => (
        <CatRow
          key={c.id}
          category={c}
          currency={budget.currency}
          selectedDate={selectedDate}
          open={expandedCat === c.id}
          onToggle={() => onToggle(c.id)}
          onEdit={() => onEditCategory(c)}
          onDelete={() => onDeleteCategory(c)}
          onEditExpense={(e) => onEditExpense(c, e)}
          onDeleteExpense={(e) => onDeleteExpense(c, e)}
        />
      ))}
    </View>
  );
}

function CatRow({
  category: c,
  currency,
  selectedDate,
  open,
  onToggle,
  onEdit,
  onDelete,
  onEditExpense,
  onDeleteExpense,
}: {
  category: Category;
  currency: Budget['currency'];
  selectedDate: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (e: Expense) => void;
}) {
  const spent = daySpent(c, selectedDate);
  const ratio = c.dailyLimit ? spent / c.dailyLimit : 0;
  const over = ratio >= 1;
  const warn = !over && ratio >= 0.75;
  const pct = Math.min(100, ratio * 100);

  const [bodyH] = useState(() => new Animated.Value(0));
  const [contentH, setContentH] = useState(0);
  useEffect(() => {
    Animated.timing(bodyH, {
      toValue: open ? contentH : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [open, contentH, bodyH]);

  const logs = c.expenses.filter((e) => e.date === selectedDate).sort((a, b) => a.time - b.time);

  return (
    <View style={[styles.catRow, open && styles.catRowOpen]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${c.name}, spent ${fmtNum(spent)} of ${fmtNum(c.dailyLimit)} today`}
        style={styles.catHead}>
        <View style={[styles.catTile, over && styles.catTileOver]}>
          <Icon name={c.icon} size={21} color={over ? C.red : C.onPrimaryContainer} />
        </View>
        <Text style={styles.catName} numberOfLines={1}>
          {c.name}
        </Text>
        <Text style={[styles.catRatio, over && styles.catRatioOver]}>
          <Text style={[styles.catRatioStrong, over && styles.catRatioOver]}>{money(spent, currency)}</Text> / {fmtNum(c.dailyLimit)}
        </Text>
      </Pressable>
      {/* ref: .cat-bar is a sibling of .cat-head, so it anchors to the row
          bottom (below the expanded body), not the head. */}
      <View style={styles.catBar}>
        <View
          style={[
            styles.catBarFill,
            over && { backgroundColor: C.red },
            warn && { backgroundColor: C.amber },
            { width: `${pct}%` },
          ]}
        />
      </View>
      <Animated.View style={[styles.catBody, { height: bodyH }]}>
        {/* The measuring wrapper is absolutely positioned so the collapsed
            (height: 0) parent can't clamp its measured height: CSS lets the
            child keep its natural size, while native yoga clamps it to zero.
            Without this, contentH stayed 0 on device and the expanded body
            never grew — no expense logs, no edit/delete buttons. */}
        <View
          style={styles.catBodyInner}
          onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
          {logs.length ? (
            logs.map((e) => (
              <View key={e.id} style={styles.log}>
                <View style={styles.logMain}>
                  <Text style={styles.logNote} numberOfLines={1}>
                    {e.note || <Text style={styles.logDim}>No note</Text>}
                  </Text>
                  <Text style={styles.logSub}>
                    {money(e.amount, currency)} · {fmtTime(e.time)}
                  </Text>
                </View>
                <IconBtn name="pencil" label="Edit expense" size={17} style={styles.logBtn} onPress={() => onEditExpense(e)} />
                <IconBtn name="trash" danger label="Delete expense" size={17} style={styles.logBtn} onPress={() => onDeleteExpense(e)} />
              </View>
            ))
          ) : (
            <Text style={styles.noExp}>No expenses yet</Text>
          )}
          <View style={styles.catFoot}>
            <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}`} style={styles.catFootBtn}>
              <Icon name="pencil" size={22} color={C.primary} />
              <Text style={styles.catFootText} numberOfLines={1}>
                Edit category
              </Text>
            </Pressable>
            <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${c.name}`} style={styles.catFootBtn}>
              <Text style={[styles.catFootText, { color: C.red }]} numberOfLines={1}>
                Delete category
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/* ---------- FAB menu pill ---------- */

function MenuPill({
  icon,
  label,
  disabled = false,
  hint,
  delay,
  onPress,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  hint?: string;
  delay: number;
  onPress: () => void;
}) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.bezier(0.3, 1.3, 0.5, 1),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View style={[styles.pillWrap, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {hint ? <Text style={styles.pillHint}>{hint}</Text> : null}
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={[styles.pill, disabled && styles.pillDisabled]}>
        <Icon name={icon} size={19} color={disabled ? C.disabled : C.primary} />
        <Text style={[styles.pillText, disabled && styles.pillTextDisabled]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  monthHeader: {
    marginHorizontal: 16,
    marginBottom: 4,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 22,
    paddingRight: 10,
    ...shadow(1),
  },
  monthLabel: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingHorizontal: 16, paddingBottom: 112 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    marginBottom: 22,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMsg: { color: C.text2, fontSize: 15, lineHeight: 24, textAlign: 'center', maxWidth: 290 },
  emptyBtn: { marginTop: 28, minWidth: 200 },
  emptyBtnInner: {
    backgroundColor: C.primary,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...shadow(1),
  },
  emptyBtnText: { color: C.onPrimary, fontSize: 15.5, fontWeight: '600' },
  carouselViewport: { borderRadius: R.lg, overflow: 'hidden' },
  carouselTrack: { flexDirection: 'row' },
  card: {
    minHeight: 168,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: R.lg,
    padding: 20,
    paddingBottom: 18,
  },
  bcTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  bcName: { flex: 1, minWidth: 0, fontSize: 23, fontWeight: '800', letterSpacing: 0.2, color: C.text },
  bcActions: { flexDirection: 'row', gap: 2, marginTop: -6, marginRight: -8 },
  bcAmount: { marginTop: 10, fontSize: 17, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  bcTotal: { color: C.text2, fontWeight: '600' },
  bcBar: { height: 6, borderRadius: 99, backgroundColor: C.track, marginTop: 12, overflow: 'hidden' },
  bcBarFill: { height: '100%', borderRadius: 99, backgroundColor: C.primary },
  bcBarOver: { backgroundColor: C.red },
  bcStatus: { marginTop: 10, fontSize: 13.5, fontWeight: '600', color: C.green },
  bcStatusOver: { color: C.red },
  // ref: .carousel-dots { margin: 14px 0 2px } + .strip-wrap { margin-top: 14px }
  // collapse to 14px in CSS; RN sums them, so drop the 2px here.
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 14 },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.dot },
  dotOn: { width: 22, backgroundColor: C.primary },
  // The vertical padding is shadow room: the wrap clips the track, so without it
  // the cards' shadows would be cut off flat at the top and bottom edges.
  stripWrap: { marginTop: 14, paddingVertical: 8, overflow: 'hidden' },
  stripTrack: { flexDirection: 'row', gap: DAY_GAP },
  // Each day is its own card, using the same surface, hairline border and
  // shadow the rest of the screen's cards use.
  dayCell: {
    flex: 1,
    height: 66,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    ...shadow(1),
  },
  dayCellSel: { backgroundColor: C.primary, borderColor: C.primary },
  dayCellToday: { borderColor: C.primary },
  // ref: .day-cell.today::before — 5px dot centred 5px below the cell's inner edge.
  dayDot: {
    position: 'absolute',
    top: 5,
    left: '50%',
    marginLeft: -2.5,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  dayW: { fontSize: 11, fontWeight: '600', color: C.text3, letterSpacing: 0.5 },
  dayWSel: { color: 'rgba(255,255,255,.8)' },
  dayN: { fontSize: 16.5, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] },
  dayNSel: { color: '#fff' },
  panel: {
    marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 6,
    ...shadow(1),
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  panelHeadText: { color: C.text2, fontSize: 13, fontWeight: '600' },
  panelHeadAmt: { color: C.text2, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  panelEmpty: { padding: 36, paddingHorizontal: 20, textAlign: 'center', color: C.text2, fontSize: 14.5, lineHeight: 22.47 },
  catRow: { borderRadius: 16, overflow: 'hidden', marginBottom: 2 },
  catRowOpen: { backgroundColor: C.openRow },
  // ref .cat-head: padding: 12px 14px 15px
  catHead: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  catTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTileOver: { backgroundColor: C.redBg },
  catName: { flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: '600', color: C.text },
  catRatio: { fontSize: 14, fontWeight: '600', color: C.text2, fontVariant: ['tabular-nums'] },
  catRatioOver: { color: C.red },
  catRatioStrong: { fontWeight: '700', color: C.text },
  catBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: C.catBar },
  catBarFill: { height: '100%', backgroundColor: C.primary },
  catBody: { overflow: 'hidden' },
  catBodyInner: { position: 'absolute', left: 0, right: 0, top: 0 },
  log: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingRight: 8, paddingLeft: 66 },
  logMain: { flex: 1, minWidth: 0 },
  // ref .log-note { font-weight: 550 } — renders as the same face as '600' here.
  logNote: { fontSize: 14, fontWeight: '600', color: C.text },
  logDim: { color: C.text3, fontWeight: '500' },
  logSub: { fontSize: 12.5, color: C.text2, marginTop: 2, fontVariant: ['tabular-nums'] },
  logBtn: { width: 34, height: 34 },
  noExp: { paddingVertical: 8, paddingLeft: 66, paddingRight: 16, paddingBottom: 12, color: C.text3, fontSize: 13.5 },
  // Centred as a pair instead of indented to the category name: the indent was a
  // fixed 58px, so on narrower screens it pushed both buttons past the right edge
  // of the row, where the row's overflow clipping cut them off.
  catFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  // ref .cat-foot .btn { height: 36px; font-size: 13px; padding: 0 12px } + .btn { gap: 8px }
  catFootBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexShrink: 1,
  },
  catFootText: { color: C.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, flexShrink: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(2),
  },
  menuBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(30,36,34,.30)' },
  pills: { position: 'absolute', right: 20, alignItems: 'flex-end', gap: 13 },
  pillWrap: { alignItems: 'flex-end', gap: 5 },
  pillHint: { fontSize: 12.5, fontWeight: '500', color: '#F6F4EF', textShadowColor: 'rgba(30,36,34,.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, paddingRight: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 999,
    backgroundColor: C.surface2,
    ...shadow(2),
  },
  pillDisabled: { backgroundColor: C.pillDisabledBg, shadowOpacity: 0, elevation: 0 },
  pillText: { fontSize: 14.5, fontWeight: '600', color: C.text },
  pillTextDisabled: { color: C.disabled },
});
