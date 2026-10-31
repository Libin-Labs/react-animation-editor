import { useId, useState, type CSSProperties } from 'react';
import {
  animationToCss,
  validateAnimation,
  type AnimationKeyframe,
  type AnimationValue,
} from './engine.js';

export * from './engine.js';

export interface AnimationEditorProps {
  value: AnimationValue;
  onChange: (value: AnimationValue) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function AnimationEditor({
  value,
  onChange,
  disabled = false,
  className = '',
  style,
  'aria-label': label = 'Animation editor',
}: AnimationEditorProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const errors = validateAnimation(value);
  const css = errors.length ? '' : animationToCss(value);
  const previewName = `lpPreview${id}`;
  const previewCss = errors.length
    ? ''
    : animationToCss({ ...value, name: previewName }).split('\n.animated')[0];
  const update = (patch: Partial<AnimationValue>) => onChange({ ...value, ...patch });
  const editFrame = (index: number, patch: Partial<AnimationKeyframe>) => {
    update({
      keyframes: value.keyframes.map((frame, i) => (i === index ? { ...frame, ...patch } : frame)),
    });
  };
  const numberField = (
    name: string,
    n: number,
    set: (n: number) => void,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {name}
      <input
        aria-label={name}
        type="number"
        value={n}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber))
            set(event.target.valueAsNumber);
        }}
      />
    </label>
  );
  return (
    <section className={`lpa-editor ${className}`} style={style} aria-label={label}>
      <fieldset disabled={disabled}>
        <legend>Animation settings</legend>
        <label>
          Name
          <input value={value.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
        {numberField(
          'Duration (ms)',
          value.duration,
          (duration) => update({ duration }),
          1,
          600000,
        )}
        {numberField('Delay (ms)', value.delay, (delay) => update({ delay }), -600000, 600000)}
        <label>
          Iterations
          <input
            value={value.iterations}
            onChange={(event) => {
              if (event.target.value === 'infinite') update({ iterations: 'infinite' });
              else if (event.target.value.trim() && Number.isFinite(Number(event.target.value)))
                update({ iterations: Number(event.target.value) });
            }}
          />
        </label>
        <label>
          Direction
          <select
            value={value.direction}
            onChange={(event) =>
              update({ direction: event.target.value as AnimationValue['direction'] })
            }
          >
            {['normal', 'reverse', 'alternate', 'alternate-reverse'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Fill mode
          <select
            value={value.fillMode}
            onChange={(event) =>
              update({ fillMode: event.target.value as AnimationValue['fillMode'] })
            }
          >
            {['none', 'forwards', 'backwards', 'both'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Easing
          <input
            value={value.easing}
            onChange={(event) => update({ easing: event.target.value })}
          />
        </label>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend>Keyframes</legend>
        {value.keyframes.map((frame, index) => (
          <fieldset key={index}>
            <legend>Frame {index + 1}</legend>
            {numberField(
              `Frame ${index + 1} offset`,
              frame.offset,
              (offset) => editFrame(index, { offset }),
              0,
              1,
              0.01,
            )}
            {numberField(
              `Frame ${index + 1} opacity`,
              frame.opacity,
              (opacity) => editFrame(index, { opacity }),
              0,
              1,
              0.01,
            )}
            {(['translateX', 'translateY', 'rotate', 'scale'] as const).map((key) => (
              <span key={key}>
                {numberField(
                  `Frame ${index + 1} ${key}`,
                  frame[key],
                  (n) => editFrame(index, { [key]: n }),
                  key === 'scale' ? 0 : -10000,
                  key === 'scale' ? 100 : 10000,
                  0.1,
                )}
              </span>
            ))}
            <button
              type="button"
              disabled={
                value.keyframes.length <= 2 || index === 0 || index === value.keyframes.length - 1
              }
              onClick={() => update({ keyframes: value.keyframes.filter((_, i) => i !== index) })}
            >
              Remove frame {index + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          disabled={value.keyframes.length >= 50 || errors.length > 0}
          onClick={() => {
            let index = 0;
            for (let i = 1; i < value.keyframes.length - 1; i++) {
              if (
                value.keyframes[i + 1].offset - value.keyframes[i].offset >
                value.keyframes[index + 1].offset - value.keyframes[index].offset
              )
                index = i;
            }
            const a = value.keyframes[index];
            const b = value.keyframes[index + 1];
            const frame = Object.fromEntries(
              Object.keys(a).map((key) => [
                key,
                (a[key as keyof AnimationKeyframe] + b[key as keyof AnimationKeyframe]) / 2,
              ]),
            ) as unknown as AnimationKeyframe;
            update({
              keyframes: [
                ...value.keyframes.slice(0, index + 1),
                frame,
                ...value.keyframes.slice(index + 1),
              ],
            });
          }}
        >
          Add keyframe
        </button>
      </fieldset>
      <div className="lpa-preview" aria-label="Animation preview">
        <style>{previewCss}</style>
        <div
          key={run}
          className="lpa-target"
          onAnimationEnd={() => setPlaying(false)}
          style={{
            animationName: errors.length ? 'none' : previewName,
            animationDuration: `${value.duration}ms`,
            animationDelay: `${value.delay}ms`,
            animationIterationCount: value.iterations,
            animationDirection: value.direction,
            animationFillMode: value.fillMode,
            animationTimingFunction: value.easing,
            animationPlayState: playing && !disabled ? 'running' : 'paused',
          }}
        >
          Preview
        </div>
      </div>
      <button
        type="button"
        disabled={disabled || errors.length > 0}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        disabled={disabled || errors.length > 0}
        onClick={() => {
          setRun(run + 1);
          setPlaying(true);
        }}
      >
        Restart
      </button>
      {errors.length > 0 && <p role="alert">{errors.join(' ')}</p>}
      <label>
        CSS export
        <textarea readOnly value={css} rows={8} />
      </label>
    </section>
  );
}
