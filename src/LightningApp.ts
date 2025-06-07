/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import { VideoPlayer } from "@lightningjs/sdk";

// Example HLS stream provided by Mux
const HLS_URL: string = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;

// Minimal LightningJS app playing a full-screen HLS video
const LightningApp: LightningAppFactory = Blits.Application({
  // Track viewport dimensions for the root stage
  state() {
    return {
      stageW: window.innerWidth as number, // viewport width
      stageH: window.innerHeight as number, // viewport height
    };
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
        VideoPlayer.size(self.stageW, self.stageH);
      };
      self.resizeListener = listener;
      window.addEventListener("resize", listener);

      VideoPlayer.consumer(self);
      VideoPlayer.size(self.stageW, self.stageH);
      VideoPlayer.open(HLS_URL);
    },

    /**
     * Clean up the resize listener when the component is destroyed.
     */
    destroy(): void {
      const self: any = this;
      if (self.resizeListener) {
        window.removeEventListener("resize", self.resizeListener as () => void);
      }

      VideoPlayer.close();
    },
  },

  // Empty stage used to register resize events while the video plays
  template: `<Element :w="$stageW" :h="$stageH" />`,
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
