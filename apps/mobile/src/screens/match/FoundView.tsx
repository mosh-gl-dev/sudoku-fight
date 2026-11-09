import type { Clock } from '@sudoku-fight/engine';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { afterFrames, SWAP_FRAMES } from '../../components/ui/retire';
import { Slant } from '../../components/ui/slant';
import { Text } from '../../components/ui/Text';
import { systemClock } from '../../game/clock';
import { color, space, text, tokens } from '../../theme';
import { Announcer } from '../game/connection/Announcer';
import { useEnter, useSlam } from '../game/connection/motion';
import { isolateName } from '../game/hit/hitModel';
import type { MatchScreenModel } from './matchModel';
import { metrics } from './metrics';
import { HeaderChip, joinSentences, SeatTile } from './parts';

type FoundModel = Extract<MatchScreenModel, { kind: 'found' }>;

export interface FoundViewProps {
  model: FoundModel;
  reduce: boolean;
  /**
   * When the "מוכן" badges pop, in the clock's time: 800 ms after the match was found (motion.md `vs.slam`), not
   * after this view mounted. A phone slow to draw the VS (half a second on a Galaxy A16) then still shows them
   * before the count, which the server starts 1.2 s after "found" (QA B43). Default: 800 ms after it mounts.
   */
  badgesAt?: number;
  /**
   * Still the screen shown (false once the count took its place, the VS kept under it): nothing pops then, and
   * the avatars are frozen as they are drawn (a nod under way never ends in a new picture under the count, SeatTile
   * `frozen`; docs/PERF.md B14/B32).
   */
  active?: boolean;
  /**
   * The VS is drawn and its slam has swung: what comes next can get ready behind it now, before the badges pop
   * (QA K3: the count's first draw, behind the VS just after the badges, took the UI thread through the avatars'
   * nod, of which two frames were seen; right after the VS's first frame it would hold the slam). Once.
   */
  onSettled?: () => void;
  /** The phone's clock (tests). */
  clock?: Clock;
  testID?: string;
}

/**
 * "נמצא יריב!" (spec §10, original §8; Match-Found in C's look): the VS, every player with avatar, name, flag
 * and rating ("זמני" in the first 10 games), and whether each is ready. D37: a player is ready as soon as
 * their phone is in the match's room, so there is nothing to press; the badges pop in 800 ms after the match
 * was found (motion.md `vs.slam`; reduced motion: the VS fades in and the badges are there at once), each avatar
 * nodding as its "מוכן" shows (SeatTile). Then "כל
 * השחקנים מוכנים · המשחק מתחיל", whether we met lately, and that there is no cancelling from here [D32]. A
 * screen reader hears who was found.
 *
 * Two players face each other across the VS, me at the start edge (right in Hebrew, left in English) as on
 * Match-Found and as my card sits in the game (spec §6.8, components.md §3.1). A table of 3–4 (stage 10,
 * "נמצאו יריבים!") is a grid of two columns in the game's order (me first, then the others by seat, as their
 * cards will sit), each in their colour and shape, the last one centred when there are three.
 */
