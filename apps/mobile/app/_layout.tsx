import '../src/services/hermesPolyfills';

import { type ErrorBoundaryProps, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthGate } from '../src/auth';
import { InviteLinkPrompt } from '../src/auth/InviteLinkPrompt';
import { AmbientLayer } from '../src/components/ambient/AmbientLayer';
import { ToastViewport } from '../src/components/ui';
import { displayConfig } from '../src/config/display';
import { useFlowStack } from '../src/game/flowStack';
import { openPracticeStorage } from '../src/game/storage';
import i18n from '../src/i18n';
import { syncLanguageWithSystem, useLanguageLifecycle } from '../src/i18n/languageSync';
import { installPseudoLanguages } from '../src/i18n/pseudoLanguages';
import { MusicDirector } from '../src/music/MusicDirector';
import { startProgress } from '../src/progress';
import { SplashOverlay } from '../src/screens/account/SplashScreen';
import { ErrorScreen } from '../src/screens/ErrorScreen';
import { gameRouteTransition } from '../src/screens/match/goHandoff';
import { track } from '../src/services/analytics';
import { useKeepScreenOn } from '../src/services/keepAwake';
import { logFirstScreen, useAfterFirstScreen } from '../src/services/startup';
import {
  hideSystemSplash,
  hideSystemSplashAfterLayout,
  holdSystemSplash,
  useSystemSplashCovering,
  useSystemSplashFailSafe,
} from '../src/services/systemSplash';
import { startTelemetry } from '../src/services/telemetry';
import { useScreenViews } from '../src/services/telemetry/useScreenViews';
import { color } from '../src/theme';
import { useAppFonts } from '../src/theme/fonts';
import { useReduceMotion } from '../src/theme/motion';
import { MotionPolicy } from '../src/theme/MotionPolicy';
import { NAVIGATION_THEME, SCREEN_CONTENT_STYLE, transitions } from '../src/theme/transitions';

