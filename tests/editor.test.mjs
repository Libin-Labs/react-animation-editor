import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import {
  AnimationEditor,
  animationToCss,
  createAnimation,
  isAnimationEasing,
  validateAnimation,
} from '../dist/esm/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
after(() => dom.window.close());

test('fresh defaults and deterministic CSS', () => {
  const value = createAnimation();
  assert.deepEqual(validateAnimation(value), []);
  assert.match(animationToCss(value), /@keyframes lp-motion/);
  assert.match(animationToCss(value), /translate\(100px, 0px\)/);
  value.keyframes[0].opacity = 0.5;
  assert.equal(createAnimation().keyframes[0].opacity, 0);
});

test('easing accepts keywords and bounded Bezier x coordinates only', () => {
  for (const easing of ['linear', 'ease-in-out', 'cubic-bezier(0, -2, 1, 3)'])
    assert.ok(isAnimationEasing(easing));
  for (const easing of [
    'steps(2)',
    'cubic-bezier(-1,0,1,1)',
    'cubic-bezier(0,0,2,1)',
    'ease; color:red',
    'cubic-bezier(0,1e999,1,1)',
  ])
    assert.equal(isAnimationEasing(easing), false);
});

test('bounds, frame order, reserved names, and injection are rejected', () => {
  const patches = [
    { name: 'x}</style><script>' },
    { name: 'none' },
    { duration: 0 },
    { duration: Infinity },
    { delay: 600001 },
    { iterations: -1 },
    { direction: 'sideways' },
    { fillMode: 'invalid' },
    { easing: 'linear; color: red' },
    { keyframes: [] },
  ];
  for (const patch of patches)
    assert.throws(() => animationToCss({ ...createAnimation(), ...patch }), RangeError);
  for (const patch of [
    { offset: 1 },
    { opacity: 2 },
    { scale: -1 },
    { rotate: NaN },
    { translateX: 10001 },
  ]) {
    const value = createAnimation();
    Object.assign(value.keyframes[0], patch);
    assert.ok(validateAnimation(value).length);
  }
});

test('controlled editing, midpoint addition, playback, disable and unmount', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let value = createAnimation();
  const render = (disabled = false) =>
    root.render(
      React.createElement(AnimationEditor, {
        value,
        disabled,
        onChange: (next) => {
          value = next;
          render();
        },
      }),
    );
  await act(() => render());
  const duration = host.querySelector('[aria-label="Duration (ms)"]');
  await act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(
      duration,
      '2400',
    );
    duration.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(value.duration, 2400);
  const button = (text) =>
    [...host.querySelectorAll('button')].find((node) => node.textContent === text);
  await act(() => button('Add keyframe').click());
  assert.equal(value.keyframes.length, 3);
  assert.equal(value.keyframes[1].offset, 0.5);
  await act(() => button('Play').click());
  assert.equal(host.querySelector('.lpa-target').style.animationPlayState, 'running');
  await act(() => button('Pause').click());
  assert.equal(host.querySelector('.lpa-target').style.animationPlayState, 'paused');
  await act(() => render(true));
  assert.equal(button('Play').disabled, true);
  await act(() => root.unmount());
  assert.equal(host.childElementCount, 0);
  host.remove();
});
