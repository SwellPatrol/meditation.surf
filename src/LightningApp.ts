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
  // Stage dimensions are captured on launch
  state() {
    return {
      width: window.innerWidth as number,
      height: window.innerHeight as number,
    };
  },

  computed: {
    /**
     * Size of the square icon that covers the viewport.
     * The largest stage dimension is used so the icon
     * always fills the screen while keeping its aspect ratio.
     */
    iconSize(): number {
      return Math.max(this.width, this.height);
    },
  },

  // Render the icon centered on a black canvas
  template: `<Element :w="$width" :h="$height">
    <Element
      src="assets/icon.png"
      :w="$iconSize"
      :h="$iconSize"
      :x="$width / 2"
      :y="$height / 2"
      :mount="0.5"
    />
  </Element>`,
});

/**
 * Launch the LightningJS application sized to the current viewport
 */
export function launchLightningApp(width: number, height: number): void {
  Blits.Launch(LightningApp, "app", {
    w: width,
    h: height,
  });
}
