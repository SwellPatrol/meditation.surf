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

// Minimal LightningJS app with a white background
const LightningApp: LightningAppFactory = Blits.Application({
  // Track viewport dimensions for the root stage
  state() {
    return {
      stageW: window.innerWidth as number, // viewport width
      stageH: window.innerHeight as number, // viewport height
    };
  },

  // Render a white root element
  template: `<Element :w="$stageW" :h="$stageH" color="#ffffff" />`,
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
