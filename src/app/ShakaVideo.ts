/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import AudioState from "./AudioState";

/* global shaka */

/**
 * Fullscreen video player backed by Shaka Player.
 * A single instance manages one HTML video element attached behind the
 * Lightning canvas so the UI components render on top.
 */
export class ShakaVideo {
  /** URL of the demo video used for testing playback. */
  public static readonly DEMO_URL: string =
    "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8";

  /** Underlying HTML video element. */
  private readonly videoElement: HTMLVideoElement;

  /** Active Shaka Player instance or `null` when not initialized. */
  private shakaPlayer: shaka.Player | null;

  /** Whether setup has already completed. */
  private initialized: boolean;

  /** Currently loaded media URL, if any. */
  private currentUrl: string | null;

  constructor() {
    this.videoElement = document.createElement("video");
    this.shakaPlayer = null as shaka.Player | null;
    this.initialized = false as boolean;
    this.currentUrl = null as string | null;
  }

  /**
   * Initialize the HTML video element and Shaka Player if needed.
   * The element is appended to the app container behind the canvas.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const mount: HTMLElement = document.getElementById("app") as HTMLElement;
    this.videoElement.style.position = "absolute";
    this.videoElement.style.top = "0";
    this.videoElement.style.left = "0";
    this.videoElement.style.width = "100%";
    this.videoElement.style.height = "100%";
    this.videoElement.style.objectFit = "cover";
    this.videoElement.style.zIndex = "0";
    this.videoElement.setAttribute("playsinline", "");
    this.videoElement.setAttribute("autoplay", "");
    this.videoElement.setAttribute("crossorigin", "anonymous");
    this.videoElement.controls = false;
    this.videoElement.muted = true;
    mount.prepend(this.videoElement);

    const module: { default: typeof shaka } = await import(
      "shaka-player/dist/shaka-player.compiled.js"
    );
    const shakaLib: typeof shaka = module.default;
    shakaLib.polyfill.installAll();
    if (!shakaLib.Player.isBrowserSupported()) {
      console.error("Shaka Player is not supported in this browser");
      return;
    }

    this.shakaPlayer = new shakaLib.Player(this.videoElement);
    this.initialized = true as boolean;
  }

  /**
   * Load and begin playback of a media URL using Shaka Player.
   *
   * @param url - Media URL to play.
   */
  public async playUrl(url: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.shakaPlayer === null) {
      return;
    }
    if (this.currentUrl !== url) {
      try {
        await this.shakaPlayer.load(url);
        this.currentUrl = url;
      } catch (error: unknown) {
        console.error("Failed to load stream with Shaka", error);
      }
    }

    const restore: () => void = (): void => {
      const muted: boolean = AudioState.isMuted();
      const volume: number = AudioState.getVolume();
      this.setMuted(muted);
      this.setVolume(volume);
      this.videoElement.removeEventListener("playing", restore);
    };
    this.videoElement.addEventListener("playing", restore, { once: true });

    this.videoElement.play().catch((err: unknown): void => {
      console.warn("Autoplay failed", err);
    });
  }

  /**
   * Apply the mute flag to the video element and persist it.
   *
   * @param muted - Whether the video should be muted.
   */
  public setMuted(muted: boolean): void {
    this.videoElement.muted = muted;
    if (muted) {
      this.videoElement.setAttribute("muted", "");
    } else {
      this.videoElement.removeAttribute("muted");
    }
    AudioState.setMuted(muted);
  }

  /**
   * Set the video element's volume and persist the value.
   *
   * @param volume - Volume level in [0, 1].
   */
  public setVolume(volume: number): void {
    const clamped: number = Math.min(Math.max(volume, 0), 1);
    this.videoElement.volume = clamped;
    AudioState.setVolume(clamped);
  }
}

/** Singleton instance of the Shaka video player. */
const shakaVideo: ShakaVideo = new ShakaVideo();

export default shakaVideo;
