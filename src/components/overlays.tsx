/**
 * Overlay system — port of the reference app.js layers:
 * bottom sheets (.sheet-layer), dialogs (.dialog-layer), and full-screen
 * slide-in screens (.fs-layer), including drag-to-dismiss on sheets and the
 * Android back button closing the top layer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, shadow } from '@/constants/theme';
import { Btn, IconBtn } from '@/components/ui';

export interface OverlayApi {
  openSheet(title: string | null, content: (api: { close: () => void }) => ReactNode): { close: () => void };
  openDialog(content: (api: { close: () => void }) => ReactNode): { close: () => void };
  openConfirmDialog(opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }): void;
  openFullscreen(title: string, content: (api: { close: () => void }) => ReactNode): { close: () => void };
}

const OverlayContext = createContext<OverlayApi | null>(null);

export function useOverlays(): OverlayApi {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlays must be used inside <OverlayProvider>');
  return ctx;
}

interface SheetLayer {
  id: number;
  kind: 'sheet';
  title: string | null;
  content: (api: { close: () => void }) => ReactNode;
}
interface DialogLayer {
  id: number;
  kind: 'dialog';
  content: (api: { close: () => void }) => ReactNode;
}
interface FullscreenLayer {
  id: number;
  kind: 'fullscreen';
  title: string;
  content: (api: { close: () => void }) => ReactNode;
}
type Layer = SheetLayer | DialogLayer | FullscreenLayer;
type NewLayer = Omit<SheetLayer, 'id'> | Omit<DialogLayer, 'id'> | Omit<FullscreenLayer, 'id'>;

const EASE_OUT = Easing.bezier(0.25, 1, 0.35, 1);
const EASE_SPRINGY = Easing.bezier(0.3, 1.3, 0.5, 1);
const SCREEN_H = Dimensions.get('window').height;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
  }, []);

  const open = useCallback(
    (layer: NewLayer) => {
      const id = ++idRef.current;
      setLayers((ls) => [...ls, { ...layer, id } as Layer]);
      return { close: () => remove(id) };
    },
    [remove],
  );

  const api: OverlayApi = useMemo(
    () => ({
      openSheet: (title, content) => open({ kind: 'sheet', title, content }),
      openDialog: (content) => open({ kind: 'dialog', content }),
      openConfirmDialog: ({ title, message, confirmLabel = 'Delete', onConfirm }) => {
        open({
          kind: 'dialog',
          content: ({ close }) => (
            <ConfirmBody
              title={title}
              message={message}
              confirmLabel={confirmLabel}
              onConfirm={() => {
                close();
                onConfirm();
              }}
              onCancel={close}
            />
          ),
        });
      },
      openFullscreen: (title, content) => open({ kind: 'fullscreen', title, content }),
    }),
    [open],
  );

  return (
    <OverlayContext.Provider value={api}>
      <View style={styles.host}>
        {children}
        {layers.map((layer, i) => {
          const isTop = i === layers.length - 1;
          if (layer.kind === 'sheet') {
            return <SheetHost key={layer.id} id={layer.id} isTop={isTop} remove={remove} title={layer.title} content={layer.content} />;
          }
          if (layer.kind === 'dialog') {
            return <DialogHost key={layer.id} id={layer.id} isTop={isTop} remove={remove} content={layer.content} />;
          }
          return <FullscreenHost key={layer.id} id={layer.id} isTop={isTop} remove={remove} title={layer.title} content={layer.content} />;
        })}
      </View>
    </OverlayContext.Provider>
  );
}

/* ---------- confirm dialog body ---------- */

function ConfirmBody({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Text style={styles.dialogTitle}>{title}</Text>
      <Text style={styles.dialogMsg}>{message}</Text>
      <View style={styles.dialogActions}>
        <Btn variant="text" onPress={onCancel}>
          Cancel
        </Btn>
        <Btn variant="text" danger onPress={onConfirm}>
          {confirmLabel}
        </Btn>
      </View>
    </>
  );
}

/* ---------- hosts ---------- */

interface HostProps {
  id: number;
  isTop: boolean;
  remove: (id: number) => void;
  content: (api: { close: () => void }) => ReactNode;
}

