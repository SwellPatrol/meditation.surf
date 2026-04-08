/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BackgroundLayerLayout,
  BackgroundVideoPlaybackPolicy,
} from "@meditation-surf/core";
import type {
  PlaybackSource,
  PlaybackVisualReadinessController,
} from "@meditation-surf/player-core";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

/**
 * @brief Own web-specific background video playback behavior
 *
 * This controller keeps DOM video configuration and Shaka fallback logic local
 * to the web app while consuming the shared background video model.
 */
export class WebBackgroundVideoController {
  private readonly backgroundLayer: BackgroundLayerLayout;
  private readonly playbackVisualReadinessController: PlaybackVisualReadinessController;
  private activeShakaPlayer: ShakaPlayer | null;

  /**
   * @brief Capture the shared experience consumed by the web background player
   *
   * @param backgroundLayer - Shared fullscreen background layer
   */
  public constructor(
    backgroundLayer: BackgroundLayerLayout,
    playbackVisualReadinessController: PlaybackVisualReadinessController,
  ) {
    this.backgroundLayer = backgroundLayer;
    this.playbackVisualReadinessController = playbackVisualReadinessController;
    this.activeShakaPlayer = null;
  }

  /**
   * @brief Apply the shared playback policy to the owned DOM video element
   *
   * @param videoElement - DOM video element used for background playback
   */
  public configureElement(videoElement: HTMLVideoElement): void {
    const playbackPolicy: BackgroundVideoPlaybackPolicy = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackPolicy();

    videoElement.autoplay = playbackPolicy.autoplay;
    videoElement.controls = false;
    videoElement.crossOrigin = "anonymous";
    videoElement.loop = playbackPolicy.loop;
    videoElement.muted = playbackPolicy.muted;
    videoElement.preload = "auto";
    videoElement.playsInline = playbackPolicy.playsInline;
    videoElement.style.objectFit = playbackPolicy.objectFit;
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("loop", "");
    videoElement.setAttribute("muted", "");
    videoElement.setAttribute("playsinline", "");
  }

  /**
   * @brief Start background playback using native HLS or the Shaka fallback
   *
   * @param videoElement - DOM video element used for background playback
   *
   * @returns A promise that resolves after playback has been attempted
   */
  public async start(videoElement: HTMLVideoElement): Promise<void> {
    this.playbackVisualReadinessController.beginLoading();
    this.installFirstRenderedFrameObserver(videoElement);
    this.activeShakaPlayer = await this.load(videoElement);
  }

  /**
   * @brief Tear down active playback resources owned by the web app
   *
   * @returns A promise that resolves after the Shaka player has been destroyed
   */
  public async destroy(): Promise<void> {
    if (this.activeShakaPlayer === null) {
      return;
    }

    const shakaPlayer: ShakaPlayer = this.activeShakaPlayer;
    this.activeShakaPlayer = null;
    await shakaPlayer.destroy();
  }

  /**
   * @brief Apply autoplay flags and attempt to start playback
   *
   * @param videoElement - DOM video element used for background playback
   * @param playbackPolicy - Shared background playback policy
   *
   * @returns A promise that resolves after playback has been attempted
   */
  private async attemptAutoplay(
    videoElement: HTMLVideoElement,
    playbackPolicy: BackgroundVideoPlaybackPolicy,
  ): Promise<void> {
    videoElement.muted = playbackPolicy.muted;
    videoElement.autoplay = playbackPolicy.autoplay;
    videoElement.loop = playbackPolicy.loop;
    videoElement.playsInline = playbackPolicy.playsInline;

    try {
      await videoElement.play();
    } catch (error: unknown) {
      console.warn(
        "Background video autoplay was blocked by the browser.",
        error,
      );
    }
  }

  /**
   * @brief Observe the first visually rendered frame for the current video load
   *
   * Browsers that support `requestVideoFrameCallback()` can report when a
   * frame has actually been presented. Older engines fall back to `loadeddata`,
   * which is the closest practical signal that the first frame is displayable.
   *
   * @param videoElement - DOM video element used for background playback
   */
  private installFirstRenderedFrameObserver(
    videoElement: HTMLVideoElement,
  ): void {
    const hasVideoFrameCallbackApi: boolean =
      "requestVideoFrameCallback" in videoElement;

    if (hasVideoFrameCallbackApi) {
      const listenForRenderedFrame = (): void => {
        (
          videoElement as HTMLVideoElement & {
            requestVideoFrameCallback(callback: () => void): number;
          }
        ).requestVideoFrameCallback((): void => {
          this.playbackVisualReadinessController.markVisualReady();
        });
      };

      videoElement.addEventListener("loadeddata", listenForRenderedFrame, {
        once: true,
      });
      return;
    }

    videoElement.addEventListener(
      "loadeddata",
      (): void => {
        this.playbackVisualReadinessController.markVisualReady();
      },
      {
        once: true,
      },
    );
  }

  /**
   * @brief Load the shared HLS stream into the runtime-specific player path
   *
   * @param videoElement - DOM video element used for background playback
   *
   * @returns Active Shaka player when the fallback path is used
   */
  private async load(
    videoElement: HTMLVideoElement,
  ): Promise<ShakaPlayer | null> {
    const playbackSource: PlaybackSource = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackSource();
    const playbackPolicy: BackgroundVideoPlaybackPolicy = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackPolicy();
    const playbackMimeType: string =
      playbackSource.mimeType ?? "application/x-mpegURL";
    const canUseNativeHlsPlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";

    if (canUseNativeHlsPlayback) {
      videoElement.src = playbackSource.url;
      videoElement.addEventListener(
        "loadedmetadata",
        (): void => {
          void this.attemptAutoplay(videoElement, playbackPolicy);
        },
        { once: true },
      );
      videoElement.load();

      return null;
    }

    // Load Shaka only when native HLS playback is unavailable so the initial
    // browser demo stays as small as possible.
    const shakaModule: { default: ShakaModule } =
      await import("shaka-player/dist/shaka-player.compiled.js");
    const shaka: ShakaModule = shakaModule.default;

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      console.error("Shaka Player is not supported in this browser.");
      return null;
    }

    const shakaPlayer: ShakaPlayer = new shaka.Player(videoElement);

    try {
      await shakaPlayer.load(playbackSource.url);
      await this.attemptAutoplay(videoElement, playbackPolicy);
    } catch (error: unknown) {
      console.error("Failed to load the shared demo stream.", error);
    }

    return shakaPlayer;
  }
}
