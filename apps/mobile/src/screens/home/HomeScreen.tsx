import { botLevel as botLevelInfo } from '@sudoku-fight/engine';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isSuspended, needsNewName } from '../../api/me';
import { refreshMeIfStale, useAuth } from '../../auth/authStore';
import { useScreenFocused } from '../../avatars/useScreenFocused';
import { ltr } from '../../components/player';
import { BottomNav, Button, IconButton, RowButton, useToast } from '../../components/ui';
import { Enter } from '../../components/ui/Enter';
import { Text } from '../../components/ui/Text';
import { useGameStore } from '../../game/gameStore';
import { useConnectivity, useConnectivityWatch, watchConnectionWhileShown } from '../../net/connectivity';
import { refreshMyProgress, syncProgressNow } from '../../progress/appProgress';
import { useMyCard, useMyProgress } from '../../progress/hooks';
import { cue } from '../../services/feedback';
import { VerifyBanner } from '../account/VerifyEmailScreen';
import { Announcer } from '../game/connection/Announcer';
import { SuspendedBanner } from '../moderation/SuspendedBanner';
import { openPlayerCard } from '../player/navigation';
import { usePracticeHistory } from '../../state/practiceHistory';
import { useProfile } from '../../state/profile';
import { color, size, space, text, tokens } from '../../theme';
import { HOME_ENTRANCE, homeEntrancePending, markHomeEntrancePlayed } from './homeEntrance';
import { HOME_RECENT_COUNT, lastPlayOf } from './homeModel';
import { goToTab } from './navigation';
import { OfflineBanner } from './OfflineBanner';
import { GUTTER } from './parts';
import { usePracticeStats } from './practiceStats';
import { ProfileCard } from './ProfileCard';
import { RecentGames } from './RecentGames';
import { startAndOpen } from './startGame';
import { warmModesLater } from './warmModes';

const HOME = tokens.layout.home;

export interface HomeScreenProps {
  /**
   * Development builds: links to the dev screens (the design system, the stage-0 hello screen, and stage 7's
   * online game and network measures).
   */
  devLinks?: boolean;
}

/**
 * Home, first version (spec §4.3; Dir-C-Home for the look, Home for the content). The player card on top, the
 * big "שחק", "עוד סיבוב" with the last setting, the latest practices saved on this phone, and the bottom
 * navigation. Every time Home comes into view it reads the saved games again, so a game just played (or one
 * saved before the app was closed) is there.
 *
 * Stage 8: the card is the account's (name, avatar, country and ratings from GET /v1/me, kept on the phone so
 * Home opens offline); pressing it opens the profile. Home reads the account again each time it comes into view,
 * at most every refresh.minIntervalMs (config/account.ts), and at once when it came from the phone; after a
 * ranked game the new rating shows at once and is confirmed with the server in the background
 * (progress/rankedRefresh.ts), so no restart is needed. Until the email is verified, a banner under the card
 * leads to /verify-email [D22]. Without an account profile (tests of the home screens alone) the card falls
 * back to the local profile.
 *
 * Spec §3.5: while the account is suspended, a banner under the card leads to the suspension's screen, and a ranked
 * "עוד סיבוב" is dimmed with "החשבון מושעה".
 *
 * Stage 13 (spec §16.1): Home asks the server too (net/connectivity.ts). Without an answer the banner "אין
 * חיבור לאינטרנט" shows under the card, and a ranked "עוד סיבוב" is dimmed with "דורש חיבור"; the app checks
 * again in the background, and both go when the connection is back.
 */
