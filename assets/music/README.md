# מוזיקה

כל המוזיקה באפליקציה מקורית שלנו. היא מסונתזת מאפס ב־Node טהור, במנוע `tools/music/` (בלי samples, בלי ספריות חיצוניות, דטרמיניסטית: אותו קוד נותן אותו קובץ). אין כאן קטע של אף אחד אחר, ואין רישיון צד שלישי: הסגנון שואב השראה מפסקול "Kugel" (אסא רביב ותום ארמוני), אבל המנגינות, ההרמוניות והכלים נכתבו כאן. ה־hooks של הרפרנס היו רשימת "אסור להעתיק" בזמן הכתיבה. בין הקיוז עצמם אין רצף משותף של 4 מרווחים, חוץ מפנייה פריגית גנרית אחת של 5 מרווחים, פעם אחת, בין stage_race ל־caper. קובצי ה־WAV של הרפרנס שימשו למדידה בלבד ואינם בפרויקט.

## התיקיות

- `app/`: מה שהאפליקציה משמיעה. **רק הקבצים שכאן נארזים באפליקציה** (`apps/mobile/src/services/music.ts`, ‏`require` סטטי לכל קובץ). AAC-LC, ‏44.1 kHz, סטריאו, ‏160 kb/s, לולאה רציפה (`player.loop = true`).
- `candidates/` (לא ב־git: `tools/music` מרנדר אותם מחדש, זהים ב־md5): המאסטרים, AAC ‏192 kb/s, וספקטרוגרמה (`.png`) לכל קיו. לא נארז באפליקציה. כאן נשארים גם הקיוז שלא נכנסו: `veil`, ‏`clockwork`, ‏`nocturne` (הסבב הראשון, לא עברו gate), ו־`stage_find`, ‏`stage_duel` (לא עברו gate, ראו למטה).

הבדיקה `apps/mobile/src/services/__tests__/music.test.ts` נכשלת אם ב־`app/` יש קובץ שאינו ב־`MUSIC_TRACK_IDS`, או שחסר בה קובץ.

## הקבצים באפליקציה

| קובץ | אורך | גודל | BPM, משקל, מפתח | ליד | איפה מתנגן | gate (ממוצע, סבב) |
|---|---|---|---|---|---|---|
| `lobby.m4a` | 95.99 s | 1.9 MB | 60, בלי פולס, A על פדל | harmonium bed | הבית ושאר המסכים בלי מוזיקה משלהם; חיפוש משחק מדורג עד "נמצא"; חדר חברים עד הספירה; "איך משחקים" של שלב | 8.04 (r2) |
| `kibbitzer.m4a` | 177.61 s | 3.7 MB | 100, ‏4/4 חצי־סווינג, B minor | whistle, accordion | משחק solo ומשחק מול בוט | 8.24 (סבב תיקון אחרון) |
| `caper.m4a` | 163.63 s | 3.5 MB | 132, ‏2/4 oom-pah, ‏E Phrygian | whistle, accordion, theremin | משחק מדורג ומשחק חברים | 8.26 (סבב תיקון אחרון) |
| `caper_final.m4a` | 58.19 s | 1.2 MB | כמו caper | כמו caper | הסוף של משחק מדורג או חברים: כשנשארות 12 משבצות ריקות או פחות (`finalAtEmptyCells`) ועד סוף המשחק | קטע D של caper, עבר איתו |
| `stage_spot.m4a` | 28.56 s | 0.6 MB | 84, ‏4/4 tiptoe, ‏Eb harmonic minor | theremin | שלבים: "מצא את הטעות" (`spotError`), **וגם "מיקום מדויק" (`find`)** | 8.10 (r4) |
| `stage_fill.m4a` | 26.66 s | 0.5 MB | 108, ‏4/4 שמיניות ישרות, ‏Bb minor ל־Bb major | felt piano | שלבים: "מלא את הריבוע/השורה/העמודה" (`fillBox`, ‏`fillRow`, ‏`fillCol`) | 8.16 (r4) |
| `stage_chain.m4a` | 28.96 s | 0.6 MB | 116, ‏4/4, ‏C harmonic minor | damped guitar | שלבים: "שרשרת" (`chain`) | 8.06 (r2) |
| `stage_puzzle.m4a` | 30.98 s | 0.7 MB | 124, ‏4/4 swung, ‏F major/Mixolydian | pizz violins, wood | שלבים: "פאזל" (`puzzle`) | 8.12 (r3) |
| `stage_hunter.m4a` | 29.40 s | 0.6 MB | 147, ‏3/4 waltz, ‏Ab major | accordion | שלבים: "צייד הנקודות" (`pointHunter`) | 8.04 (r3) |
| `stage_race.m4a` | 30.77 s | 0.7 MB | 156, ‏4/4 gallop, ‏D Freygish | mandolin מול muted brass | שלבים: "מרוץ מול הבוט" (`findDuel`), **וגם "דו־קרב" (`duel`)** | 8.18 (r3) |

