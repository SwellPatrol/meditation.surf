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
import type shaka from "shaka-player/dist/shaka-player.compiled.js";

/**
 * Manages a single global LightningJS VideoPlayer instance.
 * The player uses Shaka to load HLS streams and renders as a WebGL texture.
 */
class VideoPlayerState {
  /** Underlying VideoPlayer from the Lightning SDK. */
  public readonly videoPlayer: typeof VideoPlayer;

  /** Active Shaka Player or `null` when no stream is loaded. */
  private shakaPlayer: shaka.Player | null;

  /** Whether initialization has completed. */
  private initialized: boolean;

  /** Lightning application instance or `null` when not attached. */
  private appInstance: unknown | null;

  /** Wrapper exposing LightningJS methods expected by the SDK plugin. */
  private instanceWrapper: unknown | null;

  constructor() {
    this.videoPlayer = VideoPlayer;
    this.shakaPlayer = null;
    this.initialized = false;
    this.appInstance = null;
    this.instanceWrapper = null;
  }

  /**
   * Expose the internal `<video>` tag for screenshot capture.
   */
  public get videoElement(): HTMLVideoElement | undefined {
    return (this.videoPlayer as any)._videoEl as HTMLVideoElement | undefined;
  }

  /** Record the Lightning application instance so events reach the stage. */
  public setAppInstance(app: unknown | null): void {
    this.appInstance = app;
    if (app === null) {
      this.instanceWrapper = null;
      initLightningSdkPlugin.appInstance = undefined as unknown as undefined;
      return;
    }

    const component: any = app as any;
    this.instanceWrapper = {
      tag: (name: string): unknown => {
        if (typeof component.tag === "function") {
          return component.tag(name);
        }
        return undefined;
      },
      stage: component.stage ?? component,
      childList: component.childList ?? component.stage?.childList,
      fire:
        typeof component.fire === "function"
          ? component.fire.bind(component)
          : typeof component.$emit === "function"
            ? component.$emit.bind(component)
            : undefined,
    } as unknown;

    initLightningSdkPlugin.appInstance = this.instanceWrapper as unknown;
    if (this.initialized) {
      this.videoPlayer.consumer(this.instanceWrapper as any);
    }
  }

  /** Clear the registered application instance. */
  public clearAppInstance(): void {
    this.appInstance = null;
    this.instanceWrapper = null;
    initLightningSdkPlugin.appInstance = undefined as unknown as undefined;
  }

  /** Obtain the currently registered Lightning application instance. */
  public getAppInstance(): unknown | null {
    return this.appInstance;
  }

  /**
   * Initialize the VideoPlayer plugin in texture mode using Shaka for playback.
   */
  public initialize(width: number, height: number): void {
    if (this.initialized) {
      this.videoPlayer.position(0, 0);
      this.videoPlayer.size(width, height);
      return;
    }

    if (this.appInstance === null) {
      console.warn("VideoPlayerState.initialize called without app instance");
      return;
    }

    // Configure Lightning SDK and enable texture mode so video renders on canvas.
    initSettings({}, { width, height, textureMode: true });
    initLightningSdkPlugin.log = Log;
    initLightningSdkPlugin.settings = Settings;
    initLightningSdkPlugin.ads = Ads;
    initLightningSdkPlugin.lightning = Lightning;
    initLightningSdkPlugin.appInstance = this.instanceWrapper as unknown;
    this.videoPlayer.consumer(this.instanceWrapper as any);

    // Provide a loader that uses Shaka Player for HLS streams.
    this.videoPlayer.loader(
      (
        url: string,
        videoEl: HTMLVideoElement,
        config: { startTime?: number },
      ): Promise<void> => {
        return new Promise((resolve: () => void): void => {
          void import("shaka-player/dist/shaka-player.compiled.js").then(
            (module: { default: typeof shaka }): void => {
              const shakaLib: typeof shaka = module.default;
              shakaLib.polyfill.installAll();
              if (!shakaLib.Player.isBrowserSupported()) {
                console.error("Shaka Player unsupported");
                resolve();
                return;
              }
              this.shakaPlayer = new shakaLib.Player(videoEl);
              const start: number = config.startTime ?? 0;
              (this.shakaPlayer as shaka.Player)
                .load(url, start)
                .then(resolve)
                .catch((err: unknown): void => {
                  console.error("Shaka load error", err);
                  resolve();
                });
            },
          );
        });
      },
    );

    // Destroy Shaka when the player unloads.
    this.videoPlayer.unloader((videoEl: HTMLVideoElement): Promise<void> => {
      return new Promise((resolve: () => void): void => {
        if (this.shakaPlayer !== null) {
          this.shakaPlayer
            .destroy()
            .catch((err: unknown): void => {
              console.error("Shaka destroy error", err);
            })
            .finally((): void => {
              this.shakaPlayer = null;
              videoEl.removeAttribute("src");
              videoEl.load();
              resolve();
            });
        } else {
          videoEl.removeAttribute("src");
          videoEl.load();
          resolve();
        }
      });
    });

    // Position full screen by default.
    this.videoPlayer.position(0, 0);
    this.videoPlayer.size(width, height);
    this.videoPlayer.show();
    this.initialized = true;
  }
}

/** Global singleton instance. */
const videoPlayerState: VideoPlayerState = new VideoPlayerState();
export default videoPlayerState;
