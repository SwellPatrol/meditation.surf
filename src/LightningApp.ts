/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;

// Minimal LightningJS app displaying a full-screen icon
const LightningApp: LightningAppFactory = Blits.Application({
  // Track viewport dimensions for the root stage
  state() {
    return {
      stageW: window.innerWidth as number, // viewport width
      stageH: window.innerHeight as number, // viewport height
    };
  },

  computed: {
    /**
     * Size of the square icon that covers the viewport.
     * The largest stage dimension is used so the icon
     * always fills the screen while keeping its aspect ratio.
     */
    iconSize(): number {
      return Math.max(this.stageW, this.stageH);
    },
  },

  hooks: {
    /**
     * Setup the window resize handler so the app continues to
     * cover the viewport when the browser size changes.
     */
    init(): void {
      const self: any = this;
      const listener: () => void = (): void => {
        self.stageW = window.innerWidth;
        self.stageH = window.innerHeight;
      };
      self.resizeListener = listener;
      window.addEventListener("resize", listener);
    },

    /**
     * Clean up the resize listener when the component is destroyed.
     */
    destroy(): void {
      const self: any = this;
      if (self.resizeListener) {
        window.removeEventListener("resize", self.resizeListener as () => void);
      }
    },
  },

  // Render the icon centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Element
      src="assets/icon.png"
      :w="$iconSize"
      :h="$iconSize"
      :x="$stageW / 2"
      :y="$stageH / 2"
      :mount="0.5"
    />
  </Element>`,
});

/**
 * Launch the LightningJS application sized to the current viewport
 */
export function launchLightningApp(): void {
  Blits.Launch(LightningApp, "app", {
    w: window.innerWidth,
    h: window.innerHeight,
    canvasColor: "#000000",
  });
}