export function HomeScreen({ devLinks = __DEV__ }: HomeScreenProps) {
  const { t, i18n } = useTranslation('home');
  const { t: tDev } = useTranslation('dev');
  const { top } = useSafeAreaInsets();
  const me = useAuth((s) => s.me);
  const localName = useProfile((s) => s.name);
  const localAvatar = useProfile((s) => s.avatarId);
  const localCountry = useProfile((s) => s.country);
  const name = me?.displayName ?? localName;
  const avatarId = me?.avatarId ?? localAvatar;
  const country = me?.country ?? localCountry;
  const lastPlay = useProfile((s) => s.lastPlay);
  const botLevel = useProfile((s) => s.botLevel);
  const recent = usePracticeHistory((s) => s.recent);
  const status = usePracticeHistory((s) => s.status);
  const practiceGames = usePracticeStats((s) => s.gamesPlayed);
  const practiceWinRate = usePracticeStats((s) => s.winRate);
  const practiceStreak = usePracticeStats((s) => s.streak);
  // Stage 12: my level, XP and league, and my card's numbers (the ranked games, spec §4.3), saved on the
  // phone; before my card came (offline at first, no account), the practices saved here.
  const myProgress = useMyProgress();
  const myStats = useMyCard()?.stats ?? null;
  const gamesPlayed = myStats ? myStats.games : practiceGames;
  const winRate = myStats ? myStats.winRate : practiceWinRate;
  const streak = myStats ? (myStats.games > 0 ? myStats.streak : null) : practiceStreak;
  const [starting, setStarting] = useState(false);
  const connectivity = useConnectivityWatch();
  const offline = connectivity.status === 'offline';
  // MOT-3: the first time Home is seen in this run, its parts come in; it waits for the Splash to go (Home is
  // mounted under it while the sign-in loads: Home stays only for a player who is in, auth/redirect.ts) and for
  // Home to be the screen shown. Once Home has been left after that, what mounts later (a new recent game) is
  // simply there. Derived during render. Whether Home is shown matters only until then: after it, a change of
  // screen never renders Home (B14).
  const [entrance, setEntrance] = useState(homeEntrancePending);
  const shown = useScreenFocused(entrance);
  const splashGone = useAuth((s) => s.status === 'ready' && !needsNewName(s.me));
  const enter = entrance && shown && splashGone;
  const [entered, setEntered] = useState(false);
  if (enter && !entered) setEntered(true);
  if (entered && !shown && entrance) setEntrance(false);
  useEffect(() => {
    if (enter) markHomeEntrancePlayed();
  }, [enter]);
  // The first "משחק חדש" after the start (QA run #3, T3-FIRST-PLAY-SLOW): its code and my avatar's pictures there
  // are made once Home has settled, not on the first tap (./warmModes.ts). Modes draws the profile's avatar. Only
  // while Home is the screen shown: a game opened meanwhile ("עוד סיבוב") stops it (Home stays mounted under it).
  useFocusEffect(
    useCallback(() => (splashGone ? warmModesLater(localAvatar) : undefined), [splashGone, localAvatar]),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshHome();
      // The account again (a ranked game just played moved its ratings): at most every
      // accountConfig.refresh.minIntervalMs, and at once when it came from the phone (no server last time).
      void refreshMeIfStale();
      // The connection again (Home stays mounted under the other screens, so its watch checked only once): an
      // app that went offline meanwhile knows it, and its background check sees the connection come back, which
      // sends what waits and brings my new XP while Home stays open (QA levels-xp-offline, loop 5).
      void useConnectivity.getState().check();
      // What waits (stages and practices played offline) goes now, past the backoff; its answer is my new XP.
      syncProgressNow();
      // My level, XP and league, and my card's numbers (a game just played moved them).
      void refreshMyProgress();
    }, []),
  );
  // While Home is shown, the connection is checked again now and then (QA account-home-offline): flight mode
  // turned on with Home open brings the banner and the dimmed ranked "עוד סיבוב" within seconds, not only after
  // a restart. Stops when another screen comes over Home (a game: no checks under it).
  useFocusEffect(watchConnectionWhileShown);

  // "עוד סיבוב" (spec §4.3): the last setting; against a bot, with the bot's name ("· Pip"); ranked, with the
  // table's size (stage 9: a search in the same queue).
  const again = lastPlayOf(lastPlay, recent, botLevel);
  let againText: string | null = null;
  if (again) {
    const parts = { mode: t(`modes.${again.mode}.name`), type: t(`gameTypes.${again.gameType}.name`) };
    againText =
      again.botLevel !== undefined
        ? t('again.subtitleBot', { ...parts, bot: ltr(botLevelInfo(again.botLevel).name) })
        : again.players !== undefined
          ? t('again.subtitleRanked', { ...parts, players: t('match:players', { count: again.players }) })
          : t('again.subtitle', parts);
  }
  // Spec §16.1: a ranked game needs the connection; spec §3.5: and an account that isn't suspended.
  const suspended = isSuspended(me);
  const againBlocked = (offline || suspended) && again?.mode === 'ranked';
  if (againText && againBlocked)
    againText = `${againText}${t('player:sep')}${
      suspended ? t('moderation:suspended.chip') : t('match:offline.needsConnection')
    }`;

  const playAgain = async () => {
    if (!again || starting || againBlocked) return;
    cue('primaryPress');
    setStarting(true);
    const ok = await startAndOpen(again, 'push');
    setStarting(false);
    if (!ok) useToast.getState().show({ variant: 'error', message: t('start.failed') });
  };

  const showSub = i18n.dir() === 'rtl';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top + space[2] }]}
        testID="home-scroll"
      >
        <View style={styles.header}>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={t('brand.name')}
            style={styles.brand}
          >
            <Text style={styles.wordmark} numberOfLines={1}>
              <Text style={styles.wordStart}>{t('brand.wordStart')}</Text>{' '}
              <Text style={styles.wordEnd}>{t('brand.wordEnd')}</Text>
            </Text>
            {showSub ? <Text style={styles.brandSub}>{t('brand.sub')}</Text> : null}
          </View>
          <IconButton
            icon="settings"
            iconSize="header"
            accessibilityLabel={t('header.settings')}
            onPress={() => router.push('/settings')}
            testID="open-settings"
          />
        </View>

        <Enter enabled={entrance} play={enter} delayMs={HOME_ENTRANCE.card} style={styles.card}>
          <ProfileCard
            name={name ?? t('profile.defaultName')}
            avatarId={avatarId}
            country={country}
            gamesPlayed={gamesPlayed}
            winRate={winRate}
            streak={streak}
            ratings={me?.ratings ?? null}
            progress={myProgress}
            onPress={me ? () => openPlayerCard(me.id) : undefined}
          />
        </Enter>
        <SuspendedBanner style={styles.verify} />
        <VerifyBanner style={styles.verify} />
        {offline ? (
          <View style={styles.offline}>
            <OfflineBanner checking={connectivity.checking} testID="home-offline" />
          </View>
        ) : null}

        <Enter kind="settle" enabled={entrance} play={enter} delayMs={HOME_ENTRANCE.play} style={styles.play}>
          <Button
            label={t('play')}
            size="hero"
            onPress={() => router.push('/modes')}
            accessibilityHint={t('playHint')}
            testID="play"
          />
        </Enter>

        {again && againText ? (
          <Enter enabled={entrance} play={enter} delayMs={HOME_ENTRANCE.again} style={styles.again}>
            <RowButton
              icon="refresh"
              title={t('again.title')}
              subtitle={againText}
              onPress={() => void playAgain()}
              loading={starting}
              disabled={againBlocked}
              testID="play-again"
            />
          </Enter>
        ) : null}

        <Enter
          enabled={entrance}
          play={enter}
          delayMs={HOME_ENTRANCE.recentHeader}
          style={styles.recentHeader}
        >
          <Text accessibilityRole="header" style={styles.recentTitle}>
            {t('recent.heading')}
          </Text>
          <Button
            variant="ghost"
            label={t('recent.all')}
            onPress={() => goToTab('history', 'home')}
            testID="recent-all"
          />
        </Enter>
        <View style={styles.recent}>
          <RecentGames
            games={recent.slice(0, HOME_RECENT_COUNT)}
            status={status}
            onOpen={(id) => router.push({ pathname: '/results/[id]', params: { id } })}
            entrance={{ enabled: entrance, play: enter, delayMs: HOME_ENTRANCE.recent }}
          />
        </View>

        {devLinks ? (
          <View style={styles.dev} testID="dev-links">
            <Text style={styles.devTitle}>{t('dev.title')}</Text>
            <View style={styles.devRow}>
              <Button
                variant="ghost"
                label={t('dev.designSystem')}
                onPress={() => router.push('/dev/design-system')}
                testID="dev-design-system"
              />
              <Button
                variant="ghost"
                label={t('dev.hello')}
                onPress={() => router.push('/dev/hello')}
                testID="dev-hello"
              />
              <Button
                variant="ghost"
                label={tDev('link.online')}
                accessibilityHint={tDev('link.onlineHint')}
                onPress={() => router.push('/dev/online')}
                testID="dev-online"
              />
              <Button
                variant="ghost"
                label={tDev('link.metrics')}
                accessibilityHint={tDev('link.metricsHint')}
                onPress={() => router.push('/dev/metrics')}
                testID="dev-metrics"
              />
              <Button
                variant="ghost"
                label={tDev('link.sounds')}
                accessibilityHint={tDev('link.soundsHint')}
                onPress={() => router.push('/dev/sounds')}
                testID="dev-sounds"
              />
              <Button
                variant="ghost"
                label={tDev('link.avatars')}
                accessibilityHint={tDev('link.avatarsHint')}
                onPress={() => router.push('/dev/avatars')}
                testID="dev-avatars"
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
      <BottomNav active="home" onSelect={(tab) => goToTab(tab, 'home')} testID="nav" />
      {/* Spec §16.1: losing the connection is said to screen readers, not only drawn (the banner). */}
      <Announcer line={offline ? t('match:offline.title') : null} testID="home-live" />
    </View>
  );
}