סך הכל כ־14 MB.

מה מתנגן איפה מוגדר במקום אחד: `apps/mobile/src/config/music.ts` (`MUSIC_CONFIG`). שלב מתחיל את הקיו שלו ב־GO, ובתוצאה הקיו דועך ב־0.5 s. מסך התוצאות של משחק שקט, וכך גם `/dev`.

עוצמות (נמדדו על הקובץ המפוענח): קיוז המשחק והשלבים ‎-16.1 עד ‎-16.4 LUFS, ‏caper_final ‏‎-15.3 (השיא), הלובי ‎-20.0 LUFS (כבר שקט ב־4 dB, לכן אין לו `trackGain`). ה־true peak בכל הקבצים ‎-1.4 dBTP או פחות.

## gate

כל קיו עבר פאנל של חמישה שופטים: style, ‏composition, ‏realism, ‏mix, ‏fit. עובר רק ממוצע 8 ומעלה. סבבי השיפוט, השינויים והערות פתוחות קטנות מתועדים בכותרת של כל קובץ ב־`tools/music/tracks/`.

שני קיוז לא עברו, ולכן **אינם באפליקציה**:

| קיו | ממוצע אחרון | למה | מה מתנגן במקומו |
|---|---|---|---|
| `stage_find` | 7.90 (r4) | כל ארבע הקדנצות הן אותו Bb→A (ה־mix תוקן אחרי r4, אבל לא נשפט שוב) | `stage_spot`: הקיו האיטי והמחפש של הסט |
| `stage_duel` | 7.96 (r4) | אין שכבה מתמשכת; זהות הבוט היא רק A→G#; ה־augmented 2nd לא נשמע בטובה | `stage_race`: גם הוא קרב מול הבוט |

כשקיו חדש עובר: מוסיפים את המזהה ל־`MUSIC_TRACK_IDS`, את הקובץ ל־`MUSIC_SOURCES` ב־`services/music.ts`, ומחליפים את המיפוי ב־`MUSIC_CONFIG.stage`.

## רינדור מחדש

מהשורש של הריפו. ‏`FF` הוא נתיב ל־ffmpeg (למשל מ־`ffmpeg-static`).

```sh
# 1. מאסטר: WAV + score לתיקיית העבודה, ו־AAC 192k ל־assets/music/candidates/<id>.m4a.
#    הסקריפט מפענח את ה־m4a ובודק אותו: אורך זהה ל־WAV, true peak, קליקים, loop seam.
node tools/music/render.mjs stage_race --out <scratch> --m4a --ffmpeg "$FF"

# 2. ספקטרוגרמה וניתוח (אופציונלי)
node tools/music/analyze.mjs <scratch>/stage_race.wav --score <scratch>/stage_race.score.json --loop \
  --png assets/music/candidates/stage_race.png --json <scratch>/stage_race.analysis.json

# 3. העותק לאפליקציה: AAC-LC 160k מה־WAV (לא מה־m4a, כדי לא לקודד פעמיים)
"$FF" -y -i <scratch>/stage_race.wav -map_metadata -1 -c:a aac -profile:a aac_low -b:a 160k -ar 44100 -ac 2 \
  -movflags +faststart assets/music/app/stage_race.m4a

# 4. בדיקה: לפענח ולהריץ את ה־analyzer עם --loop (seam PASS, ‏0 קליקים, ‏true peak ≤ ‎-1 dBTP)
"$FF" -y -i assets/music/app/stage_race.m4a -c:a pcm_f32le <scratch>/stage_race.dec.wav
node tools/music/analyze.mjs <scratch>/stage_race.dec.wav --loop
```

אחר כך מוחקים את ה־WAV (המנוע כותב 16-bit, כ־5 MB לקיו של 30 s וכ־30 MB לקיו של 3 דקות).

המנוע קובע אורך שהוא כפולה של 1024 דגימות (פריים AAC), ו־ffmpeg כותב edit list שמסיר את ה־priming. לכן הקובץ המפוענח באורך זהה ל־WAV, והלולאה מדויקת לדגימה. זה נבדק לכל עשרת הקבצים ב־2026-11-27.
