# העלאה ראשונה ל־Google Play: תוכנית (27.10.2026)

משה ביקש: "להתקדם ולהעלות גירסא לחנות של גוגל". **שום פעולה מחוץ למחשב (commit, יצירת שרת, דיפלוי, בנייה ב־EAS, העלאה) בלי אישור שלו.**

## המצב ב־27.10.2026

- הקוד של 1.1.0 (19 שפות) נשמר ב־commit ‏`87760ce` ונדחף, ו־Staging רץ עליו (נעשה בסשן השפות, באישור של משה: "תבצע 1 2").
- `npm run verify` ירוק: ‏547 קבצים, ‏12,512 בדיקות. גם `npm run i18n:release` עבר.
- חשבון Play: קיים ומאומת (A2). האפליקציה עצמה **עוד לא נוצרה** ב־Play.
- שרת Production: **לא קיים.** אין אפליקציה `sudoku-fight-prod` ב־Fly, ואין מסד Production ב־Neon (D9–D12).
- EAS: מחובר (`mosh-gl-dev`). הייתה רק בנייה אחת בענן (preview, ‏13.10.2026). המונה של versionCode ב־EAS עומד על 1, ולכן ה־AAB הראשון יקבל 2. מוצג "1.1.0".
- Firebase: `google-services.json` עדיין מכיל את מפתח הבדיקות הציבורי של React Native, ולכן בנייה לחנות **נעצרת בכוונה**. בנוסף, `sudoku-fight-prod.fly.dev` **לא** ב־Authorized domains (נבדק ב־API ציבורי).
- ‏Play דורש לפחות 2 צילומי מסך לפני Closed testing, ואין עדיין אף צילום. ל־Internal testing הם לא נדרשים.
- **עדכון 30.10.2026, הדומיין:** משה קנה את `sudokufight.app` ב־Cloudflare ואישר ("כן") להעביר אליו את הייצור (אפיון D128). ‏`EXPO_PUBLIC_SERVER_HOST` בפרופיל `production` של `apps/mobile/eas.json` כבר `sudokufight.app`. השרת לא משתנה, ושם האפליקציה ב־Fly נשאר `sudoku-fight-prod`. משתנים צעדים 1ב, 6, 7 ו־10, ונוסף צעד 1ג (המייל ב־Cloudflare).

בדיקת המוכנות (workflow ‏`wf_307a2fc4-43c`, ‏4 עדשות, ולכל עדשה ספקן): התוצאות המלאות ב־`audit-result.json` בתיקייה הזו. העיקר בהמשך.

## הצעדים