/** Android back closes the topmost overlay (hosts below the top ignore it). */
function useBackToClose(isTop: boolean, close: () => void) {
  useEffect(() => {
    if (!isTop) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [isTop, close]);
}

function SheetHost({ id, isTop, remove, content, title }: HostProps & { title: string | null }) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SCREEN_H));
  const [sheetH, setSheetH] = useState(0);
  const openedRef = useRef(false);
  const unmount = useCallback(() => remove(id), [remove, id]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetH + 400,
        duration: 280,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(progress, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      // Unmount even if the animation gets interrupted — a layer that stays
      // mounted after close would leave an invisible backdrop over the app.
    ]).start(() => unmount());
  }, [progress, translateY, sheetH, unmount]);

  useBackToClose(isTop, close);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          translateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110) close();
          else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        },
      }),
    [translateY, close],
  );

  const onLayout = (h: number) => {
    if (openedRef.current || h === 0) return;
    openedRef.current = true;
    setSheetH(h);
    translateY.setValue(h);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 320, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <AnimatedPressable
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}
        onPress={close}
      />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View onLayout={(e) => onLayout(e.nativeEvent.layout.height)} style={[styles.sheet, { transform: [{ translateY }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View {...pan.panHandlers} style={styles.sheetGrab}>
              <View style={styles.sheetHandle} />
              {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
            </View>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={[styles.sheetContent, { paddingBottom: 30 + insets.bottom }]}
              keyboardShouldPersistTaps="handled"
              bounces={false}>
              {content({ close })}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </View>
  );
}

function DialogHost({ id, isTop, remove, content }: HostProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const unmount = useCallback(() => remove(id), [remove, id]);

  const close = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
      unmount(),
    );
  }, [progress, unmount]);

  useBackToClose(isTop, close);
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, easing: EASE_SPRINGY, useNativeDriver: true }).start();
  }, [progress]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedPressable style={[StyleSheet.absoluteFill, styles.backdropDark, { opacity: progress }]} onPress={close} />
      <View style={styles.dialogCenter} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
          ]}>
          {content({ close })}
        </Animated.View>
      </View>
    </View>
  );
}

function FullscreenHost({ id, isTop, remove, title, content }: HostProps & { title: string }) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(SCREEN_H * 2));
  const shownRef = useRef(false);
  const unmount = useCallback(() => remove(id), [remove, id]);

  const close = useCallback(() => {
    Animated.timing(translateX, { toValue: SCREEN_H * 2, duration: 300, easing: EASE_OUT, useNativeDriver: true }).start(() =>
      unmount(),
    );
  }, [translateX, unmount]);

  useBackToClose(isTop, close);

  const onLayout = () => {
    if (shownRef.current) return;
    shownRef.current = true;
    Animated.timing(translateX, { toValue: 0, duration: 300, easing: EASE_OUT, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fs, { transform: [{ translateX }] }]} onLayout={onLayout}>
      <View style={[styles.fsHead, { paddingTop: 14 + insets.top }]}>
        <IconBtn name="chevL" label="Back" onPress={close} size={22} />
        <Text style={styles.fsTitle}>{title}</Text>
      </View>
      <KeyboardAvoidingView style={styles.fsBodyWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.fsBody, { paddingBottom: 46 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {content({ close })}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(30,36,34,.32)' },
  backdropDark: { backgroundColor: 'rgba(30,36,34,.36)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...shadow(3),
  },
  sheetGrab: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  sheetHandle: { width: 36, height: 4.5, borderRadius: 99, backgroundColor: C.handle, alignSelf: 'center', marginBottom: 6 },
  sheetTitle: { textAlign: 'center', fontSize: 17.5, fontWeight: '700', color: C.text, paddingVertical: 3 },
  sheetScroll: { flexGrow: 0, maxHeight: SCREEN_H * 0.88 },
  sheetContent: { paddingHorizontal: 22, paddingTop: 12 },
  dialogCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '100%',
    backgroundColor: C.surface,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 14,
    ...shadow(3),
  },
  dialogTitle: { fontSize: 20.5, fontWeight: '800', color: C.text },
  // ref .dialog p { line-height: 1.55 } of 14.5px
  dialogMsg: { marginTop: 10, fontSize: 14.5, lineHeight: 22.47, color: C.text2 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 16 },
  fs: { backgroundColor: C.bg },
  fsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, paddingLeft: 10 },
  fsTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: C.text },
  fsBodyWrap: { flex: 1 },
  fsBody: { paddingHorizontal: 22, paddingTop: 8 },
});
