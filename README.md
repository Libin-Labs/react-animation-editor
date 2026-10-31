# @lp-labs/react-animation-editor

An original, controlled editor for a deliberately small numeric CSS animation
schema. It is not a general CSS parser or a replacement for a timeline application.
React 18.2 or 19 is the only runtime peer; there are no runtime dependencies.

## Use

```sh
npm install @lp-labs/react-animation-editor react react-dom
```

In a React application with a CSS-capable bundler:

```tsx
import { useState } from "react";
import {
  AnimationEditor,
  createAnimation,
  animationToCss,
} from "@lp-labs/react-animation-editor";
import "@lp-labs/react-animation-editor/styles.css";

export default function App() {
  const [value, setValue] = useState(createAnimation);
  return (
    <>
      <AnimationEditor value={value} onChange={setValue} />
      <pre>{animationToCss(value)}</pre>
    </>
  );
}
```

The example's helper call assumes valid state. If you allow invalid intermediate
edits, call `validateAnimation(value)` before exporting, as the editor itself does.
Named ESM imports and CommonJS `require` expose the same API. CSS is an explicit
subpath import; JavaScript does not automatically import it. Modules can be
imported during server rendering without accessing browser globals.

## Component and types

`AnimationEditor(props: AnimationEditorProps)` is controlled: `value` and
`onChange(next: AnimationValue): void` are required. Always store the emitted
complete next value. The editor does not mutate supplied objects. Optional props:

| Prop | Default | Meaning |
| --- | --- | --- |
| `disabled?: boolean` | `false` | Disables editing and playback; pauses the preview |
| `className?: string` | `""` | Extra root class |
| `style?: React.CSSProperties` | absent | Root inline style |
| `"aria-label"?: string` | `"Animation editor"` | Root accessible label |

Exported `AnimationValue` has:

| Field | Type and allowed range |
| --- | --- |
| `name` | String, 1-64 ASCII letters/digits/underscore/hyphen, starting with a letter; CSS reserved names rejected |
| `duration` | Finite number, 1-600000 milliseconds |
| `delay` | Finite number, -600000 to 600000 milliseconds |
| `iterations` | Finite number > 0 and <= 10000, or `"infinite"` |
| `direction` | `"normal" \| "reverse" \| "alternate" \| "alternate-reverse"` |
| `fillMode` | `"none" \| "forwards" \| "backwards" \| "both"` |
| `easing` | Supported keyword or cubic Bezier string described below |
| `keyframes` | 2-50 `AnimationKeyframe` objects, in offset order |

Exported `AnimationKeyframe` contains only numbers:
`offset` in [0,1], `opacity` in [0,1], `translateX`/`translateY` in
[-10000,10000] pixels, `rotate` in [-10000,10000] degrees, and `scale` in
[0,100]. Every field is required. Offsets must strictly increase; the first is
0 and the last is 1. Transform order is translate, rotate, scale.

## All runtime exports

* `AnimationEditor`: the component above.
* `createAnimation(): AnimationValue`: returns fresh objects with name
  `"lp-motion"`, duration 1000, delay 0, iterations 1, normal direction, both
  fill mode, and `"ease"`. Two frames at 0 and 1 animate opacity 0 to 1 and
  translateX 0 to 100; translateY and rotate are 0, scale is 1.
* `isAnimationEasing(value: string): boolean`: accepts `"linear"`, `"ease"`,
  `"ease-in"`, `"ease-out"`, `"ease-in-out"`, or a lowercase
  `cubic-bezier(x1, y1, x2, y2)` with finite coordinates and x1/x2 in [0,1].
  Y coordinates may overshoot. Steps, CSS variables, and other syntax return
  false. It does not throw for an unsupported string.
* `validateAnimation(value: AnimationValue): string[]`: returns constraint error
  messages, or `[]`. Requires a structurally typed value; this is not an unknown
  JSON decoder.
* `animationToCss(value: AnimationValue): string`: validates, then returns an
  `@keyframes` block and `.animated` rule containing the complete animation
  shorthand. Throws `RangeError` if validation fails. It never writes to the
  DOM, clipboard, or filesystem.

The only exported types are `AnimationKeyframe`, `AnimationValue`, and
`AnimationEditorProps`. There is no default export or custom error class.

## Editing, playback and export rules

Numeric edits emit finite values, including out-of-range intermediate values.
Invalid state is reported with `role="alert"`; CSS export and playback are
disabled until corrected. Text fields emit their current text. The iterations
text field emits only numbers or the complete word `infinite`.

Add keyframe inserts an interpolated midpoint in the largest gap. Removing
endpoints is disabled. Browser CSS performs timing and interpolation; Play/Pause
resume the same preview and Restart remounts it. Preview animation names are
instance-specific; exported names are exactly `value.name`. Export uses only
validated numbers and supported easing syntax, not arbitrary CSS properties.
The read-only export is selectable text; downloading is the consumer's choice.

The preview box may clip large transforms. No arbitrary property tracks,
per-segment easing, steps, scrubbing, event tracks, import of CSS, or video export
are supported. The stylesheet respects `prefers-reduced-motion` by disabling the
animated preview while preserving export data. Browser rendering can differ
slightly by engine; there is no production certification claim.

## Customization and accessibility

All selectors are rooted in `.lpa-editor`. Change `--lpa-accent` on the root,
or supply `className`/`style`; no global CSS reset is used. Inputs have visible
labels, frames have fieldset legends, buttons are native keyboard-operable
controls, errors are announced, and focus has a visible outline. Consumers
should provide sufficient contrast for customized colors.

[CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations) |

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
