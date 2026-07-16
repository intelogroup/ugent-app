# Clea Orb Motion Design

## Goal

Make the Clea orb feel calm and unmistakably alive through an automatic, continuous breathing cycle and clearly visible internal movement, without changing its size, blue palette, or role in the chat interface.

## Motion Design

- Replace the current rapid pulse with a 4.8-second organic breathing cycle.
- Scale the core subtly so the motion reads as breathing rather than a heartbeat.
- Synchronize the outer glow and ripple with the breathing cadence.
- Add two asymmetrical, blurred gradient currents inside the clipped orb.
- Increase the currents' opacity, contrast, size, and travel distance so their movement reads immediately.
- Move the currents at different speeds and in opposing directions to avoid a mechanical rotation effect.
- Add a brighter rotating inner ribbon that makes the continuous loop unmistakable.
- Keep the existing highlight, but slow its drift so it supports the internal currents.
- Start every motion automatically when the orb mounts and repeat it infinitely without pauses.

## Implementation

The effect will remain CSS-driven. `CleaLiveOrb` will retain two decorative internal-current elements and gain one inner-ribbon element, while `app/globals.css` will define their appearance and keyframes. The orb core will continue clipping all internal layers to its circular boundary.

No runtime state, timers, canvas, SVG filters, or third-party animation dependencies are required.

## Accessibility and Performance

- All orb elements remain decorative and hidden from assistive technology.
- `prefers-reduced-motion: reduce` replaces spatial movement with a gentle looping opacity shift; the orb never appears inert.
- Animations use transforms and opacity where possible to keep rendering inexpensive.

## Verification

- Confirm the orb breathes on a slow, continuous 4.8-second cadence.
- Confirm at least two internal shapes visibly drift without leaving the orb boundary.
- Confirm the inner ribbon rotates automatically and continuously when the orb appears.
- Confirm the ripple and glow support rather than overpower the core motion.
- Confirm reduced-motion mode retains a subtle, continuous opacity loop without scaling, translating, or rotating.
- Run the focused Clea component test and the relevant static checks.
