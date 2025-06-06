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

// LightningJS app that displays the icon full screen
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
     * Use the largest stage dimension so the image always
     * fills the screen.
     */
    iconSize(): number {
      return Math.max(this.stageW, this.stageH);
    },
  },

  hooks: {
    /**
     * Listen for window resize events so the app keeps
     * filling the viewport when dimensions change.
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
     * Signal that rendering is finished. The DOM listener
     * in `index.ts` uses this to know when it can swap
     * canvases without a visual flash.
     */
    ready(): void {
      window.dispatchEvent(new Event("lightningReady"));
    },

    /**
     * Remove the resize listener when the app is destroyed.
     */
    destroy(): void {
      const self: any = this;
      if (self.resizeListener !== undefined) {
        window.removeEventListener("resize", self.resizeListener as () => void);
      }
    },
  },

  // Render the icon centered on a black background
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
export function launchLightningApp(target: HTMLElement): void {
  Blits.Launch(LightningApp, target, {
    w: window.innerWidth,
    h: window.innerHeight,
    canvasColor: "#000000",
  });
}
