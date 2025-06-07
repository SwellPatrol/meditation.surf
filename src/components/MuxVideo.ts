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
type MuxVideoFactory = ReturnType<typeof Blits.Component>;

/** URL of the sample HLS stream provided by Mux */
const MUX_URL: string = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

/**
 * Component responsible for displaying a video overlay using the
 * Lightning SDK VideoPlayer plugin. The video covers the viewport in
 * the same way as the icon beneath it.
 */
const MuxVideo: MuxVideoFactory = Blits.Component("MuxVideo", {
  // Stage dimensions are passed down from the parent component
  props: ["stageW", "stageH"],

  hooks: {
    /**
     * Prepare the video player and start playback when the component
     * is created.
     */
    init(): void {
      const self: any = this;
      VideoPlayer.consumer(self);
      updateVideoSize(self.stageW as number, self.stageH as number);
      void VideoPlayer.open(MUX_URL);
    },

    /**
     * Stop video playback when the component is destroyed.
     */
    destroy(): void {
      VideoPlayer.close();
    },
  },

  watch: {
    /**
     * Resize the video player whenever the viewport width changes.
     */
    stageW(newW: number): void {
      const self: any = this;
      updateVideoSize(newW, self.stageH as number);
    },

    /**
     * Resize the video player whenever the viewport height changes.
     */
    stageH(newH: number): void {
      const self: any = this;
      updateVideoSize(self.stageW as number, newH);
    },
  },

  // No rendering in the Lightning canvas itself
  template: ``,
});

/**
 * Update the VideoPlayer size and position so that it remains centered
 * and covers the entire viewport while maintaining its aspect ratio.
 */
function updateVideoSize(stageW: number, stageH: number): void {
  const size: number = Math.max(stageW, stageH);
  const left: number = (stageW - size) / 2;
  const top: number = (stageH - size) / 2;
  VideoPlayer.position(top, left);
  VideoPlayer.size(size, size);
}

export default MuxVideo;
