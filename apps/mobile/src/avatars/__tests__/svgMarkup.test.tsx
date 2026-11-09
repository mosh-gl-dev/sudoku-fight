import { avatarById, renderStatic } from '@sudoku-fight/avatars';
import { render } from '@testing-library/react-native';
import * as svg from 'react-native-svg';

import { AST_CACHE_SIZE, svgAst } from '../svgMarkup';

/**
 * SvgMarkup (B14, QA run #2): an avatar's markup drawn as SvgXml draws it, parsed once for every mount. Under
 * Jest the app sees it as the host element SvgXml (jest.setup.ts); here the real one is drawn.
 */

const { SvgMarkup } = jest.requireActual<typeof import('../svgMarkup')>('../svgMarkup');
const { SvgXml } = jest.requireActual<typeof import('react-native-svg')>('react-native-svg');

const fox = renderStatic(avatarById('fox')!, { size: 44 });

afterEach(() => jest.restoreAllMocks());

describe('an avatar markup, parsed once', () => {
  it('draws what SvgXml draws, at its size and style (without handing the markup itself to the native view)', async () => {
    const style = { position: 'absolute' as const, left: 3, top: 5 };
    const markup = (await render(<SvgMarkup xml={fox} width={44} height={44} style={style} />)).toJSON();
    const xml = (await render(<SvgXml xml={fox} width={44} height={44} style={style} />)).toJSON();
    if (!markup || !xml || Array.isArray(markup) || Array.isArray(xml)) throw new Error('one root each');
    expect(xml.props.xml).toBe(fox);
    const { xml: _markup, ...props } = xml.props;
    expect(markup).toEqual({ ...xml, props });
  });

  it('parses a markup once: every later mount draws the same tree', async () => {
    const markup = renderStatic(avatarById('kettle')!, { size: 52 });
    const parse = jest.spyOn(svg, 'parse');
    const first = svgAst(markup);
    const view = await render(
      <>
        <SvgMarkup xml={markup} width={52} height={52} />
        <SvgMarkup xml={markup} width={52} height={52} />
      </>,
    );
    await view.unmount();
    await render(<SvgMarkup xml={markup} width={52} height={52} />);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(svgAst(markup)).toBe(first);
  });

  it(`keeps the latest ${AST_CACHE_SIZE}: the oldest is parsed again`, () => {
    const parse = jest.spyOn(svg, 'parse');
    const oldest = renderStatic(avatarById('maya')!, { size: 31 });
    const kept = svgAst(oldest);
    for (let size = 100; size < 100 + AST_CACHE_SIZE; size++)
      svgAst(renderStatic(avatarById('maya')!, { size }));
    expect(parse).toHaveBeenCalledTimes(1 + AST_CACHE_SIZE);
    const again = svgAst(oldest);
    expect(parse).toHaveBeenCalledTimes(2 + AST_CACHE_SIZE);
    expect(again).not.toBe(kept);
    expect(again).toEqual(kept);
  });

  it('a markup it cannot parse draws nothing and is logged, as SvgXml does', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = await render(<SvgMarkup xml="<svg><g></svg>" width={10} height={10} />);
    expect(view.toJSON()).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
  });
});