| # | מה | מי | אישור |
|---|---|---|---|
| 1 | **Firebase:** (א) מוחקים את טביעת האצבע `5e:8f:16:…:f6:25` מהאפליקציה של Android, מורידים `google-services.json` חדש ל־`apps/mobile/config/firebase/`. (ב) מוסיפים את `sudokufight.app` ל־Authentication ← Settings ← Authorized domains (וגם `sudoku-fight-prod.fly.dev`, אם רוצים להיכנס לאתר הניהול לפני שהתעודה של הדומיין מוכנה) | משה | |
| 1ג | **Cloudflare, המייל של `sudokufight.app`:** (א) ניתוב `support@sudokufight.app` ל־Gmail של משה (Email Routing). (ב) דומיין משלנו לשולח של המיילים מ־Firebase, עם רשומת SPF אחת ממוזגת. פירוט למטה | משה, ‏Claude מנחה לפי צילום מסך | |
| 2 | **Neon:** פרויקט `sudoku-fight-prod` בפרנקפורט. ב־Connect: ‏pooling **כבוי**, ומעתיקים את מחרוזת החיבור הישירה **למנהל הסיסמאות** (לא לצ'אט) | משה | |
| 3 | **Play Console ← Create app:** ‏`Sudoku Fight: Live PvP Sudoku`, ‏English (United States), ‏Game, ‏Free, ההצהרות | משה | |
| 4 | **תיקונים קטנים בקוד לפני ה־AAB הראשון** (כל אחד מהם היה עולה בנייה נוספת אם יחכה): רשימה למטה | Claude | ✓ משה |
| 5 | `npm run verify` ו־`i18n:release`, ‏commit ו־push | Claude | ✓ משה |
| 6 | **שרת Production:** `fly apps create sudoku-fight-prod --org personal`. משה בחלון PowerShell שלו: `DATABASE_URL` ‏(Read-Host) וטעינת הלוחות (`npm run db:seed-puzzles`). ‏Claude: שאר הסודות מ־`apps/server/.env` (בלי להדפיס), ואז `fly deploy --config fly.production.toml --ha=false --env GIT_SHA=<sha>` והבדיקות. **הדומיין** (`DEPLOY-PRODUCTION.md` סעיף 11א): ‏Claude מריץ `fly certs add sudokufight.app -a sudoku-fight-prod`, משה מוסיף ב־Cloudflare את הרשומות ש־Fly מדפיס, **בלי proxy** (ענן אפור, DNS only), ‏`fly certs check`, ואז הבדיקות ב־`https://sudokufight.app`: ‏`/health`, ‏`/legal/privacy`, ‏`/r/123456` ו־`/.well-known/assetlinks.json` | שניהם | ✓ משה |
| 7 | העלאת `google-services.json` החדש ל־EAS (שלוש הסביבות, `--force`), ו־`eas build --profile production --platform android` (בנייה אחת מתוך 15 בחודש. זו הבנייה הראשונה בענן של הרכיבים הנייטיביים החדשים, אז ייתכן כישלון ראשון). הבנייה מול `sudokufight.app`, ולכן רק אחרי שהתעודה מוכנה והבדיקות של צעד 6 עוברות בדומיין | Claude | ✓ משה |
| 8 | בדיקת ה־AAB: הרשאות (בלי AD_ID ובלי ACCESS_ADSERVICES_*), ‏targetSdk 36, כל השפות | Claude | |
| 9 | **העלאה ידנית ל־Internal testing** (Google לא מקבל את הראשונה דרך API). ‏Play App Signing: המפתח ש־Google יוצר | משה, Claude מנחה | |
| 10 | App integrity ← App signing: ה־SHA-1 של Google ל־Firebase (משה, בלי בנייה חדשה), ה־SHA-256 ל־Claude. ‏Claude: ‏`ANDROID_APP_LINK_SHA256` (של Play ושל EAS) ב־`fly.production.toml`, ודיפלוי ל־Production. בדיקה: `https://sudokufight.app/.well-known/assetlinks.json` מחזיר את שתי טביעות האצבע (האפליקציה מאמתת את הקישורים מול הדומיין הזה, לא מול `fly.dev`). ‏`google-services.json` החדש חוזר ל־EAS | שניהם | ✓ משה (דיפלוי) |
| 11 | משה מסיר את ה־APK המקומי מהטלפון, מצטרף בקישור, מתקין מ־Play ובודק: הרשמה, בוט, חדר חברים, Google. **כאן "יש גרסה בחנות" (Internal testing).** | משה | |
| 12 | **בדרך ל־Closed testing** (שם מתחילים 14 הימים): צילומי מסך (Claude מצלם ב־adb כשהטלפון מחובר, ובונה את `scripts/store-frames.mjs` מ־D116, ‏1080×1920, ‏PNG בלי שקיפות), דף החנות ב־19 שפות (ידנית, או Claude דרך ה־API אחרי מפתח Service Account, F9), הטפסים (התשובות ב־`docs/store/`), חשבונות הדמו, ‏15–20 בודקים, שליחה לבדיקה | שניהם | ✓ משה לכל העלאה |

## צעד 1ג: המייל ב־Cloudflare (משה, ‏Claude מנחה)

ממתין למשה. הוא שולח צילום מסך של כל מסך, ו־Claude אומר מה ללחוץ ומה להקליד. אין כאן סוד: רשומות DNS ציבוריות.

1. **ניתוב מייל:** ‏Cloudflare ← `sudokufight.app` ← **Email** ← **Email Routing**.
   - **Destination addresses:** ה־Gmail של משה. ‏Cloudflare שולח לשם מייל אימות, ומאשרים אותו.
   - **Routing rules** ← **Custom address:** ‏`support`, ‏**Send to** ה־Gmail.
   - Cloudflare מציע להוסיף לבד את רשומות ה־`MX` ורשומת `TXT` של SPF (‏`v=spf1 include:_spf.mx.cloudflare.net ~all`). מאשרים.
   - בדיקה: מייל מחשבון אחר ל־`support@sudokufight.app` מגיע ל־Gmail.
2. **השולח של המיילים מ־Firebase:** ‏Firebase ← Authentication ← **Templates** ← העיפרון ← **Customize domain** ← `sudokufight.app`. ‏Firebase מציג רשומות להוסיף ב־Cloudflare: ‏`TXT` לאימות, ‏`TXT` של SPF, ושני `CNAME` של DKIM.
   - **רשומת SPF אחת בלבד לדומיין:** שתי רשומות `v=spf1` שוברות את שתיהן. לכן לא מוסיפים את ה־SPF של Firebase כרשומה חדשה. עורכים את הרשומה מסעיף 1, ומוסיפים לה את ה־`include` של Firebase, למשל `v=spf1 include:_spf.mx.cloudflare.net include:_spf.firebasemail.com ~all`. הערכים המדויקים הם מה שמופיע במסכים, ו־Claude בודק אותם בצילום המסך.
   - שני ה־`CNAME` של DKIM: ‏**DNS only** (ענן אפור).
   - חוזרים ל־Firebase ← **Verify**. האימות יכול לקחת עד 48 שעות. אחר כך המיילים של האימות ושל איפוס הסיסמה יוצאים מ־`sudokufight.app`, ולא מ־`<project-id>.firebaseapp.com`.
3. **אחר כך, רק באישור משה:** ‏`LEGAL_CONTACT_EMAIL=support@sudokufight.app` בשרת, במקום המייל מ־C2, כדי שבדפים המשפטיים ובחנויות (`docs/store/`) תופיע אותה כתובת.

## צעד 4: התיקונים (Claude)

1. **הרשאות מיותרות:** חוסמים את `ACCESS_ADSERVICES_AD_ID` ואת `ACCESS_ADSERVICES_ATTRIBUTION` (מגיעות מ־Firebase Analytics), וגם את `SYSTEM_ALERT_WINDOW` ואת `READ/WRITE_EXTERNAL_STORAGE` (מהתבנית של Expo). רק בענף של Firebase, כלומר בבנייה לחנות. אחרת הן מופיעות לצד התשובה "אין Advertising ID". ‏`app.config.ts`, ‏`appConfig.test.ts`, ‏`LISTING-GOOGLE.md`.
2. **מסך ה־Sitemap של expo-router** נפתח בגרסה לחנות מקישור `sudokufight:///_sitemap`. התיקון: `["expo-router", { "sitemap": false }]` ב־`app.json`, עם בדיקה.
3. **פיצול שפות ב־AAB:** ‏Play מפצל את `values-*` לפי שפת המכשיר, וה־APK שנבדק לא פוצל. התיקון: `bundle { language { enableSplit = false } }` דרך `plugins/withAppLocales.js`, עם בדיקה. כך מה שבטלפון יהיה בדיוק מה שנבדק.
4. **`eas.json`:** ‏`cli.requireCommit: true` (בנייה לחנות רק מ־commit), ו־`node: "24.21.0"` ב־preview וב־production (כמו `.nvmrc`).
5. **שורת הגרסה** בהגדרות ובכניסה מציגה לשחקנים "production · מנוע N". ב־production מסתירים את המילה `production`.
6. **מסמכים ובדיקות:** ‏`deploy.test.ts` מוודא ש־`fly.production.toml` בלי `QA_*`, ‏`STEALTH_*` ו־`ANDROID_APP_LINK_ALLOW_DEBUG_KEY`. מעדכנים את `DEPLOY-PRODUCTION.md` (סעיפים 4–7) לפי 1.1.0, ואת `MOSHE-TODO.md` (הגרסה, ה־versionCode, הפקודה המלאה של `eas env:create`).

**לא עכשיו** (לא חוסם Closed testing, לפני השקה): סקריפט למחיקת חשבון לפי בקשה במייל. דיווח וחסימה גם בתוך משחק חברים (היום זה אפשרי מההיסטוריה). להפריד ב־Firebase את דיווחי ה־Staging מאלה של ה־Production.

## רשימת הבדיקות

- **Jest:**
  - `appConfig.test.ts`: חמש ההרשאות חסומות בבנייה לחנות, ו־`sitemap: false`.
  - `withAppLocales.test.ts`: ה־build.gradle מקבל `enableSplit = false`, פעם אחת, גם בהרצה חוזרת.
  - בדיקה ל־`eas.json`: ‏`requireCommit` ו־`node`.
  - `deploy.test.ts`: אין הגדרות Staging ב־`fly.production.toml`.
  - הבדיקה של `VersionInfo` בלי `production`.
- **`npm run verify` ו־`npm run i18n:release`:** ירוקים.
- **Production אחרי דיפלוי** (בכתובת `https://sudokufight.app`, אחרי `fly certs check`):
  - `/health` מחזיר `{"ok":true,"engine":"0.4.0","protocol":1}`.
  - בלוג יש `stealth bot off` ו־`QA module off`, ואין `accounts disabled`, ‏`admin site disabled`, ‏`no ranked puzzles` או `LEGAL_… is not set`.
  - `/legal/privacy|terms|delete-account` בלי `draft`.
  - `/admin/api/qa/runs` מחזיר 503.
  - `/.well-known/assetlinks.json` מחזיר JSON אחרי צעד 10.
- **ה־AAB:** ההרשאות, ‏targetSdk 36, ‏versionName 1.1.0, ‏`locales_config` עם 19 שפות.
- **בטלפון, מ־Play:**
  - פתיחה והרשמה, ומייל אימות.
  - משחק מול בוט.
  - חדר חברים: קישור שנפתח באפליקציה.
  - "המשך עם Google" אחרי צעד 10.
  - החלפת שפה.
  - מחיקת חשבון.
