/**
 * Every Android TextView of the app breaks its lines where React Native measured them (QA 2026-11-03 on the
 * Galaxy A16, Android 16: Arabic "سلسلة الفوز" on the player card showed "سلسلة", the solo results header
 * "تدريب فردي · سريع" showed "تدريب فردي ·", the Thai History chip "แรงก์" showed "แร", each with no "…").
 *
 * React Native 0.86 measures a Text for Yoga in TextLayoutManager with a StaticLayout that breaks lines by the
 * glyphs' advances (StaticLayout.Builder's default), and gives the view exactly that size. The view that draws
 * the text is a TextView (ReactTextView; an EditText for a TextInput), which lays the text out again in that
 * size. Since Android 15, a TextView in an app that targets API 35 or later breaks lines by the glyphs' bounding
 * boxes instead (TextView#setUseBoundsForWidth: "true by default if the target API version is 35 or later"; the
 * app targets 36). A glyph that reaches past its advance (Rubik's Arabic ر and ز reach 49/1000 em past their
 * start, Thai marks past their letter) makes the drawn line a pixel or two wider than the measured one, so the
 * TextView breaks it again and the last word drops onto a line the measured box has no room for: it is gone,
 * with no ellipsis. Rubik's Hebrew and Latin glyphs stay inside their advances, which is why Arabic and Thai
 * showed it first; any string could, at a width that is just enough.
 *
 * The theme's `android:useBoundsForWidth` false gives every TextView and EditText of the app the advances
 * again: the same model the measurement uses, as on Android 14 and older. Android before 15 has no such
 * attribute and ignores the item (`tools:targetApi` keeps the build's lint quiet). iOS is not affected.
 */
const { AndroidConfig, withAndroidStyles } = require('expo/config-plugins');

/** The theme item (res/values/styles.xml, AppTheme). */
const ITEM = 'android:useBoundsForWidth';
/** The first API level that has it. */
const TARGET_API = '35';

/** styles.xml (as prebuild parses it) with AppTheme's item set. */
function setAdvanceWidths(styles) {
  return AndroidConfig.Styles.assignStylesValue(styles, {
    add: true,
    parent: AndroidConfig.Styles.getAppThemeGroup(),
    name: ITEM,
    value: 'false',
    targetApi: TARGET_API,
  });
}

function withTextAdvanceWidths(config) {
  return withAndroidStyles(config, (c) => {
    c.modResults = setAdvanceWidths(c.modResults);
    return c;
  });
}

module.exports = withTextAdvanceWidths;
module.exports.ITEM = ITEM;
module.exports.TARGET_API = TARGET_API;
module.exports.setAdvanceWidths = setAdvanceWidths;
