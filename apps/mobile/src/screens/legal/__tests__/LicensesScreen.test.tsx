import 'react-native-reanimated';

import { fireEvent, render, screen } from '@testing-library/react-native';

import i18n from '../../../i18n';
import {
  type LicensesData,
  licensesData,
  licenseTexts,
  packageRows,
  reflowLicense,
} from '../../../legal/licenses';
import { LicensesScreen } from '../LicensesScreen';

/**
 * Work plan stage 14 (spec §23 "רישיונות"): Settings → "רישיונות" lists the fonts (OFL), every open-source
 * package with its license and copyright, and the license texts; all of it from the generated
 * src/legal/third-party-licenses.json (scripts/licenses.mjs).
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const DATA: LicensesData = {
  fonts: [
    { family: 'Rubik', copyright: ['Copyright 2015 The Rubik Project Authors'], license: 'OFL-1.1' },
    { family: 'Teko', copyright: ['Copyright 2023 The Teko Project Authors'], license: 'OFL-1.1' },
  ],
  ofl: 'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
  texts: { MIT: 'Permission is hereby granted, free of charge…', ISC: 'Permission to use, copy, modify…' },
  packages: [
    ['react', '19.2.3', 'MIT', ['Copyright (c) Meta Platforms, Inc. and affiliates.']],
    ['zustand', '5.0.15', 'MIT', []],
    ['semver', '7.7.2', 'ISC', ['Copyright (c) Isaac Z. Schlueter and Contributors']],
  ],
};

beforeEach(async () => {
  await i18n.changeLanguage('he');
});

describe('the licenses screen', () => {
  it('lists the fonts and every package, names left to right', async () => {
    await render(<LicensesScreen data={DATA} />);
    expect(screen.getByRole('header', { name: 'רישיונות' })).toBeTruthy();
    expect(screen.getByTestId('font-Rubik')).toHaveTextContent(
      /Rubik.*SIL Open Font License 1\.1.*Copyright 2015/,
    );
    expect(screen.getByTestId('font-Teko')).toBeTruthy();
    expect(screen.getByText('3 רכיבי קוד פתוח')).toBeTruthy();
    const react = screen.getByTestId('package-react@19.2.3');
    expect(react).toHaveTextContent(/react.*19\.2\.3.*MIT.*Meta Platforms/);
    expect(react).toHaveProp(
      'accessibilityLabel',
      'react, גרסה 19.2.3, רישיון MIT'.replace(/(react|19\.2\.3|MIT)/g, '⁦$1⁩'),
    );
    expect(screen.getByText('zustand')).toHaveStyle({ writingDirection: 'ltr', textAlign: 'left' });
  });

  it('shows a license’s text only when asked', async () => {
    await render(<LicensesScreen data={DATA} />);
    expect(screen.queryByTestId('license-text-OFL-1.1-body')).toBeNull();
    const ofl = screen.getByTestId('license-text-OFL-1.1');
    expect(ofl).toHaveProp('accessibilityState', { expanded: false });
    await fireEvent.press(ofl);
    expect(screen.getByTestId('license-text-OFL-1.1-body')).toHaveTextContent(/SIL OPEN FONT LICENSE/);
    expect(screen.getByTestId('license-text-OFL-1.1')).toHaveProp('accessibilityState', { expanded: true });

    await fireEvent.press(screen.getByTestId('license-text-MIT'));
    expect(screen.getByTestId('license-text-MIT-body')).toHaveTextContent(/Permission is hereby granted/);
    await fireEvent.press(screen.getByTestId('license-text-MIT'));
    expect(screen.queryByTestId('license-text-MIT-body')).toBeNull();
  });

  it('keeps the English texts on the left in the Hebrew layout (Android: a layout direction, not only textAlign)', async () => {
    // QA account-settings-licenses-expand: on Android in Hebrew, `textAlign: 'left'` alone was on the right,
    // and the package row (name, version) ran right to left.
    await render(<LicensesScreen data={DATA} />);
    const ltrText = { direction: 'ltr', writingDirection: 'ltr', textAlign: 'left' } as const;
    expect(screen.getByText('react')).toHaveStyle(ltrText);
    expect(screen.getByText('19.2.3')).toHaveStyle(ltrText);
    expect(screen.getByText('Copyright (c) Meta Platforms, Inc. and affiliates.')).toHaveStyle(ltrText);
    expect(screen.getByText('Copyright 2015 The Rubik Project Authors')).toHaveStyle(ltrText);
    expect(screen.getByTestId('package-react@19.2.3')).toHaveStyle({ direction: 'ltr' });
    expect(screen.getByTestId('package-react@19.2.3-top')).toHaveStyle({
      direction: 'ltr',
      flexDirection: 'row',
    });
    // The license's own toggle too: its English name on the left, the chevron on the right.
    expect(screen.getByTestId('license-text-OFL-1.1')).toHaveStyle({
      direction: 'ltr',
      flexDirection: 'row',
    });
    for (const title of screen.getAllByText('SIL Open Font License 1.1')) expect(title).toHaveStyle(ltrText);
    await fireEvent.press(screen.getByTestId('license-text-OFL-1.1'));
    expect(screen.getByTestId('license-text-OFL-1.1-body')).toHaveStyle(ltrText);
    await fireEvent.press(screen.getByTestId('license-text-MIT'));
    expect(screen.getByTestId('license-text-MIT-body')).toHaveStyle(ltrText);
    // The Hebrew headings stay in the Hebrew layout.
    expect(screen.getByText('גופנים')).not.toHaveStyle({ direction: 'ltr' });
  });

  it('shows a license’s text reflowed: no 80-column breaks inside a paragraph', async () => {
    // QA account-settings-licenses-expand: the file's hard breaks, on top of the screen's own wrapping, left
    // one-word lines ("person obtaining" / "a copy of…").
    const mit = [
      'MIT License',
      '',
      'Permission is hereby granted, free of charge, to any person obtaining',
      'a copy of this software and associated documentation files (the',
      '"Software"), to deal in the Software without restriction.',
    ].join('\n');
    await render(<LicensesScreen data={{ ...DATA, texts: { MIT: mit } }} />);
    await fireEvent.press(screen.getByTestId('license-text-MIT'));
    // The exact text (toHaveTextContent would fold the line breaks into spaces).
    expect(screen.getByTestId('license-text-MIT-body')).toHaveProp(
      'children',
      'MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software ' +
        'and associated documentation files (the "Software"), to deal in the Software without restriction.',
    );
  });

  it('speaks English too', async () => {
    await i18n.changeLanguage('en');
    await render(<LicensesScreen data={DATA} />);
    expect(screen.getByRole('header', { name: 'Licenses' })).toBeTruthy();
    expect(screen.getByText('3 open-source packages')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show the ⁦MIT⁩ license' })).toBeTruthy();
  });
});

describe('reflowLicense', () => {
  const OFL = [
    '-----------------------------------------------------------',
    'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
    '-----------------------------------------------------------',
    '',
    'PREAMBLE',
    'The goals of the Open Font License (OFL) are to stimulate worldwide',
    'development of collaborative font projects, to support the font creation',
    'efforts of academic and linguistic communities.',
    '',
    '"Font Software" refers to the set of files released by the Copyright',
    'Holder(s) under this license and clearly marked as such.',
    '',
    'PERMISSION & CONDITIONS',
    'Permission is hereby granted, free of charge, to any person obtaining',
    'a copy of the Font Software, subject to the following conditions:',
    '',
    '1) Neither the Font Software nor any of its individual components,',
    'in Original or Modified Versions, may be sold by itself.',
    '',
    '3) No Modified Version of the Font Software may use the Reserved Font',
    'Name(s) unless explicit written permission is granted by the corresponding',
    'Copyright Holder. This restriction only applies to the primary font name.',
    '',
    'DISCLAIMER',
    'THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,',
    'EXPRESS OR IMPLIED.',
  ].join('\n');

  it('joins the breaks inside an OFL paragraph and keeps its rules, headings and numbered clauses', () => {
    expect(reflowLicense(OFL)).toBe(
      [
        '-----------------------------------------------------------',
        'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
        '-----------------------------------------------------------',
        '',
        'PREAMBLE',
        'The goals of the Open Font License (OFL) are to stimulate worldwide development of collaborative font ' +
          'projects, to support the font creation efforts of academic and linguistic communities.',
        '',
        '"Font Software" refers to the set of files released by the Copyright Holder(s) under this license and ' +
          'clearly marked as such.',
        '',
        'PERMISSION & CONDITIONS',
        'Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software, ' +
          'subject to the following conditions:',
        '',
        '1) Neither the Font Software nor any of its individual components, in Original or Modified Versions, ' +
          'may be sold by itself.',
        '',
        '3) No Modified Version of the Font Software may use the Reserved Font Name(s) unless explicit written ' +
          'permission is granted by the corresponding Copyright Holder. This restriction only applies to the ' +
          'primary font name.',
        '',
        'DISCLAIMER',
        'THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
      ].join('\n'),
    );
  });

  it('keeps an MIT copyright line, bullets with their hanging indent, and an indented header', () => {
    const text = [
      'MIT License',
      '',
      'Copyright (c) 2020 Alice Example',
      'Copyright (c) 2021 Bob Example',
      '',
      'Permission is hereby granted, free of charge, to any person obtaining',
      'a copy of this software.',
      '',
      '* Redistributions of source code must retain the above copyright',
      '  notice, this list of conditions and the following disclaimer.',
      '* Neither the name of its author nor the names of its contributors',
      '  may be used to endorse products.',
      '',
      'Apache License',
      '                           Version 2.0, January 2004',
      '                        http://www.apache.org/licenses/',
      '',
      '      (a) You must give any other recipients of the Work or',
      '          Derivative Works a copy of this License; and',
    ].join('\r\n');
    expect(reflowLicense(text)).toBe(
      [
        'MIT License',
        '',
        'Copyright (c) 2020 Alice Example',
        'Copyright (c) 2021 Bob Example',
        '',
        'Permission is hereby granted, free of charge, to any person obtaining a copy of this software.',
        '',
        '* Redistributions of source code must retain the above copyright notice, this list of conditions and ' +
          'the following disclaimer.',
        '* Neither the name of its author nor the names of its contributors may be used to endorse products.',
        '',
        // No leading indent kept: on a ~40-character phone line it was a ragged first line.
        'Apache License',
        'Version 2.0, January 2004',
        'http://www.apache.org/licenses/',
        '',
        '(a) You must give any other recipients of the Work or Derivative Works a copy of this License; and',
      ].join('\n'),
    );
  });

  it('keeps every word of the real texts, and leaves no short broken line in the MIT and OFL texts', () => {
    const data = licensesData();
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    for (const body of [data.ofl, ...Object.values(data.texts)])
      expect(words(reflowLicense(body))).toEqual(words(body));
    const mit = reflowLicense(data.texts.MIT ?? '');
    expect(mit).toContain(
      'person obtaining a copy of this software and associated documentation files (the "Software"), to deal',
    );
    expect(reflowLicense(data.ofl)).toContain(
      'Font Software, modified or unmodified, in part or in whole, must be distributed',
    );
  });
});

describe('the generated file', () => {
  it('has the app’s packages, the two fonts and the common license texts', () => {
    const data = licensesData();
    const rows = packageRows(data);
    expect(rows.length).toBeGreaterThan(100);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    for (const name of ['react', 'react-native', 'expo', 'i18next', 'zustand', '@react-native-firebase/app'])
      expect(rows.some((r) => r.name === name)).toBe(true);
    expect(data.fonts.map((f) => f.family)).toEqual(['Rubik', 'Teko']);
    expect(data.ofl).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(licenseTexts(data)[0]?.id).toBe('MIT');
    expect(Object.keys(data.texts)).toEqual(expect.arrayContaining(['MIT', 'Apache-2.0', 'ISC']));
  });
});
