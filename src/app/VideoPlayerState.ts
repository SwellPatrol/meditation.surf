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
   * Register a Lightning component to receive VideoPlayer events.
   *
   * @param app - Root Lightning application instance.
   */
  public setAppInstance(app: unknown): void {
    this.appInstance = app;
    initLightningSdkPlugin.appInstance = app as unknown;
    if (this.initialized) {
      this.videoPlayer.consumer(app as any);
    }
  }

  /**
   * Ensure the Lightning VideoPlayer has inserted its `<video>` element.
   * The plugin lazily creates this tag on the first interaction, so we call
   * `hide()` to trigger setup if needed and append the element to the DOM.
   */
  private ensureVideoElement(): void {
    let element: HTMLVideoElement | undefined = (this.videoPlayer as any)
      ._videoEl;

    // Trigger the plugin's setup routine if the tag does not exist yet
    if (element === undefined) {
      this.videoPlayer.hide();
      element = (this.videoPlayer as any)._videoEl;
    }

    if (element !== undefined && !element.isConnected) {
      document.body.appendChild(element);
    }
  }

  /**
   * Log whether the video element is present in the DOM. This aids debugging
   * scenarios where the Lightning SDK fails to create its `<video>` element.
   */
  private logVideoElement(): void {
    const videoElement: HTMLVideoElement | null =
      document.querySelector("video");
    const internalElement: HTMLVideoElement | null =
      (this.videoPlayer as any)._videoEl ?? null;
    if (videoElement === null) {
      console.info("Video element not found in DOM");
    } else {
      console.info("Video element found in DOM", videoElement);
    }
    if (internalElement === null) {
      console.info("VideoPlayer._videoEl is null");
    } else {
      console.info("VideoPlayer._videoEl", internalElement);
    }
  }

  /**
   * Configure the shared VideoPlayer instance if it has not been initialized.
   *
   * @param width - Width of the viewport in pixels.
   * @param height - Height of the viewport in pixels.
   */
  public initialize(width: number, height: number): void {
    console.debug(
      `VideoPlayerState.initialize: width=${width} height=${height}`,
    );

    if (this.appInstance === null) {
      console.warn(
        "VideoPlayerState.initialize skipped: no app instance provided",
      );
      return;
    }

    // Ensure the SDK's `<video>` tag exists and is attached to the DOM
    this.ensureVideoElement();

    // Lazily initialize the plugin by calling a benign method once.
    if (!this.initialized) {
      // The plugin needs Settings, Logging, and the Lightning instance.
      // Disable texture mode because Blits does not expose the old Lightning
      // Application APIs required by the VideoTexture integration.
      initSettings({}, { width, height, textureMode: false });
      initLightningSdkPlugin.log = Log;
      initLightningSdkPlugin.settings = Settings;
      initLightningSdkPlugin.ads = Ads;
      initLightningSdkPlugin.lightning = Lightning;
      if (this.appInstance !== null) {
        initLightningSdkPlugin.appInstance = this.appInstance as unknown;
        this.videoPlayer.consumer(this.appInstance as any);
      } else {
        console.warn(
          "VideoPlayerState.initialize called without an app instance",
        );
      }

      this.videoPlayer.hide();
      this.logVideoElement();
      console.info("VideoPlayer plugin initialized");
      console.info("After hide()", {
        videoElement: (this.videoPlayer as any)._videoEl,
      });
      this.initialized = true as boolean;
    }

    // Ensure the video covers the viewport
    this.videoPlayer.position(0, 0);
    this.videoPlayer.size(width, height);

    this.videoPlayer.show();
    console.info("VideoPlayer shown on stage");
    console.info("VideoPlayer internal state", {
      videoElement: (this.videoPlayer as any)._videoEl,
      consumer: (this.videoPlayer as any)._consumer,
    });

    // In texture mode the plugin provides a Lightning component that must be
    // inserted into the scene graph. Because texture mode is disabled, this
    // block is kept for reference but does not run.
    if (this.appInstance !== null && Settings.get("platform", "textureMode")) {
      const texture: any = (this.appInstance as any).tag("VideoTexture");
      const container: any = (this.appInstance as any).tag("VideoBackground");
      if (texture !== undefined && container !== undefined) {
        container.childList.add(texture);
        texture.patch({ x: 0, y: 0, w: width, h: height, zIndex: 2 });
        console.debug("Video texture added to stage");
      }
    }

    this.logVideoElement();
    console.info("VideoPlayer initialization complete");
  }
}

/** Singleton instance of the video player state. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