export function FoundView({
  model: m,
  reduce,
  badgesAt,
  active = true,
  onSettled,
  clock = systemClock,
  testID = 'match-found',
}: FoundViewProps) {
  const { t } = useTranslation('match');
  const insets = useSafeAreaInsets();
  const enter = useEnter(reduce);
  const slam = useSlam(reduce);
  // The "מוכן" badges pop 800 ms after "found"; with reduced motion they are there at once.
  const [popped, setPopped] = useState(false);
  const badges = reduce || popped;

  useEffect(() => {
    if (reduce || popped || !active) return;
    const delay = badgesAt === undefined ? metrics.vs.badgesAtMs : Math.max(0, badgesAt - clock.now());
    const id = setTimeout(() => setPopped(true), delay);
    return () => clearTimeout(id);
  }, [reduce, popped, active, badgesAt, clock]);

  // Settled once the VS is drawn and its slam has swung (vsSettleMs), before the badges: the count's first draw,
  // which comes next behind the VS, then holds the UI thread neither through the slam nor through the nod the
  // badges bring (QA K3). A VS drawn late settles sooner, by the badges less what the count needs (prepareLeadMs),
  // at once once that is past. Reduced motion: nothing slams, settled as soon as it is drawn.
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });
  const [mountedAt] = useState(() => clock.now());
  const settleBy = (badgesAt ?? mountedAt + metrics.vs.badgesAtMs) - metrics.vs.prepareLeadMs;
  const settleRef = useRef({ settleBy, reduce, clock });
  useEffect(() => {
    settleRef.current = { settleBy, reduce, clock };
  });
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stopFrames = afterFrames(SWAP_FRAMES, () => {
      const { settleBy: by, reduce: still, clock: c } = settleRef.current;
      const delay = still ? 0 : Math.max(0, Math.min(metrics.vs.settleMs, by - c.now()));
      timer = setTimeout(() => settled.current?.(), delay);
    });
    return () => {
      stopFrames();
      if (timer !== null) clearTimeout(timer);
    };
  }, [active]);

  const me = m.seats.find((s) => s.isMe);
  const others = m.seats.filter((s) => !s.isMe);
  // The game's order (screens/game seatOrder): me first, then the others by seat.
  const ordered = me ? [me, ...others] : others;
  const names = others.map((s) => isolateName(s.name)).join(t('player:listSep'));
  const total = m.seats.length;
  const opponent = others[0];
  const pair = total === 2 && me && opponent ? { me, opponent } : null;

  return (
    <View style={styles.root} testID={testID}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[10] },
        ]}
      >
        <Animated.View style={[styles.column, enter]}>
          <HeaderChip header={m.header} testID={`${testID}-header`} />
          <Animated.Text style={[styles.title, slam]} accessibilityRole="header" testID={`${testID}-title`}>
            {t('found.title', { count: others.length })}
          </Animated.Text>

          {pair ? (
            <View style={styles.versus} testID={`${testID}-pair`}>
              <SeatTile seat={pair.me} showReady={badges} reduce={reduce} frozen={!active} />
              <Animated.View style={slam} testID={`${testID}-vs`}>
                <View style={styles.vs}>
                  <Slant shapeStyle={styles.vsPlate} />
                  <Text style={styles.vsText}>{t('player:vs')}</Text>
                </View>
              </Animated.View>
              <SeatTile seat={pair.opponent} showReady={badges} reduce={reduce} frozen={!active} />
            </View>
          ) : (
            <View style={styles.grid} testID={`${testID}-grid`}>
              {ordered.map((seat) => (
                <SeatTile
                  key={seat.id}
                  seat={seat}
                  showReady={badges}
                  reduce={reduce}
                  frozen={!active}
                  style={styles.gridTile}
                />
              ))}
            </View>
          )}

          <View
            style={styles.status}
            accessible
            accessibilityLabel={joinSentences(
              [
                m.allReady ? t('found.allReady') : t('found.waiting'),
                t('found.readyCountLabel', { ready: m.readyCount, total }),
              ],
              t,
            )}
            testID={`${testID}-status`}
          >
            {/* Both lines, one over the other: the row is as tall as the taller one, whichever shows, so a
                "ready" that changes the line (one line or two, in any language or font size) moves nothing. */}
            <View style={styles.statusLines}>
              <Text style={[styles.statusText, styles.statusLine, m.allReady && styles.statusReady]}>
                {m.allReady ? t('found.allReady') : t('found.waiting')}
              </Text>
              <Text
                style={[styles.statusText, styles.statusLine, styles.statusSpare]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID={`${testID}-status-spare`}
              >
                {m.allReady ? t('found.waiting') : t('found.allReady')}
              </Text>
            </View>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>{t('found.readyCount')}</Text>
              <Text style={styles.count} testID={`${testID}-count`}>{`${m.readyCount}/${total}`}</Text>
            </View>
          </View>

          <Text style={styles.note} testID={`${testID}-rematch`}>
            {m.rematch ? t('found.rematch') : t('found.fresh')}
          </Text>
          <Text style={styles.noCancel}>{t('found.noCancel')}</Text>
        </Animated.View>
      </ScrollView>
      <Announcer
        line={names ? t('found.announce', { names, count: others.length }) : null}
        testID={`${testID}-live`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: tokens.layout.gutterGame },
  column: { alignItems: 'center', gap: space[9] },
  title: { ...text('screenTitle'), color: color.text, textAlign: 'center' },
  versus: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space[4] },
  vs: {
    width: tokens.size.vsBadge.width,
    height: tokens.size.vsBadge.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Slanted −8° as a drawn shape (Android drops a view's skewX); the word stays upright. */
  vsPlate: {
    borderRadius: tokens.radius.xs,
    borderWidth: tokens.border.hairline,
    borderColor: color.vsBadge.border,
    backgroundColor: color.vsBadge.bg,
  },
  vsText: { ...text('vsBadge'), color: color.vsBadge.text },
  grid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[6],
  },
  /** Two to a row, the same width each (a third one alone is centred, not stretched). */
  gridTile: { flexGrow: 0, flexBasis: '46%' },
  status: { alignSelf: 'stretch', alignItems: 'center', gap: space[4] },
  statusText: { ...text('status'), color: color.textMuted, textAlign: 'center' },
  /** The status lines side by side, the spare one pulled back over the shown one: the taller sets the height. */
  statusLines: { alignSelf: 'stretch', flexDirection: 'row' },
  statusLine: { width: '100%' },
  statusSpare: { marginStart: '-100%', opacity: 0 },
  statusReady: { color: color.success },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  countLabel: { ...text('micro'), color: color.textMuted },
  count: { ...text('scoreCompact'), color: color.text },
  note: { ...text('caption'), color: color.textMuted, textAlign: 'center' },
  noCancel: { ...text('caption'), color: color.textFaint, textAlign: 'center' },
});
