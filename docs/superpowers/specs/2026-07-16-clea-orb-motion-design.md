# Clea Orb Motion Design

## Goal

Make the Clea orb feel calm and alive through a slow breathing cycle and visible internal movement, without changing its size, blue palette, or role in the chat interface.

## Motion Design

- Replace the current rapid pulse with a 4.8-second organic breathing cycle.
- Scale the core subtly so the motion reads as breathing rather than a heartbeat.
- Synchronize the outer glow and ripple with the breathing cadence.
- Add two asymmetrical, blurred gradient currents inside the clipped orb.
- Move the currents at different speeds and in opposing directions to avoid a mechanical rotation effect.
- Keep the existing highlight, but slow its drift so it supports the internal currents.

## Implementation

The effect will remain CSS-driven. `CleaLiveOrb` will gain two decorative internal-current elements, while `app/globals.css` will define their appearance and keyframes. The orb core will continue clipping all internal layers to its circular boundary.

No runtime state, timers, canvas, SVG filters, or third-party animation dependencies are required.

## Accessibility and Performance

- All orb elements remain decorative and hidden from assistive technology.
- `prefers-reduced-motion: reduce` disables the breath, currents, glow, ripple, rotation, and highlight drift.
- Animations use transforms and opacity where possible to keep rendering inexpensive.

## Verification

- Confirm the orb breathes on a slow, continuous 4.8-second cadence.
- Confirm at least two internal shapes visibly drift without leaving the orb boundary.
- Confirm the ripple and glow support rather than overpower the core motion.
- Confirm reduced-motion mode presents a stable orb.
- Run the focused Clea component test and the relevant static checks.
