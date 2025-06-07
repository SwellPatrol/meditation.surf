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
type VideoOverlayFactory = ReturnType<typeof Blits.Component>;

/**
 * Component that plays a video centered on the stage. The video is rendered
 * to a texture so it can be composited on top of the icon.
 */
const VideoOverlay: VideoOverlayFactory = Blits.Component("VideoOverlay", {
  // Stage dimensions passed from the parent component
  props: ["stageW", "stageH"],

  computed: {
    /**
     * Size of the square video in pixels. The largest stage dimension is used
     * so the video completely covers the icon while maintaining its aspect
     * ratio.
     */
    videoSize(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return Math.max(this.stageW as number, this.stageH as number);
    },
  },

  methods: {
    /**
     * Update the video player's size and position to remain centered and cover
     * the icon on screen.
     */
    updateArea(): void {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const w: number = this.videoSize as number;
      const h: number = w;
      // @ts-ignore `this` contains the reactive props provided at runtime
      const left: number = (this.stageW as number) / 2 - w / 2;
      // @ts-ignore `this` contains the reactive props provided at runtime
      const top: number = (this.stageH as number) / 2 - h / 2;

      VideoPlayer.area(top, left + w, top + h, left);
    },
  },

  watch: {
    /** Recalculate the video area whenever the stage width changes. */
    stageW(): void {
      this.updateArea();
    },

    /** Recalculate the video area whenever the stage height changes. */
    stageH(): void {
      this.updateArea();
    },
  },

  hooks: {
    /**
     * Initialize the video player in texture mode and start playback.
     */
    init(): void {
      VideoPlayer.consumer(this as never);
      this.updateArea();
      VideoPlayer.open(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      );
    },

    /**
     * Clean up video resources when the component is destroyed.
     */
    destroy(): void {
      VideoPlayer.close();
    },
  },

  // Video element itself is managed by the VideoPlayer plugin so there is no
  // template markup for this component.
  template: "",
});

export default VideoOverlay;
