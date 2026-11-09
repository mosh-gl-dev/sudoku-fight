import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, text, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { Icon, type IconName } from '../Icon';
import { Button, type ButtonVariant, buttonLabelInset, buttonLabelStyle } from './Button';
import { useModalWindow } from './modalWindows';
import { usePresence } from './motion';
import { Scrim } from './Scrim';

import { Text } from './Text';
/**
 * `danger`: the confirm action is destructive (surrender, end practice). Spec §6.6: "ביטול" is the prominent,
 * safe button (gold primary, wider), and the confirm is the red outline. `neutral`: the confirm is the primary.
 */
export type ConfirmTone = 'danger' | 'neutral';
/** `bottom`: in-game, the board stays visible above it (§14.1). `center`: a dialog outside a game (§14.2). */
export type ConfirmPlacement = 'bottom' | 'center';

/** Between the two actions, side by side or stacked (components.md §14: 12). */
const ACTIONS_GAP = space[6];
/** Width shares of the two actions (components.md §14): the prominent one is wider. */
const PROMINENT_FLEX: Record<ConfirmTone, number> = { danger: 1.4, neutral: 1.5 };
/** The centred dialog grows from 96% (components.md §14.2). */
const DIALOG_FROM_SCALE = 0.96;
/** How far above its place the hidden copy of a label is drawn: off any screen. */
const OFFSCREEN = 10000;

/**
 * Each label's own width (one line, in its button's style), once measured: the next dialog with the same label
 * decides row or column on its first frame, with no hidden copy to lay out (and no row-to-column switch).
 * Keyed by the variant, the size, the phone's text scale and the label itself (a language is its labels).
 */
const labelWidths = new Map<string, number>();
const labelKey = (variant: string, buttonSize: string, fontScale: number, label: string) =>
  `${variant}|${buttonSize}|${fontScale}|${label}`;
/** Tests only: forget the measured widths, so each test lays its own labels out. */
export function forgetLabelWidths(): void {
  labelWidths.clear();
}

/** One action as the row would lay it out: its label's own width (one line), the face's inset, its flex. */
export interface ActionFit {
  /** Undefined until the hidden copy of the label has been laid out. */
  labelWidth: number | undefined;
  inset: number;
  flex: number;
}

/**
 * Whether the actions go one above the other (QA loop 3: Settings' "מחק את החשבון לצמיתות" shrank to a third of
 * "ביטול"'s size beside it). Side by side, each action gets its flex's share of the row; a label wider than its
 * share (with the face's padding) would shrink (Android's adjustsFontSizeToFit has no floor), so both actions
 * take the whole width instead, each on its own line, at the normal size (a second line where even that is
 * too narrow: German, French, Vietnamese…). False until the row is measured.
 */
export function stacksActions(rowWidth: number, gap: number, actions: readonly ActionFit[]): boolean {
  if (rowWidth <= 0) return false;
  const totalFlex = actions.reduce((sum, a) => sum + a.flex, 0);
  const room = rowWidth - gap * (actions.length - 1);
  return actions.some(
    (a) => a.labelWidth !== undefined && a.labelWidth + 2 * a.inset > (room * a.flex) / totalFlex + 0.5,
  );
}

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  /** Text, or a node with mixed styling (e.g. "−15" in red Teko). */
  body?: ReactNode;
  confirmLabel: string;
  /** Default "ביטול". */
  cancelLabel?: string;
  onConfirm: () => void;
  /**
   * Cancel button, scrim tap, Android back and the iOS escape gesture all call this. The scrim only once the
   * dialog has finished entering: a tap there before is one meant for a button still on its way.
   */
  onCancel: () => void;
  /**
   * The dialog has closed and left the screen: its exit animation is over and its window is gone. What must
   * not happen under a closing dialog waits for this (the game screen replaced by the results, bug 9).
   */
  onExited?: () => void;
  tone?: ConfirmTone;
  placement?: ConfirmPlacement;
  /** Icon in a 40 dp circle (the surrender flag). */
  icon?: IconName;
  /** Small outlined chip above the title (bottom placement), e.g. "כניעה". */
  chip?: string;
  /** Line under the actions, e.g. "המשחק ממשיך ברקע". */
  footnote?: string;
  /** Extra content between the body and the actions (e.g. the score summary). */
  children?: ReactNode;
  /** Shows a spinner on the confirm button while the action runs. */
  confirmLoading?: boolean;
  /**
   * A notice: the confirm (e.g. "הבנתי") is the only action, and the screen reader's focus starts on it. The
   * scrim, Android back and the escape gesture still call onCancel.
   */
  notice?: boolean;
  /** Dialog label for screen readers (default: the title), e.g. "אישור כניעה". */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A confirmation (components.md §14). Two shells with one content model: icon, chip, title, body, actions,
 * footnote. Screen-reader focus starts on the safe action ("ביטול"), and every way out of it is a cancel.
 */
