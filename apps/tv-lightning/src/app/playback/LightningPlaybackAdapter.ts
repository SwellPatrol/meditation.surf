/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { AudioPreferences } from "@meditation-surf/core";
import type {
  PlaybackController,
  PlaybackSource,
} from "@meditation-surf/player-core";

import AudioState from "../state/AudioState";

declare global {
  // ESLint treats global type-only declarations as unused variables.
  // This declaration exists solely so `globalThis.shaka` has a concrete type.
  var shaka: (typeof import("shaka-player"))["default"];
}

type ShakaModule = typeof globalThis.shaka;
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;
type ShakaImportResult = {
  default: ShakaModule;
};
/**
 * @brief Lightning-specific playback adapter backed by a DOM video element and Shaka
 *
 * The shared controller contract stays in `packages/player-core`, while this
 * class owns the TV app's platform playback implementation details.
 */
export class LightningPlaybackAdapter implements PlaybackController {
  // Shared DOM video element created once at boot
  private videoElement: HTMLVideoElement | null = null;

  // Active Shaka Player instance or `null` when idle
  private shakaPlayer: ShakaPlayer | null = null;

  // True after the video element has been configured
  private initialized: boolean = false;

  // Active playback source, if one has been loaded
  private currentSource: PlaybackSource | null = null;

  /**
   * @brief Accept fitted stage bounds from bootstrap code for API stability
   *
   * @param left - Left edge of the stage in pixels
   * @param top - Top edge of the stage in pixels
   * @param width - Stage width in pixels
   * @param height - Stage height in pixels
   *
   * @returns No value because the fullscreen background no longer consumes stage-relative bounds
   */
  public setDisplayBounds(
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    // The Lightning canvas is still fitted to the TV stage, but the DOM video
    // now acts as a true fullscreen background layer. Keep this method so the
    // bootstrap flow does not need to change, even though the video no longer
    // consumes stage-relative bounds.
    void left;
    void top;
    void width;
    void height;
  }

  /**
   * @brief Create the shared video element on first access
   *
   * @returns The shared DOM video element
   */
  private ensureVideoElement(): HTMLVideoElement {
    const existingVideoElement: HTMLVideoElement | null = this.videoElement;
    if (existingVideoElement !== null) {
      return existingVideoElement;
    }

    const videoElement: HTMLVideoElement = document.createElement("video");
    this.configureVideoElement(videoElement);
    this.applyDisplayBounds(videoElement);
    document.body.appendChild(videoElement);
    this.videoElement = videoElement;

    return videoElement;
  }

  /**
   * @brief Configure the shared DOM video element once when it is created
   *
   * @param videoElement - Video element instance to configure for background playback
   *
   * @returns No value because the element is configured in place
   */
  private configureVideoElement(videoElement: HTMLVideoElement): void {
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("playsinline", "");
    videoElement.loop = true;

    videoElement.style.position = "absolute";
    videoElement.style.objectFit = "cover";
    videoElement.style.zIndex = "0";

    // Save audio changes so user preferences persist across sessions
    videoElement.addEventListener("volumechange", (): void => {
      AudioState.setMuted(videoElement.muted);
      AudioState.setVolume(videoElement.volume);
    });
  }

  /**
   * @brief Apply fullscreen viewport bounds to the shared video element
   *
   * @param videoElement - Video element instance to size against the viewport
   *
   * @returns No value because the element styles are updated in place
   */
  private applyDisplayBounds(videoElement: HTMLVideoElement): void {
    // Fill the entire viewport and let `object-fit: cover` crop the excess so
    // the video behaves like a true fullscreen background.
    videoElement.style.left = "0";
    videoElement.style.top = "0";
    videoElement.style.width = "100vw";
    videoElement.style.height = "100vh";
  }

  /**
   * @brief Configure the shared DOM video element if needed
   *
   * @returns No value because initialization mutates internal adapter state
   */
  public initialize(): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();

