/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import { VideoPlayer } from "@lightningjs/sdk";

// Type alias for the factory returned by Blits.Component
type VideoFactory = ReturnType<typeof Blits.Component>;

/**
 * Full-screen video component that streams an example HLS video.
 * The component sizes the VideoPlayer to match the current stage
 * dimensions so the video fills the viewport.
 */
const Video: VideoFactory = Blits.Component("Video", {
  // Stage dimensions provided by the parent component
  props: ["stageW", "stageH"],

  hooks: {
    /**
     * Configure the VideoPlayer when the component initializes.
     * The player is positioned at the top-left corner and
     * stretched to cover the entire viewport.
     */
    init(): void {
      // @ts-ignore `this` includes the reactive props at runtime
      const width: number = this.stageW as number;
      // @ts-ignore `this` includes the reactive props at runtime
      const height: number = this.stageH as number;

      VideoPlayer.consumer(this as unknown as any);
      VideoPlayer.position(0, 0);
      VideoPlayer.size(width, height);
      VideoPlayer.open("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
      VideoPlayer.play();
      VideoPlayer.show();
    },

    /**
     * Clean up the VideoPlayer when the component is destroyed.
     */
    destroy(): void {
      VideoPlayer.close();
    },
  },

  watch: {
    /**
     * React to width changes by resizing the VideoPlayer.
     */
    stageW(newW: number): void {
      // @ts-ignore `this` includes the reactive props at runtime
      VideoPlayer.size(newW, this.stageH as number);
    },

    /**
     * React to height changes by resizing the VideoPlayer.
     */
    stageH(newH: number): void {
      // @ts-ignore `this` includes the reactive props at runtime
      VideoPlayer.size(this.stageW as number, newH);
    },
  },

  // Render an empty element as the VideoPlayer lives outside the canvas
  template: `<Element />`,
});

export default Video;
