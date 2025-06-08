/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Ads, Lightning, Log, Settings, VideoPlayer } from "@lightningjs/sdk";
import { initSettings } from "@lightningjs/sdk/src/Settings";
import { initLightningSdkPlugin } from "@metrological/sdk";

/**
 * Wrapper holding a reference to the Lightning SDK VideoPlayer.
 * This module initializes the VideoPlayer once and exposes it
 * so that app instances can access the same underlying resources
 * even when the application is recreated.
 */
class VideoPlayerState {
  /** Global VideoPlayer instance from the Lightning SDK. */
  public readonly videoPlayer: typeof VideoPlayer;

  /** True after the video player has been configured. */
  private initialized: boolean;

  /** Lightning application instance provided after launch. */
  private appInstance: unknown | null;

  constructor() {
    // The VideoPlayer plugin sets up its video tag only once.
    this.videoPlayer = VideoPlayer;
    this.initialized = false as boolean;
    this.appInstance = null as unknown | null;
  }

  /**
   * Provide the active Lightning application instance so the VideoPlayer
   * plugin can attach itself to the stage.
   *
   * @param app - Root Lightning application instance.
   */
  public setAppInstance(app: unknown): void {
    this.appInstance = app;
  }

  /**
   * Log whether the video element is present in the DOM. This aids debugging
   * scenarios where the Lightning SDK fails to create its `<video>` element.
   */
  private logVideoElement(): void {
    const videoElement: HTMLVideoElement | null =
      document.querySelector("video");
    if (videoElement === null) {
      console.warn("Video element not found in DOM");
    } else {
      console.debug("Video element found", videoElement);
    }
  }

  /**
   * Configure the shared VideoPlayer instance if it has not been initialized.
   *
   * @param width - Width of the viewport in pixels.
   * @param height - Height of the viewport in pixels.
   */
  public initialize(width: number, height: number): void {
    // Lazily initialize the plugin by calling a benign method once.
    if (!this.initialized) {
      // Configure the Lightning SDK plugin so the VideoPlayer has access to
      // runtime services such as logging and settings.
      initSettings({}, { width, height });
      initLightningSdkPlugin.log = Log;
      initLightningSdkPlugin.settings = Settings;
      initLightningSdkPlugin.ads = Ads;
      initLightningSdkPlugin.lightning = Lightning;
      if (this.appInstance !== null) {
        initLightningSdkPlugin.appInstance = this.appInstance as unknown;
      }

      this.videoPlayer.hide();
      this.logVideoElement();
      this.initialized = true as boolean;
    }

    // Ensure the video covers the viewport
    this.videoPlayer.position(0, 0);
    this.videoPlayer.size(width, height);
    this.logVideoElement();
  }
}

/** Singleton instance of the video player state. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
