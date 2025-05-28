/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

export default Blits.Component("Home", {
  // Render a full-screen black background with the spinning icon
  template: `
    <Element :w="$w" :h="$h" color="#000000">
      <Element
        src="assets/icon.png"
        :w="$iconSize"
        :h="$iconSize"
        mount="{x: 0.5, y: 0.5}"
        :x="$w / 2"
        :y="$h / 2"
        :rotation.transition="{value: $rotation, duration: 800, easing: 'cubic-bezier(0.34,1.56,0.64,1)'}"
      />
    </Element>
  `,
  state() {
    return {
      /** Width of the canvas, updated on resize */
      w: window.innerWidth as number,
      /** Height of the canvas, updated on resize */
      h: window.innerHeight as number,
      /**
       * Calculated size of the icon. The value is based on the smaller
       * dimension of the viewport to maintain a square aspect ratio.
       */
      iconSize: (Math.min(window.innerWidth, window.innerHeight) / 4) as number,
      /** Rotation of the icon in degrees */
      rotation: 0 as number,
    };
  },
  hooks: {
    ready() {
      /**
       * Helper to synchronize the canvas and component size with the browser
       * window.
       */
      const updateDimensions = (): void => {
        // Capture the latest viewport dimensions
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        // Keep the icon square based on the smallest side
        this.iconSize = Math.min(this.w, this.h) / 4;

        if (typeof document !== "undefined") {
          const canvas = document.querySelector(
            "canvas",
          ) as HTMLCanvasElement | null;
          if (canvas) {
            canvas.width = this.w;
            canvas.height = this.h;
            canvas.style.width = `${this.w}px`;
            canvas.style.height = `${this.h}px`;
          }
        }

        // Notify the renderer of the new size so the stage updates
        if (typeof this.$size === "function") {
          this.$size({ w: this.w, h: this.h });
        }
      };

      // Ensure correct initial dimensions and react to future resizes
      updateDimensions();
      window.addEventListener("resize", updateDimensions);

      this.startSpin();
    },
  },
  methods: {
    /** Continuously spin the icon */
    startSpin(): void {
      this.$setInterval(() => {
        this.rotation += 360;
      }, 800);
    },
  },
});