// The system splash waits for the app's Splash to be drawn, and hands over to it (services/systemSplash.ts).
holdSystemSplash();
// Development and staging builds: the pseudo languages en-XA and ar-XB (plan 0יג); elsewhere a saved one goes.
installPseudoLanguages();
// The language from the first frame (localization plan 0א): the saved setting (read synchronously), after the
// system's word (a language chosen for the app in the system settings wins), saved; i18n/index.ts started in it.
void i18n.changeLanguage(syncLanguageWithSystem());

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const reduceMotion = useReduceMotion();
  // Accounts (stage 8): who is signed in, and the screens their status allows (login, registration, Home).
  const { splash } = useAuthGate();
  // The app's Splash is also up while the system splash is held over it and until it has been seen after that
  // one's exit, so the system splash always uncovers it (never Home) and the two never go together.
  const systemSplashCovering = useSystemSplashCovering();
  const covered = splash || systemSplashCovering;
  // A recreated activity's root on a live flow gets the screens under it back (QA cancel-after-recreate…).
  useFlowStack();

  // Spec §22 (open in under 2 s): the work the first screen doesn't need starts once it is up (docs/PERF.md).
  // The first screen is up once the Splash over it goes (the sign-in, and the system splash's handoff).
  useAfterFirstScreen(fontsReady && !covered, startBackgroundWork);
  useEffect(() => {
    if (fontsReady && !covered) logFirstScreen();
  }, [fontsReady, covered]);
  // Spec §22: one app_open per run.
  useEffect(() => track('app_open'), []);
  // Spec §27.1: a screen_view for each screen entered (its route pattern; not the dev tools).
  useScreenViews();
  // Spec §22 (Moshe's device test, 15.10.2026): the screen stays on while the app is open, on every screen.
  useKeepScreenOn(displayConfig.keepScreenOn);

  // The language and its direction: a direction React Native didn't start with needs a restart (once, D104's
  // guard); a change while running restarts (D104), and so does one made in the system settings, read on every
  // return to the foreground (i18n/languageSync.ts).
  useLanguageLifecycle();

  // The system splash goes when the app's Splash has laid out (its onLayout below), not here at "ready": hidden
  // here, it went before the app's Splash was drawn and together with it (QA account-open-splash-look). This is
  // only the fail-safe, should no layout ever say so (and Expo Go's hide, which has no handoff).
  useSystemSplashFailSafe(fontsReady);

  // The app's Reduced Motion decision for every animation, from the first render on (same place in both returns,
  // so it never remounts).
  if (!fontsReady) return <MotionPolicy />;
  const moves = transitions(reduceMotion);
  return (
    <>
      <MotionPolicy />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
        <StatusBar style="light" />
        {/* D126 (Moshe 31.10.2026, "בכל מקום שבו יש רקע"): the wandering digits, once, behind every screen. */}
        <AmbientLayer covered={covered} />
        {/* Under the Splash, the app is hidden from screen readers until it is the right screen. */}
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={covered}
          importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        >
          {/* The screens are transparent over the digits (D126), so every change cross-fades (motion.md §4.9);
              screen transitions are animations too: with Reduced Motion they are shorter fades (spec §22). The
              navigator's own background is transparent too (iOS paints it under the screens). */}
          <ThemeProvider value={NAVIGATION_THEME}>
            <Stack screenOptions={{ headerShown: false, contentStyle: SCREEN_CONTENT_STYLE, ...moves.menu }}>
              {/* Over a ranked match's GO! (handed to the game's GoCover), the game comes in at once (goHandoff.ts). */}
              <Stack.Screen name="game" options={({ route }) => gameRouteTransition(moves.flow, route.key)} />
              <Stack.Screen name="results/[id]" options={moves.flow} />
              {/* Staged practice (1.0.2): a stage, its "מוכן?" and its result are one flow; no back swipe mid-stage. */}
              <Stack.Screen name="levels/play" options={{ ...moves.flow, gestureEnabled: false }} />
              <Stack.Screen name="leaderboard" options={moves.tab} />
              <Stack.Screen name="history" options={moves.tab} />
              <Stack.Screen name="achievements" options={moves.tab} />
            </Stack>
          </ThemeProvider>
        </View>
        {/* The music (config/music.ts): what plays where, silence under the Splash (spec §22, D-row "מוזיקה"). */}
        <MusicDirector covered={covered} />
        {/* Spec §4.2: the Splash while the sign-in loads (and its "try again" when the profile can't). Its first
            layout sends the system splash away, and it stays until it has been seen after that exit
            (services/systemSplash.ts). */}
        <SplashOverlay visible={covered} onFirstLayout={hideSystemSplashAfterLayout} />
        {/* 1.0.4 (friends-room.md §6.6): a room link while the app runs, in or asked first; a waiting invite. */}
        <InviteLinkPrompt />
        {/* The one toast viewport of the app (components.md §15.1): screens call useToast().show(). */}
        <ToastViewport />
      </GestureHandlerRootView>
    </>
  );
}

/**
 * What waits for the first screen (spec §22: open in under 2 s): each waits on the disk or the network, and the
 * first screen needs none of them. Returns what stops them.
 */
function startBackgroundWork(): () => void {
  // Spec §27.1: usage reports to our server. Loads the events earlier runs left, sends them, and keeps sending.
  // (track() queues in memory until then: app_open is not lost.)
  startTelemetry();
  // Stage 12 [D41]: the practice XP waiting on the phone goes to the server, and my progress is read, when a
  // player is signed in (and again each time the app comes back to the foreground).
  const stopProgress = startProgress();
  // The practice database [D25]: open it once per run, which marks games the last run left playing as
  // interrupted. Nothing waits for it (a screen that needs it first opens it itself, the same promise); a
  // failure is logged, and practice then plays without saving.
  openPracticeStorage().catch((error: unknown) =>
    console.warn('[practice] could not open the local database', error),
  );
  return stopProgress;
}

/** A render error anywhere: recorded in Crashlytics, with a way to try again (stage 8). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // The error screen is never left under the system splash.
  useEffect(() => hideSystemSplash({ handOver: false }), []);
  return <ErrorScreen error={error} retry={retry} />;
}
