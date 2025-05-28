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
       * Pixel size of the icon. The image is 256x256, so keep it at
       * its native resolution regardless of the viewport size.
       */
      iconSize: 256 as number,
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
      const updateDimensions = () => {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
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