/**
 * Reads the saved games and the numbers again. A game the player has just left is closed first (a running one
 * is saved as interrupted) and its last writes are awaited, so the list already has its final row.
 */
async function refreshHome(): Promise<void> {
  const { session, clear } = useGameStore.getState();
  if (session) {
    clear();
    await session.flush();
  }
  await Promise.all([usePracticeHistory.getState().refresh(), usePracticeStats.getState().refresh()]);
}

const styles = StyleSheet.create({
  // Transparent: the wandering digits behind every screen show through (D126, app/_layout.tsx).
  screen: { flex: 1 },
  content: { paddingHorizontal: GUTTER.home, paddingBottom: space[13] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HOME.headerHeight,
  },
  brand: { alignItems: 'flex-start', gap: space[3] },
  wordmark: { ...text('brandWordmark') },
  wordStart: { color: color.textMuted },
  wordEnd: { color: color.text },
  brandSub: { ...text('brandSub'), color: color.textMuted },
  card: { marginTop: HOME.profileCardTop },
  verify: { marginTop: space[6] },
  offline: { marginTop: space[6] },
  play: { marginTop: HOME.ctaTop },
  again: { marginTop: HOME.rowButtonTop },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: size.touch,
    marginTop: HOME.recentHeaderTop,
  },
  recentTitle: { ...text('h2'), color: color.text },
  recent: { marginTop: HOME.recentRowTop },
  dev: { marginTop: space[12], gap: space[2], alignItems: 'flex-start' },
  devTitle: { ...text('micro'), color: color.textFaint },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
});
