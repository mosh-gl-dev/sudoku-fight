/**
 * The app's dark mode from the Application's start, before any activity (QA "nav-bar-light-on-some-screens",
 * APK 19: Android's 3-button navigation bar was light grey with dark buttons on some screens and dark on others,
 * on the same phone, with no pattern by screen).
 *
 * The app is edge to edge (React Native 0.86, target API 36): the navigation bar is transparent and Android puts
 * a scrim behind its buttons, light or dark by the window's "light navigation bars" flag. React Native sets that
 * flag once, when the activity is created (WindowUtil.kt enableEdgeToEdge, through expo-modules-core's
 * EdgeToEdgePackage): light when the activity's configuration is not night. The app is dark
 * (`userInterfaceStyle: "dark"`), but expo-system-ui makes it so (AppCompatDelegate.setDefaultNightMode) in an
 * activity listener that runs after EdgeToEdgePackage's (ExpoModulesPackageList's order). So:
 * - An activity created first in its process (a cold start, a relaunch) on a phone whose system theme is light
 *   read "not night": a light scrim for the whole life of that activity, whatever the screen.
 * - An activity recreated in the same process (display size, font size: the QA's density changes) found the
 *   night mode already set: a dark scrim.
 * Which screens it was seen on only followed when the activity had last been created.
 *
 * The fix: MainApplication.onCreate sets AppCompat's night mode from `userInterfaceStyle`, before any activity,
 * so every activity (and every Modal's dialog over it) is created dark and gets the dark scrim with light
 * buttons, as the app's theme. expo-system-ui's later call sets the same mode (no change, no recreation).
 * "automatic" (or no style) adds nothing: the system's mode, as before.
 */
const { withMainApplication } = require('expo/config-plugins');

/** The marker of the added line (a second prebuild does not add it again). */
const MARKER = '// sudoku-fight: night mode at start (plugins/withNightModeAtStart.js)';

/** AppCompat's mode for each `userInterfaceStyle` (expo-system-ui's own mapping); none for "automatic". */
const MODE_OF = { dark: 'MODE_NIGHT_YES', light: 'MODE_NIGHT_NO' };

/** The Kotlin line for `style`, or null when the system's mode stays. */
function nightModeLine(style) {
  const mode = MODE_OF[String(style ?? '').toLowerCase()];
  if (!mode) return null;
  const delegate = 'androidx.appcompat.app.AppCompatDelegate';
  return `${delegate}.setDefaultNightMode(${delegate}.${mode})`;
}

/** MainApplication.kt (as prebuild writes it) with the night mode set right after `super.onCreate()`. */
function setNightModeAtStart(source, style) {
  const line = nightModeLine(style);
  if (!line || source.includes(MARKER)) return source;
  const match = /^([ \t]*)super\.onCreate\(\)[ \t]*$/m.exec(source);
  if (!match) throw new Error('withNightModeAtStart: no super.onCreate() in MainApplication');
  const indent = match[1];
  const at = match.index + match[0].length;
  return `${source.slice(0, at)}\n${indent}${MARKER}\n${indent}${line}${source.slice(at)}`;
}

function withNightModeAtStart(config) {
  return withMainApplication(config, (c) => {
    if (c.modResults.language !== 'kt') {
      throw new Error('withNightModeAtStart: MainApplication is expected in Kotlin');
    }
    const style = c.android?.userInterfaceStyle ?? c.userInterfaceStyle;
    c.modResults.contents = setNightModeAtStart(c.modResults.contents, style);
    return c;
  });
}

module.exports = withNightModeAtStart;
module.exports.MARKER = MARKER;
module.exports.nightModeLine = nightModeLine;
module.exports.setNightModeAtStart = setNightModeAtStart;
