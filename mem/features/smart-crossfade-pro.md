---
name: Smart Crossfade + Gapless Pro
description: Premium DJ-grade crossfade curve picker (linear/equal-power/smooth/exponential) and Gapless Pro zero-gap overlap, both gated in Settings
type: feature
---
- State lives in PlayerContext: `crossfadeCurve` and `gaplessPro`, persisted to localStorage (`uf_crossfade_curve`, `uf_gapless_pro`, `uf_crossfade`, `uf_crossfade_duration`).
- `startCrossfade` applies curve math per step (cos/sin for equal-power, smoothstep for smooth, squared for exponential, linear fallback).
- Gapless Pro: when ON and crossfade OFF, fires `startCrossfade` at 0.45s remaining for a zero-gap overlap; uses current `crossfadeCurve`.
- Settings UI: curve grid (4 buttons) + Gapless Pro switch under crossfade section; both gated with Crown icon for non-premium and navigate to /premium on tap.
- Premium FEATURES entry: "Smart Crossfade + Gapless Pro".
- Zero infra cost — runs entirely client-side using existing dual-audio-element setup.
