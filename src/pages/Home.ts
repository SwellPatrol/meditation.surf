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
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default Blits.Component("Home", {
  /* ----------------  Scene graph template  ------------------------ */
  template: `
    <!-- Full-screen black background -->
    <Element :w="$stageW" :h="$stageH" color="#000000">
      <!-- Centred, spinning icon -->
      <Element
        src="assets/icon.png"
        :w="$iconSize"
        :h="$iconSize"
        mount="{x:0.5,y:0.5}"               <!-- origin = image centre -->
        :x="$stageW / 2" :y="$stageH / 2"   <!-- keep centred -->
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
    return {
      /** Logical stage width in Lightning coordinates (px). */
      stageW: window.innerWidth as number,
      /** Logical stage height in Lightning coordinates (px). */
      stageH: window.innerHeight as number,
      /** Rotation of the icon in degrees. */
      rotation: 0 as number,
      /** Icon size in pixels */
      iconSize: ICON_SIZE_PX as number,
      /** Spin interval in milliseconds */
      spinInterval: SPIN_INTERVAL_MS as number,
    };
  },

  /* ----------------  Lifecycle hooks  ----------------------------- */
  hooks: {
    /**
     * Runs once the component is on stage:
     * • syncs stage size with the viewport,
     * • attaches a resize listener,
     * • kicks off the spin animation.
     */
    ready(): void {
      // Arrow function so `this` remains the component instance
      const updateDimensions = (): void => {
        this.stageW = window.innerWidth;
        this.stageH = window.innerHeight;
        // Keep compatibility with tests expecting `w`/`h` properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).w = this.stageW;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).h = this.stageH;
        // Inform Lightning that the logical stage size changed if available
        if (typeof this.$size === "function")
          this.$size({ w: this.stageW, h: this.stageH });
      };

      // Initial sizing + listen for future resizes
      updateDimensions();
      window.addEventListener("resize", updateDimensions);

      // Remove listener when component is destroyed
      if (typeof this.$onDestroy === "function")
        this.$onDestroy(() =>
          window.removeEventListener("resize", updateDimensions),
        );

      // Start the perpetual spin
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
