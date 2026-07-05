---
name: simulator-designer
description: >-
  Guidelines, lessons learned, and visual design rules for creating
  premium, hand-drawn vector notebook and BioRender-style simulators.
---

# Simulator Designer

## Overview
This skill outlines the guidelines, architectural patterns, and design lessons learned from creating interactive biomedical simulators in a cozy, hand-drawn vector notebook / BioRender sketchbook style. It ensures future simulators are visually stunning, biologically accurate, and free of React 19 / Next.js 16 hydration mismatches.

## Quick Start
To start building a new notebook-style simulator:
1. **Design the Biological Metaphor**: Group complex pathways into a cohesive visual metaphor (e.g., dams, conveyor belts, copy factories).
2. **Apply the Hand-Drawn Filter**: Wrap path and shapes in SVG filters (`#hand-drawn-wiggle`, `#hand-drawn-wiggle-fine`) for organic roughness.
3. **Isolate SVG Animations**: Never mix static SVG translations with CSS animations on the same tag. Wrap them in nested `<g>` elements.
4. **Separate Server and Client Components**: Render page metadata and SEO in a server component wrapper; render the interactive simulator in a client component.

---

## Architectural Guidelines & Best Practices

### 1. Separation of Client and Server Concerns (Next.js 16 / React 19)
To avoid the dreaded `In HTML, <head> cannot be a child of <main>` hydration mismatch console errors:
- **Server Wrapper (`page.tsx`)**: Keep the file as a Server Component. Export the page `metadata` (title, description) from it, and import the Client Component body.
- **Client Component (`[Name]Client.tsx`)**: Declare `'use client'` at the top. This handles all interactive simulator states (tabs, hooks, selections).
- **Global Font Loading**: Do **NOT** put `<link>` or `<style>` tags loading Google Fonts inside client component views. Instead, import them globally in `app/globals.css` at the **very top** before Tailwind directive lines:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Quicksand:wght@300..700&display=swap');
  @import "tailwindcss";
  ```
  *(Note: Tailwind v4 preprocessors will fail if `@import url(...)` is placed after `@import "tailwindcss"` as it expands to rules first).*

### 2. SVG Transform Isolation Rule
When animating elements in an SVG (like vibrating a locked enzyme, pulsing a warning label, or scaling a chain terminator):
* **The Problem**: A CSS keyframe animation using a `transform` property (e.g., `transform: scale(1.2)`) will completely override any static SVG layout attribute (e.g., `transform="translate(175, 122)"`) on that same element, snapping the element back to the parent SVG coordinate origin `(0, 0)`.
* **The Solution**: Always use nested group `<g>` tags to separate static placement translations from dynamic CSS keyframe animations:
  ```xml
  <!-- Outer <g> handles static coordinate translation -->
  <g transform="translate(175, 122)">
    <!-- Inner <g> handles CSS class animations (rotate, scale, shiver, opacity) -->
    <g className="rep-warning">
      <circle cx="0" cy="0" r="5" fill="#ef4444" />
      <text x="0" y="-10" text-anchor="middle">ACV Block</text>
    </g>
  </g>
  ```

### 3. Sketchbook & Crayon Aesthetic Details
- **Wobbly Filter**: Wrap paths in `filter="url(#hand-drawn-wiggle)"` for a sketch-like displacement. Use `filter="url(#hand-drawn-wiggle-fine)"` for smaller text elements or dense paths to keep them legible.
- **Colors**: Avoid standard hex primaries. Use warm, custom tones:
  - Backgrounds: `#FAF8F2` (cream-style paper), `#FEFCE8` (sticky note yellow), `#EFF6FF` (sticky blue).
  - Borders: Clean `border-4 border-neutral-800` for bold outline contrast.
- **Micro-Animations**: Add continuous small-scale shivering or flow indicators:
  ```css
  @keyframes shiver {
    0%, 100% { transform: translate(0px, 0px); }
    50% { transform: translate(1px, -1px); }
  }
  ```

---

## Common Mistakes to Avoid
- **Mixing Imports**: Placing Google Fonts `@import url(...)` *after* `@import "tailwindcss"` in Tailwind CSS v4. Preprocessing will fail because `@import` statements must precede all other CSS declarations.
- **Animations without Origin**: Defining keyframe transforms (like `rotate(3deg)`) without setting a `transform-origin` in CSS or SVG. The element will spin or offset around the entire page canvas origin instead of its own center point.
- **Overcrowding Viewports**: Drawing too many elements on a single canvas. Separate logical parts of the biology into sub-tabs (e.g., ETC Complexes vs. ATP Synthase; Leading Strand vs. Lagging Strand Loop).
- **Direct SVG Attribute Overriding**: Expecting React `className` to merge gracefully with inline SVG transform attributes when both modify scale/rotation.
