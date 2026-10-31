export interface AnimationKeyframe {
  offset: number;
  opacity: number;
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
}

export interface AnimationValue {
  name: string;
  duration: number;
  delay: number;
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  easing: string;
  keyframes: AnimationKeyframe[];
}

export function createAnimation(): AnimationValue {
  return {
    name: 'lp-motion',
    duration: 1000,
    delay: 0,
    iterations: 1,
    direction: 'normal',
    fillMode: 'both',
    easing: 'ease',
    keyframes: [
      { offset: 0, opacity: 0, translateX: 0, translateY: 0, rotate: 0, scale: 1 },
      { offset: 1, opacity: 1, translateX: 100, translateY: 0, rotate: 0, scale: 1 },
    ],
  };
}

export function isAnimationEasing(value: string): boolean {
  if (['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(value)) return true;
  const match =
    /^cubic-bezier\(\s*([-\d.e+]+)\s*,\s*([-\d.e+]+)\s*,\s*([-\d.e+]+)\s*,\s*([-\d.e+]+)\s*\)$/.exec(
      value,
    );
  if (!match) return false;
  const numbers = match.slice(1).map(Number);
  return (
    numbers.every(Number.isFinite) &&
    numbers[0] >= 0 &&
    numbers[0] <= 1 &&
    numbers[2] >= 0 &&
    numbers[2] <= 1
  );
}

export function validateAnimation(value: AnimationValue): string[] {
  const errors: string[] = [];
  if (
    !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value.name) ||
    ['none', 'initial', 'inherit', 'unset', 'revert', 'revert-layer', 'default'].includes(
      value.name.toLowerCase(),
    )
  ) {
    errors.push(
      'Name must be a non-reserved CSS identifier, starting with a letter (1-64 characters).',
    );
  }
  if (!Number.isFinite(value.duration) || value.duration < 1 || value.duration > 600000)
    errors.push('Duration must be 1-600000 ms.');
  if (!Number.isFinite(value.delay) || Math.abs(value.delay) > 600000)
    errors.push('Delay must be -600000 to 600000 ms.');
  if (
    value.iterations !== 'infinite' &&
    (!Number.isFinite(value.iterations) || value.iterations <= 0 || value.iterations > 10000)
  )
    errors.push('Iterations must be > 0 and <= 10000, or infinite.');
  if (!['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(value.direction))
    errors.push('Invalid direction.');
  if (!['none', 'forwards', 'backwards', 'both'].includes(value.fillMode))
    errors.push('Invalid fill mode.');
  if (!isAnimationEasing(value.easing))
    errors.push('Use a supported easing keyword or cubic-bezier with x values in [0,1].');
  if (value.keyframes.length < 2 || value.keyframes.length > 50) errors.push('Use 2-50 keyframes.');
  value.keyframes.forEach((frame, index) => {
    if (
      !Number.isFinite(frame.offset) ||
      frame.offset < 0 ||
      frame.offset > 1 ||
      (index > 0 && frame.offset <= value.keyframes[index - 1].offset)
    )
      errors.push('Offsets must strictly increase in [0,1].');
    if (!Number.isFinite(frame.opacity) || frame.opacity < 0 || frame.opacity > 1)
      errors.push('Opacity must be in [0,1].');
    for (const key of ['translateX', 'translateY', 'rotate'] as const) {
      if (!Number.isFinite(frame[key]) || Math.abs(frame[key]) > 10000)
        errors.push(`${key} must be -10000 to 10000.`);
    }
    if (!Number.isFinite(frame.scale) || frame.scale < 0 || frame.scale > 100)
      errors.push('Scale must be 0-100.');
  });
  if (value.keyframes[0]?.offset !== 0 || value.keyframes[value.keyframes.length - 1]?.offset !== 1)
    errors.push('First and last offsets must be 0 and 1.');
  return errors;
}

export function animationToCss(value: AnimationValue): string {
  const errors = validateAnimation(value);
  if (errors.length) throw new RangeError(errors.join(' '));
  const frames = value.keyframes
    .map(
      (frame) =>
        `  ${Number((frame.offset * 100).toFixed(6))}% { opacity: ${frame.opacity}; transform: translate(${frame.translateX}px, ${frame.translateY}px) rotate(${frame.rotate}deg) scale(${frame.scale}); }`,
    )
    .join('\n');
  return `@keyframes ${value.name} {\n${frames}\n}\n.animated {\n  animation: ${value.name} ${value.duration}ms ${value.easing} ${value.delay}ms ${value.iterations} ${value.direction} ${value.fillMode};\n}`;
}
