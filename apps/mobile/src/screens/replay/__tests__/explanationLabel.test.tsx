import { act, render, screen } from '@testing-library/react-native';

import i18n from '../../../i18n';
import { endsSentence, labelValue } from '../../../i18n/compose';
import { ExplanationCard } from '../ReplayParts';
import type { PlayerExplanation, ReplayPlayer } from '../replayModel';

/**
 * The explanation card's screen-reader label (QA 2026-11-03, P3-JA-A11Y): its lines follow each other with
 * match:sentenceSpace, which is empty in Japanese and Chinese, and two of them are not sentences ("5ではなく1",
 * "得点：…"), so TalkBack read "…5ではなく11が入らない理由…". Each line that is not a sentence yet now gets the
 * language's full stop (compose closeSentences), in every language.
 */

const hidden = { includeHiddenElements: true };

const player: ReplayPlayer = {
  id: 'nina',
  seat: 1,
  name: 'NinaVolt',
  isBot: false,
  avatar: 'maya',
  colorIndex: 1,
  isMe: false,
};

/** A wrong digit (1 where 5 goes), with its reason and the penalty's calculation. */
const wrong: PlayerExplanation = {
  playerId: 'nina',
  status: 'wrong',
  stepIndex: 3,
  live: true,
  cell: 40,
  cellName: 'E5',
  answer: 5,
  played: 1,
  technique: 'nakedSingle',
  techniqueName: 'x',
  text: 'x.',
  wrongText: 'x.',
  points: null,
  penalty: 6.5,
  score: null,
  penaltyScore: { row: 4, col: 2, box: 3, num: 1, X: 4, Y: 3, points: 6.5 },
  releaseReason: null,
};

const LANGUAGES = ['ja', 'zh-Hans', 'zh-Hant', 'ko', 'th', 'he', 'en', 'ar', 'de'] as const;

afterAll(async () => {
  await act(async () => {
    await i18n.changeLanguage('he');
  });
});

describe.each(LANGUAGES)('%s', (lng) => {
  beforeAll(async () => {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
  });

  it('"5 instead of 1" and "why 1 doesn\'t fit" never run together; the penalty line is closed too', async () => {
    const t = i18n.getFixedT(lng);
    const technique = t('explain:technique.nakedSingle');
    const body = t('explain:wrong.notSolution', { digit: 1, answer: 5 });
    const card = { ...wrong, techniqueName: technique, text: body, wrongText: body };
    await render(<ExplanationCard player={player} explanation={card} testID="card" />);
    const label = screen.getByTestId('card', hidden).props.accessibilityLabel as string;

    const played = t('replay:explain.played', { digit: 1, answer: 5 });
    const why = t('replay:explain.why', { digit: 1, text: body });
    const stop = t('common:text.sentence', { text: played });
    const space = t('match:sentenceSpace');
    // The line, its full stop (none in Thai, which has none), then the next one after the language's space.
    expect(label).toContain(`${stop}${space}${why}`);
    if (endsSentence(t('common:text.sentence', { text: 'x' })))
      expect(label).not.toContain(`${played}${why}`);
    // The penalty's "label: value" ends as a sentence too.
    const penalty = labelValue(t('replay:explain.penaltyLine'), '', t);
    expect(label).toContain(penalty);
    expect(label.endsWith(t('common:text.sentence', { text: '' }))).toBe(true);
  });
});
