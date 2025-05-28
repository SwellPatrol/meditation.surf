/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Native-resolution size of the spinning logo, in pixels. */
const ICON_SIZE_PX = 256 as const;

/** Interval (ms) between successive 360-degree spins. */
const SPIN_INTERVAL_MS = 800 as const;

/* ------------------------------------------------------------------ */
/*  Utility                                                           */
/* ------------------------------------------------------------------ */

/**
 * Returns the current viewport size *after* accounting for mobile
 * visual-viewport shifts (browser chrome, orientation changes, zoom, …).
 */
function getViewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  return vv
    ? { w: Math.round(vv.width), h: Math.round(vv.height) }
    : { w: window.innerWidth, h: window.innerHeight };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default Blits.Component("Home", {
  /* ----------------  Scene graph template  ------------------------ */
  template: `
    <Element :w="$stageW" :h="$stageH" color="#000000">
      <Element
        src="assets/icon.png"
        :w="$iconSize"
        :h="$iconSize"
        mount="{x:0.5,y:0.5}"
        :x="$stageW / 2" :y="$stageH / 2"
        :rotation.transition="{
          value: $rotation,
          duration: $spinInterval,
          easing: 'linear'
        }"
      />
    </Element>
  `,

  /* ----------------  Reactive state  ------------------------------ */
  state() {
    const { w, h } = getViewportSize();
    return {
      /** Logical stage width in Lightning coordinates (px). */
      stageW: w as number,
      /** Logical stage height in Lightning coordinates (px). */
      stageH: h as number,
      /** Deprecated width alias for tests. */
      w: w as number,
      /** Deprecated height alias for tests. */
      h: h as number,
      /** Rotation of the icon in degrees. */
      rotation: 0 as number,
      /** Icon size in pixels. */
      iconSize: ICON_SIZE_PX as number,
      /** Spin interval in milliseconds. */
      spinInterval: SPIN_INTERVAL_MS as number,
    };
  },

  /* ----------------  Lifecycle hooks  ----------------------------- */
  hooks: {
    ready(): void {
      /** Update stage + reactive state once, using the *latest* viewport size. */
      const applyViewportSize = (): void => {
        const { w, h } = getViewportSize();
        if (w !== this.stageW || h !== this.stageH) {
          this.stageW = w;
          this.stageH = h;
          this.w = w;
          this.h = h;
          if (typeof (this as any).$size === "function") {
            this.$size({ w, h }); // $size() takes an object with w and h
          }

          if (typeof document !== "undefined") {
            const canvas = document.querySelector("canvas") as
              | HTMLCanvasElement
              | null;
            if (canvas) {
              canvas.width = w;
              canvas.height = h;
              canvas.style.width = `${w}px`;
              canvas.style.height = `${h}px`;
            }
          }
        }
      };

      /**
       * Debounced wrapper – schedule the update for the next animation
       * frame so we always capture the *final* size after an orientation flip.
       */
      const hasRAF = typeof window.requestAnimationFrame === "function";
      const requestFrame = hasRAF
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => setTimeout(cb, 16);
      const cancelFrame = hasRAF
        ? window.cancelAnimationFrame.bind(window)
        : clearTimeout;

      let rafId: number | null = null;
      const scheduleUpdate = (): void => {
        if (rafId !== null) {
          cancelFrame(rafId);
        }
        if (hasRAF) {
          rafId = requestFrame(() => {
            rafId = null;
            applyViewportSize();
          });
        } else {
          applyViewportSize();
        }
      };

      /* Initial layout + listeners */
      applyViewportSize();
      window.addEventListener("resize", scheduleUpdate);
      window.addEventListener("orientationchange", scheduleUpdate);

      /* Clean-up */
      if (typeof (this as any).$onDestroy === "function") {
        this.$onDestroy(() => {
          window.removeEventListener("resize", scheduleUpdate);
          window.removeEventListener("orientationchange", scheduleUpdate);
          if (rafId !== null) {
            cancelFrame(rafId);
          }
        });
      }

      /* Start the perpetual spin */
      this.startSpin();
    },
  },

  /* ----------------  Methods  ------------------------------------- */
  methods: {
    /** Increments rotation every `SPIN_INTERVAL_MS` to animate the icon. */
    startSpin(): void {
      this.$setInterval((): void => {
        this.rotation += 360;
      }, SPIN_INTERVAL_MS);
    },
  },
});