    if (!this.initialized) {
      const defaultAudioPreferences: AudioPreferences =
        AudioPreferences.defaults();

      // Mute before initial playback so autoplay is more likely to succeed
      this.setMuted(true);
      this.setVolume(defaultAudioPreferences.volume);
      this.initialized = true;
    }

    this.applyDisplayBounds(videoElement);
    videoElement.style.display = "block";
  }

  /**
   * @brief Destroy the active Shaka Player instance if one exists
   *
   * @returns A promise that resolves after the active Shaka player has been torn down
   */
  private async destroyShakaPlayer(): Promise<void> {
    const shakaPlayer: ShakaPlayer | null = this.shakaPlayer;
    if (shakaPlayer === null) {
      return;
    }

    this.shakaPlayer = null;

    try {
      await shakaPlayer.destroy();
    } catch (error: unknown) {
      console.error("Failed to destroy Shaka Player", error);
    }
  }

  /**
   * @brief Load a shared playback source into Shaka Player
   *
   * @param source - Platform-agnostic playback source metadata
   *
   * @returns A promise that resolves after the adapter has attempted to load the source
   */
  public async load(source: PlaybackSource): Promise<void> {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();

    // Avoid reloading the same stream to preserve smooth TV playback.
    if (this.currentSource?.url === source.url) {
      return;
    }

    // Mute before starting playback to maximize autoplay success
    this.setMuted(true);
    this.currentSource = source;

    const restoreAudio: () => void = (): void => {
      const muted: boolean = AudioState.isMuted();
      const volume: number = AudioState.getVolume();
      this.setMuted(muted);
      this.setVolume(volume);
    };
    videoElement.addEventListener("playing", restoreAudio, { once: true });

    await this.destroyShakaPlayer();

    const shakaModule: ShakaImportResult =
      await import("shaka-player/dist/shaka-player.compiled.js");
    const shakaLib: ShakaModule = shakaModule.default;

    shakaLib.polyfill.installAll();
    if (!shakaLib.Player.isBrowserSupported()) {
      console.error("Shaka Player is not supported in this browser");
      return;
    }

    const shakaPlayer: ShakaPlayer = new shakaLib.Player(videoElement);
    this.shakaPlayer = shakaPlayer;

    try {
      await shakaPlayer.load(source.url);
    } catch (error: unknown) {
      console.error("Failed to load stream with Shaka", error);
    }
  }

  /**
   * @brief Resume playback on the shared video element
   *
   * @returns A promise that resolves when playback has started
   */
  public play(): Promise<void> {
    return this.ensureVideoElement().play();
  }

  /**
   * @brief Pause playback on the shared video element
   *
   * @returns No value because pausing happens synchronously on the video element
   */
  public pause(): void {
    this.ensureVideoElement().pause();
  }

  /**
   * @brief Apply the mute state to the underlying video element
   *
   * @param muted - Whether the player should be muted
   *
   * @returns No value because the mute state is applied directly to the video element
   */
  public setMuted(muted: boolean): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();

    videoElement.muted = muted;
    if (muted) {
      videoElement.setAttribute("muted", "");
    } else {
      videoElement.removeAttribute("muted");
    }
  }

  /**
   * @brief Set the playback volume on the underlying video element
   *
   * @param volume - Volume value in [0, 1]
   *
   * @returns No value because the clamped volume is applied directly to the video element
   */
  public setVolume(volume: number): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();
    const clampedVolume: number = AudioPreferences.clampVolume(volume);
    videoElement.volume = clampedVolume;
  }

  /**
   * @brief Tear down the current player instance and hide the video element
   *
   * @returns A promise that resolves after player teardown has completed
   */
  public async destroy(): Promise<void> {
    const videoElement: HTMLVideoElement | null = this.videoElement;
    this.currentSource = null;

    if (videoElement !== null) {
      videoElement.pause();
      videoElement.style.display = "none";
    }

    await this.destroyShakaPlayer();
  }
}

const lightningPlaybackAdapter: LightningPlaybackAdapter =
  new LightningPlaybackAdapter();

export default lightningPlaybackAdapter;
