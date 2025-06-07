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

  /** True after the video player has been configured. */
  private initialized: boolean;

  constructor() {
    // The VideoPlayer plugin sets up its video tag only once.
    this.player = VideoPlayer;
    this.initialized = false as boolean;
  }

  /**
   * Ensure the DOM contains a <video> element that the Lightning
   * VideoPlayer plugin can use. The element is hidden by default so
   * it does not interfere with canvas rendering.
   */
  private ensureVideoElement(): HTMLVideoElement {
    const existing: HTMLVideoElement | null = document.getElementById(
      "video-player",
    ) as HTMLVideoElement | null;

    if (existing !== null) {
      return existing;
    }

    const element: HTMLVideoElement = document.createElement("video");
    element.id = "video-player";
    element.style.position = "absolute";
    element.style.zIndex = "0";
    element.style.display = "none";
    element.style.visibility = "hidden";
    element.style.top = "0";
    element.style.left = "0";
    document.body.appendChild(element);
    return element;
  }

  /**
   * Configure the shared VideoPlayer instance if it has not been initialized.
   *
   * @param width - Width of the viewport in pixels.
   * @param height - Height of the viewport in pixels.
   */
  public initialize(width: number, height: number): void {
    // Ensure the <video> element exists for the VideoPlayer plugin.
    this.ensureVideoElement();

    // Lazily initialize the plugin by calling a benign method once.
    if (!this.initialized) {
      this.player.hide();
      this.initialized = true as boolean;
    }

    // Ensure the video covers the viewport
    this.player.position(0, 0);
    this.player.size(width, height);
  }
}

/** Singleton instance of the video player state. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
