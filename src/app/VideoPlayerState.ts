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

  /**
   * Ensure that a <video> element with id "video-player" exists in the DOM.
   * The Lightning SDK normally creates the element automatically, but some
   * environments might skip this setup. This helper guarantees that a video
   * tag is present so the player can attach to it.
   *
   * @param width - Width of the viewport in pixels.
   * @param height - Height of the viewport in pixels.
   * @returns The HTML video element used by the player.
   */
  private ensureVideoElement(width: number, height: number): HTMLVideoElement {
    let videoEl: HTMLVideoElement | null = document.getElementById(
      "video-player",
    ) as HTMLVideoElement | null;

    if (videoEl === null) {
      videoEl = document.createElement("video") as HTMLVideoElement;
      videoEl.id = "video-player";
      videoEl.width = width;
      videoEl.height = height;
      videoEl.style.position = "absolute";
      videoEl.style.zIndex = "0";
      videoEl.style.top = "0px";
      videoEl.style.left = "0px";
      document.body.appendChild(videoEl);
    }

    return videoEl;
  }

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
    // Guarantee a video element is present for the player
    const videoElement: HTMLVideoElement = this.ensureVideoElement(
      width,
      height,
    );

    // Start playback on the first initialization
    if (!this.initialized) {
      this.player.open(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      );
      this.player.loop(true);
      this.initialized = true as boolean;
    }

    // Ensure the video covers the viewport
    this.player.position(0, 0);
    this.player.size(width, height);

    // Place the video behind the Lightning canvas
    videoElement.style.zIndex = "0";
  }
}

/** Singleton instance of the video player state. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
