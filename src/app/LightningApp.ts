/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import Icon from "../components/Icon";
import { getVideoManager, VideoManager } from "../player/VideoManager";
import { PLAYLIST } from "../playlist";
import videoPlayerState from "./VideoPlayerState";

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

  // No computed properties for the stage itself

  hooks: {
    /**
     * Setup the window resize handler so the app continues to
     * cover the viewport when the browser size changes.
     */
    init(): void {
      const self: any = this;
      const manager: VideoManager = getVideoManager();

      const onResize = (): void => {
        self.stageW = window.innerWidth;
        self.stageH = window.innerHeight;
        manager.setStageSize(self.stageW, self.stageH);
        videoPlayerState.initialize(self.stageW, self.stageH);

        const overlayEl: any = self.tag("OverlayShot");
        if (overlayEl) {
          overlayEl.patch({
            w: self.stageW / 2,
            h: self.stageH / 2,
            x: self.stageW / 2,
            y: self.stageH / 2,
          });
        }

        const bgEl: any = self.tag("BgShot");
        if (bgEl) {
          bgEl.patch({ w: self.stageW, h: self.stageH });
        }
      };

      self.resizeListener = onResize;
      window.addEventListener("resize", onResize);

      videoPlayerState.setAppInstance(self);
      videoPlayerState.initialize(self.stageW, self.stageH);

      const texture: any = self.tag("VideoTexture");
      const bg: any = self.tag("BgShot");
      const overlay: any = self.tag("OverlayShot");
      manager.setComponents(texture, bg, overlay);
      manager.setStageSize(self.stageW, self.stageH);

      let index: number = 0;
      void manager.play(PLAYLIST[index], false);
      window.setInterval((): void => {
        index = (index + 1) % PLAYLIST.length;
        const overlayMode: boolean = index === 1;
        void manager.play(PLAYLIST[index], overlayMode);
      }, 5000);
    },

    /**
     * Clean up the resize listener when the component is destroyed.
     */
    destroy(): void {
      const self: any = this;
      if (self.resizeListener) {
        window.removeEventListener("resize", self.resizeListener as () => void);
      }
      videoPlayerState.clearAppInstance();
    },
  },

  // Render the icon component centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Icon :stageW="$stageW" :stageH="$stageH" />
    <Element ref="BgShot" :w="$stageW" :h="$stageH" zIndex="1" />
    <Element ref="OverlayShot" :w="$stageW / 2" :h="$stageH / 2" zIndex="3" :x="$stageW / 2" :y="$stageH / 2" />
  </Element>`,
});

export default LightningApp;
