/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default Blits.Component("Home", {
  /* ----------------  Scene graph template  ------------------------ */
  template: `
    <!-- Full-screen black background -->
    <Element :w="$stageW" :h="$stageH" color="#000000" />
  `,

  /* ----------------  Reactive state  ------------------------------ */
  state() {
    return {
      /** Logical stage width in Lightning coordinates (px). */
      stageW: window.innerWidth as number,
      /** Logical stage height in Lightning coordinates (px). */
      stageH: window.innerHeight as number,
    };
  },

  /* ----------------  Lifecycle hooks  ----------------------------- */
  hooks: {
    /**
     * Runs once the component is on stage:
     * • syncs stage size with the viewport,
     * • attaches a resize listener.
     */
    ready(): void {
      // Arrow function so `this` remains the component instance
      const updateDimensions = (): void => {
        this.stageW = window.innerWidth;
        this.stageH = window.innerHeight;
        // Keep compatibility with tests expecting `w`/`h` properties

        (this as any).w = this.stageW;

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
    },
  },
});
