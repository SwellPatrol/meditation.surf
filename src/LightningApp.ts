/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

/** Shape of the LightningJS application state. */
export interface AppState {
  stageW: number; // viewport width
  stageH: number; // viewport height
}

/**
 * Global state object shared across multiple LightningJS applications.
 * By sharing a single object, multiple apps can read and mutate the same
 * values without incurring extra allocations.
 */
export const sharedState: AppState = {
  stageW: window.innerWidth,
  stageH: window.innerHeight,
};

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;

// LightningJS app that displays the icon full screen
const LightningApp: LightningAppFactory = Blits.Application({
  /**
   * Provide the shared application state to each instance. Returning the same
   * object ensures that multiple applications reference identical data.
   */
  state() {
    return sharedState;
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
     * Notify the DOM layer when LightningJS has performed its initial render.
     * This allows the code in `index.ts` to swap canvases without causing a
     * visible flicker.
     */
    ready(): void {
      window.dispatchEvent(new Event("lightningReady"));
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
    w: sharedState.stageW,
    h: sharedState.stageH,
    canvasColor: "#000000",
  });
}
