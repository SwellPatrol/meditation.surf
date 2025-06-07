/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import Icon from "./components/Icon";

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

  // Register child components available in the template
  components: {
    Icon,
  },

  // No computed properties for the stage itself. The resize listener in
  // `bootstrap.ts` recreates the application when the browser size changes.

  // Render the icon component centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Icon :stageW="$stageW" :stageH="$stageH" />
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
