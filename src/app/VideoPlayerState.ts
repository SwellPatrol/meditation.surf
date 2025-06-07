/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { VideoPlayer } from "@lightningjs/sdk";

/**
 * Wrapper holding a reference to the Lightning SDK VideoPlayer.
 * This module initializes the VideoPlayer once and exposes it
 * so that app instances can access the same underlying resources
 * even when the application is recreated.
 */
class VideoPlayerState {
  /** Global VideoPlayer instance from the Lightning SDK. */
  public readonly player: typeof VideoPlayer;

  /** True after the video player has been configured and started. */
  private initialized: boolean;

  constructor() {
    // The VideoPlayer plugin sets up its video tag only once.
    this.player = VideoPlayer;
    this.initialized = false as boolean;
  }

  /**
   * Configure the shared video player and start playback if needed.
   *
   * @param width - Width of the viewport in pixels.
   * @param height - Height of the viewport in pixels.
   */
  public initialize(width: number, height: number): void {
    // Ensure a <video> element exists so the player can attach to it
    let videoEl: HTMLVideoElement | null = document.querySelector(
      "#video-player",
    ) as HTMLVideoElement | null;
    if (videoEl === null) {
      videoEl = document.createElement("video") as HTMLVideoElement;
      videoEl.id = "video-player";
      videoEl.style.position = "absolute";
      videoEl.style.zIndex = "0";
      videoEl.style.top = "0";
      videoEl.style.left = "0";
      document.body.appendChild(videoEl);
    }

    // Size the <video> element to cover the viewport
    this.player.position(0, 0);
    this.player.size(width, height);

    if (!this.initialized) {
      // Place the video behind the Lightning canvas
      const videoEl: HTMLVideoElement | null =
        (this.player as unknown as { _videoEl: HTMLVideoElement })._videoEl ??
        null;
      if (videoEl !== null) {
        videoEl.style.zIndex = "0";
      }

      // Start playing Big Buck Bunny on first initialization
      this.player.open(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      );
      this.player.loop(true);
      this.initialized = true as boolean;
    }
  }
}

/** Singleton instance of the video player state. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
