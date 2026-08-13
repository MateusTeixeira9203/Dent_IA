---
name: gsap-core
description: GreenSock GSAP core API for JavaScript animation. Covers gsap.to/from/fromTo/set, easing, staggering, timelines, transform aliases, responsive animations with matchMedia, and accessibility with prefers-reduced-motion.
cpe:
  source: open-design
  original_path: skills/gsap-core/SKILL.md
  original_url: https://github.com/nexu-io/open-design/tree/main/skills/gsap-core
  source_commit: 1cb7eae4
  license: MIT
  integrated_at: 2026-06-22
  adaptation: conteúdo preservado — MIT license allows direct use
---

# GSAP Core

GreenSock Animation Platform — core API for web animation.

## When to Activate

Use when: "gsap animation", "animate this", "timeline", "scroll animation", "stagger elements", "smooth transition", "keyframe animation"

Recommend GSAP for:
- Timeline-based sequencing
- Scroll-driven animation (with ScrollTrigger)
- Runtime control (pause/reverse/seek)
- Framework-agnostic solutions

## Core Methods

```javascript
// Animate TO target values (most common)
gsap.to(".element", { x: 100, opacity: 1, duration: 0.5 });

// Animate FROM values to current state
gsap.from(".card", { y: 30, opacity: 0, duration: 0.4 });

// Explicit start AND end
gsap.fromTo(".hero",
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.6 }
);

// Apply immediately (no animation)
gsap.set(".overlay", { display: "none" });
```

## Essential Properties

```javascript
gsap.to(".element", {
  // Position
  x: 100,        // translateX in px
  y: -50,        // translateY in px
  xPercent: 50,  // translateX in %

  // Size
  scale: 1.2,
  scaleX: 0.8,
  scaleY: 1.1,

  // Rotation
  rotation: 45,    // degrees
  rotationX: 180,  // 3D

  // Appearance
  opacity: 0.5,
  autoAlpha: 1,    // opacity + visibility (use this instead of opacity alone)

  // Timing
  duration: 0.4,   // seconds
  delay: 0.1,
  ease: "power2.out",
  stagger: 0.05,   // delay between each element in a selection
  repeat: -1,      // -1 = infinite
  yoyo: true,      // reverse on repeat

  // Callbacks
  onComplete: () => console.log("done"),
  onStart: () => {},
  onUpdate: () => {},
});
```

## Easing Reference

```javascript
// Built-in easings (most useful)
"none"           // linear
"power1.out"     // gentle deceleration
"power2.out"     // standard deceleration (default)
"power3.out"     // strong deceleration
"back.out(1.7)"  // slight overshoot
"elastic.out(1, 0.3)"  // bouncy
"expo.out"       // fast start, slow end
"circ.out"       // circular, smooth end
```

## Timelines

```javascript
const tl = gsap.timeline({ defaults: { duration: 0.3, ease: "power2.out" } });

tl.from(".hero-title", { y: 20, opacity: 0 })
  .from(".hero-subtitle", { y: 20, opacity: 0 }, "-=0.1")  // overlap by 0.1s
  .from(".hero-cta", { scale: 0.9, opacity: 0 }, "+=0.05");
```

## Stagger (Multiple Elements)

```javascript
// Animate a list of items in sequence
gsap.from(".list-item", {
  y: 20,
  opacity: 0,
  stagger: 0.05,   // 50ms between each
  duration: 0.4,
});

// Advanced stagger: from center outward
gsap.from(".grid-cell", {
  scale: 0,
  stagger: { amount: 0.5, from: "center" },
});
```

## Transform Aliases (Use Instead of CSS Transforms)

```javascript
// Use GSAP aliases for best performance and browser compat
gsap.to(el, { x: 100, rotation: 45 });   // ✓

// Not raw CSS transforms
gsap.to(el, { transform: "translateX(100px) rotate(45deg)" }); // ✗
```

## Responsive & Accessibility

```javascript
// Responsive: different animations per breakpoint
const mm = gsap.matchMedia();

mm.add("(min-width: 768px)", () => {
  gsap.from(".sidebar", { x: -200, opacity: 0 });
});
mm.add("(max-width: 767px)", () => {
  gsap.from(".sidebar", { y: 50, opacity: 0 });
});

// Accessibility: always respect reduced-motion
mm.add("(prefers-reduced-motion: no-preference)", () => {
  // complex animations here
  gsap.from(".hero", { duration: 1, y: 50, opacity: 0 });
});
// Users with prefers-reduced-motion get no animation automatically
```

## Quick Patterns

```javascript
// Fade in on scroll (with ScrollTrigger plugin)
gsap.from(".section", {
  scrollTrigger: ".section",
  opacity: 0, y: 30, duration: 0.5
});

// Loading spinner
gsap.to(".spinner", { rotation: 360, duration: 1, repeat: -1, ease: "none" });

// Hover tilt effect
el.addEventListener("mousemove", (e) => {
  const { x, y, width, height } = el.getBoundingClientRect();
  gsap.to(el, {
    rotationY: ((e.clientX - x) / width - 0.5) * 20,
    rotationX: ((e.clientY - y) / height - 0.5) * -20,
    duration: 0.3,
  });
});
```