export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onExited,
  tone = 'neutral',
  placement = 'bottom',
  icon,
  chip,
  footnote,
  children,
  confirmLoading = false,
  notice = false,
  accessibilityLabel,
  testID,
}: ConfirmModalProps) {
  const { t } = useTranslation('ui');
  const reduce = useReduceMotion();
  const { bottom } = useSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const center = placement === 'center';
  const { mounted, progress } = usePresence(
    visible,
    {
      inMs: center ? motion.duration.stateChange : motion.duration.sheetIn,
      outMs: center ? motion.duration.stateChange : motion.duration.sheetOut,
      reduce,
    },
    onExited,
  );
  // Its own window: no stage takes the focus it moves for the app leaving (modalWindows.ts).
  useModalWindow(mounted);
  const panelHeight = useSharedValue(windowHeight);
  const cancelRef = useRef<ComponentRef<typeof View>>(null);
  // The actions row's width; each label's own width is in labelWidths (a render follows each new one).
  const [rowWidth, setRowWidth] = useState(0);
  const [, setMeasured] = useState(0);

  const panelStyle = useAnimatedStyle(() => {
    if (reduce) return { opacity: progress.get() };
    if (center) {
      return {
        opacity: progress.get(),
        transform: [{ scale: interpolate(progress.get(), [0, 1], [DIALOG_FROM_SCALE, 1]) }],
      };
    }
    return { transform: [{ translateY: (1 - progress.get()) * panelHeight.get() }] };
  });

  if (!mounted) return null;

  const danger = tone === 'danger';
  const buttonSize = center ? 'modal' : 'lg';
  const cancelText = cancelLabel ?? t('modal.cancel');
  const cancelVariant: Exclude<ButtonVariant, 'ghost'> = danger ? 'primary' : 'secondary';
  const confirmVariant: Exclude<ButtonVariant, 'ghost'> = danger ? 'danger' : 'primary';
  const cancelFlex = danger ? PROMINENT_FLEX.danger : 1;
  const confirmFlex = danger ? 1 : PROMINENT_FLEX.neutral;
  const cancelKey = labelKey(cancelVariant, buttonSize, fontScale, cancelText);
  const confirmKey = labelKey(confirmVariant, buttonSize, fontScale, confirmLabel);
  const confirmFit = {
    labelWidth: labelWidths.get(confirmKey),
    inset: buttonLabelInset(confirmVariant),
    flex: confirmFlex,
  };
  const stacked = stacksActions(
    rowWidth,
    ACTIONS_GAP,
    notice
      ? [confirmFit]
      : [
          {
            labelWidth: labelWidths.get(cancelKey),
            inset: buttonLabelInset(cancelVariant),
            flex: cancelFlex,
          },
          confirmFit,
        ],
  );
  // The two side by side: the one that isn't the gold primary skews with it, so the edges between them run
  // parallel (the pair rule, D130, components.md §1.0). One above the other (stacked), each takes the whole
  // width, the pair rule doesn't apply, and a label too long for the whole width takes a second line.
  // Backing out commits nothing, so "ביטול" stays silent even where it is the gold primary (danger).
  const cancel = (
    <Button
      ref={cancelRef}
      label={cancelText}
      onPress={onCancel}
      variant={cancelVariant}
      cue={null}
      skew={!danger && !stacked}
      size={buttonSize}
      wrapLabel={stacked ? 'always' : false}
      style={stacked ? undefined : { flex: cancelFlex }}
      testID={testID && `${testID}-cancel`}
    />
  );
  const confirm = (
    <Button
      ref={notice ? cancelRef : undefined}
      label={confirmLabel}
      onPress={onConfirm}
      variant={confirmVariant}
      skew={danger && !stacked}
      size={buttonSize}
      wrapLabel={stacked ? 'always' : false}
      loading={confirmLoading}
      style={stacked ? undefined : { flex: confirmFlex }}
      testID={testID && `${testID}-confirm`}
    />
  );
  // A label not measured yet, once more, on one line in its button's style, for its own width (stacksActions).
  // Only until it is measured (a frame), and off the screen meanwhile: never a second copy of a button's text
  // over the buttons, for a finger or for a tool that finds a control by its text (uiautomator).
  const measure = (label: string, variant: Exclude<ButtonVariant, 'ghost'>, which: 'cancel' | 'confirm') => {
    const key = which === 'cancel' ? cancelKey : confirmKey;
    if (labelWidths.has(key)) return null;
    return (
      <Text
        style={buttonLabelStyle(variant, buttonSize)}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width <= 0 || labelWidths.get(key) === width) return;
          labelWidths.set(key, width);
          setMeasured((n) => n + 1);
        }}
        testID={testID && `${testID}-measure-${which}`}
      >
        {label}
      </Text>
    );
  };
  const measureCancel = notice ? null : measure(cancelText, cancelVariant, 'cancel');
  const measureConfirm = measure(confirmLabel, confirmVariant, 'confirm');

  const iconCircle = icon ? (
    <View style={[styles.iconCircle, danger ? styles.iconCircleDanger : styles.iconCircleNeutral]}>
      <Icon name={icon} size={size.icon.inline} color={danger ? color.danger : color.textMuted} />
    </View>
  ) : null;
  const titleText = (
    <Text accessibilityRole="header" style={center ? styles.titleCenter : styles.title}>
      {title}
    </Text>
  );
  const bodyNode =
    typeof body === 'string' ? (
      <Text style={[styles.body, !center && styles.centredText]}>{body}</Text>
    ) : (
      body
    );

  const focusCancel = () => {
    if (cancelRef.current) AccessibilityInfo.sendAccessibilityEvent(cancelRef.current, 'focus');
  };
  // The scrim cancels only once the panel has come all the way in. While it enters (later still on a slow
  // phone, when the JS thread is busy) the screen above the moving panel is scrim, and a tap meant for a
  // button that is not there yet ("כן, להיכנע") landed on it and cancelled: no surrender, the game went on
  // (QA loop 2, 2 taps in 9 at 1.0–1.5 s). During the enter such a tap does nothing; the buttons, Android back
  // and the escape gesture work from the first frame.
  const scrimPress = () => {
    if (progress.get() >= 1) onCancel();
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
      onShow={focusCancel}
      testID={testID}
    >
      <View
        style={center ? styles.rootCenter : styles.rootBottom}
        accessibilityViewIsModal
        testID={testID && `${testID}-overlay`}
      >
        <Scrim progress={progress} onPress={scrimPress} testID={testID && `${testID}-scrim`} />
        <Animated.View
          role="dialog"
          accessibilityLabel={accessibilityLabel ?? title}
          onAccessibilityEscape={onCancel}
          onLayout={(e) => panelHeight.set(e.nativeEvent.layout.height)}
          style={[
            center ? styles.dialog : [styles.panel, { paddingBottom: space[10] + space[1] + bottom }],
            panelStyle,
          ]}
        >
          {center ? (
            <View style={styles.dialogHeader}>
              {iconCircle}
              <View style={styles.dialogTitle}>{titleText}</View>
            </View>
          ) : (
            <>
              {iconCircle}
              {chip ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ) : null}
              {titleText}
            </>
          )}
          {bodyNode}
          {children}
          <View
            style={[styles.actions, center && styles.actionsCenter, stacked && styles.actionsStacked]}
            onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
            testID={testID && `${testID}-actions`}
          >
            {measureCancel || measureConfirm ? (
              <View
                style={styles.measure}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID={testID && `${testID}-measure`}
              >
                {measureCancel}
                {measureConfirm}
              </View>
            ) : null}
            {notice ? confirm : danger ? cancel : confirm}
            {notice ? null : danger ? confirm : cancel}
          </View>
          {footnote ? (
            <View style={styles.footnote}>
              {danger ? <View style={styles.footnoteDot} /> : null}
              <Text style={styles.footnoteText}>{footnote}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootBottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rootCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.layout.gutterHome,
  },
  panel: {
    alignItems: 'center',
    gap: space[4],
    paddingTop: space[10],
    paddingHorizontal: space[10],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: tokens.border.hairline,
    borderTopColor: color.modal.border,
    backgroundColor: color.modal.bg,
  },
  dialog: {
    alignSelf: 'stretch',
    maxWidth: tokens.layout.screenWidthRef - 2 * tokens.layout.gutterHome,
    gap: space[4],
    padding: space[9],
    borderRadius: radius.xxl,
    borderWidth: tokens.border.hairline,
    borderColor: color.modal.border,
    backgroundColor: color.modal.bg,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
  },
  dialogTitle: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: space[13],
    height: space[13],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDanger: {
    backgroundColor: color.iconBg.danger,
    borderColor: color.danger,
  },
  iconCircleNeutral: {
    backgroundColor: color.iconBg.info,
    borderColor: color.border,
  },
  chip: {
    height: size.toastIcon,
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    borderColor: color.dangerBorder,
    justifyContent: 'center',
  },
  chipText: {
    ...text('badge'),
    color: color.danger,
  },
  title: {
    ...text('h1'),
    color: color.text,
    textAlign: 'center',
  },
  titleCenter: {
    ...text('sheetTitle'),
    color: color.text,
  },
  body: {
    ...text('bodyLong'),
    color: color.textMuted,
  },
  centredText: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: ACTIONS_GAP,
    // 24 above the actions, less the column gap of 8.
    marginTop: space[8],
  },
  actionsCenter: {
    marginTop: space[4],
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  // The row's width for the copies to lay out in, but drawn far above the screen (a transform moves the drawing,
  // not the layout the widths come from), and transparent.
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    opacity: 0,
    transform: [{ translateY: -OFFSCREEN }],
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[4],
  },
  footnoteDot: {
    width: space[3],
    height: space[3],
    borderRadius: radius.pill,
    backgroundColor: color.danger,
  },
  footnoteText: {
    ...text('micro'),
    color: color.textMuted,
  },
});
