/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */
import AudioState from "./AudioState";

declare global {
  // ESLint treats global type-only declarations as unused variables.
  // This declaration exists solely so `globalThis.shaka` has a concrete type.
  // eslint-disable-next-line no-unused-vars
  var shaka: (typeof import("shaka-player"))["default"];
}

type ShakaModule = typeof globalThis.shaka;
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;
type ShakaImportResult = {
  default: ShakaModule;
};
type DisplayBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * @brief Shared playback controller for the DOM video element
 *
 * Lightning renders only the UI while app code owns media playback.
 */
export class VideoPlayerState {
  // Shared DOM video element created once at boot
  private videoElement: HTMLVideoElement | null;

  // Active Shaka Player instance or `null` when idle
  private shakaPlayer: ShakaPlayer | null;

  // True after the video element has been configured
  private initialized: boolean;

  // URL currently loaded in the player, if any
  private currentUrl: string | null;

  // Boot-time DOM bounds for the displayed stage
  private displayBounds: DisplayBounds | null;

  /**
   * @brief Initialize the video player state with empty values
   */
  constructor() {
    this.videoElement = null as HTMLVideoElement | null;
    this.shakaPlayer = null as ShakaPlayer | null;
    this.initialized = false as boolean;
    this.currentUrl = null as string | null;
    this.displayBounds = null as DisplayBounds | null;
  }

  /**
   * @brief Update the onscreen bounds of the shared video element
   *
   * @param left - Left edge of the viewport in pixels
   * @param top - Top edge of the viewport in pixels
   * @param width - Width of the viewport in pixels
   * @param height - Height of the viewport in pixels
   */
  public setDisplayBounds(
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    this.displayBounds = {
      left,
      top,
      width,
      height,
    };
    this.applyDisplayBounds();
  }

  /**
   * @brief Create the shared video element on first access
   *
   * @returns The shared DOM video element
   */
  private ensureVideoElement(): HTMLVideoElement {
    if (this.videoElement !== null) {
      return this.videoElement;
    }

    const videoElement: HTMLVideoElement = document.createElement("video");
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("playsinline", "");
    videoElement.loop = true;

    videoElement.style.position = "absolute";
    videoElement.style.objectFit = "cover";
    videoElement.style.zIndex = "0";

    // Save audio changes so user preferences persist across sessions.
    videoElement.addEventListener("volumechange", (): void => {
      AudioState.setMuted(videoElement.muted);
      AudioState.setVolume(videoElement.volume);
    });

    document.body.appendChild(videoElement);
    this.videoElement = videoElement;

    return videoElement;
  }

  /**
   * @brief Apply the stored display bounds to the shared video element
   */
  private applyDisplayBounds(): void {
    if (this.displayBounds === null || this.videoElement === null) {
      return;
    }

    this.videoElement.style.left = `${this.displayBounds.left}px`;
    this.videoElement.style.top = `${this.displayBounds.top}px`;
    this.videoElement.style.width = `${this.displayBounds.width}px`;
    this.videoElement.style.height = `${this.displayBounds.height}px`;
  }

  /**
   * @brief Configure the shared DOM video element if needed
   *
   * @param width - Width of the viewport in pixels
   * @param height - Height of the viewport in pixels
   */
  public initialize(width: number, height: number): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();

    if (!this.initialized) {
      // Mute before initial playback so autoplay is more likely to succeed.
      this.setMuted(true);
      this.setVolume(AudioState.getVolume());
      this.initialized = true as boolean;
    }

    if (this.displayBounds === null) {
      this.setDisplayBounds(0, 0, width, height);
    } else {
      this.applyDisplayBounds();
    }

    videoElement.style.display = "block";
  }

  /**
   * @brief Destroy the active Shaka Player instance if one exists
   */
  private async destroyShakaPlayer(): Promise<void> {
    if (this.shakaPlayer === null) {
      return;
    }

    try {
      await this.shakaPlayer.destroy();
    } catch (error: unknown) {
      console.error("Failed to destroy Shaka Player", error);
    }

    this.shakaPlayer = null;
  }

  /**
   * @brief Open a video URL using Shaka Player and begin playback
   *
   * @param url - Media URL to play
   */
  public playUrl(url: string): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();

    // Avoid reloading the same URL to prevent repeated Shaka loads.
    if (this.currentUrl === url) {
      void videoElement.play().catch((error: unknown): void => {
        console.warn("Autoplay failed", error);
      });
      return;
    }

    // Mute before starting playback to maximize autoplay success.
    this.setMuted(true);
    this.currentUrl = url;

    const restoreAudio: () => void = (): void => {
      const muted: boolean = AudioState.isMuted();
      const volume: number = AudioState.getVolume();
      this.setMuted(muted);
      this.setVolume(volume);
    };
    videoElement.addEventListener("playing", restoreAudio, { once: true });

    void this.loadStream(url, videoElement);
  }

  /**
   * @brief Load a media stream into Shaka Player and start playback
   *
   * @param url - Media URL to load
   * @param videoElement - Shared DOM video element used for playback
   */
  private async loadStream(
    url: string,
    videoElement: HTMLVideoElement,
  ): Promise<void> {
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
      await shakaPlayer.load(url);
      await videoElement.play();
    } catch (error: unknown) {
      console.error("Failed to load stream with Shaka", error);
    }
  }

  /**
   * @brief Apply the mute state to the underlying video element
   *
   * @param muted - Whether the player should be muted
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
   */
  public setVolume(volume: number): void {
    const videoElement: HTMLVideoElement = this.ensureVideoElement();
    const clampedVolume: number = Math.min(Math.max(volume, 0), 1);
    videoElement.volume = clampedVolume;
  }
}

// Singleton instance of the video player state
const videoPlayerState: VideoPlayerState = new VideoPlayerState();

export default videoPlayerState;
