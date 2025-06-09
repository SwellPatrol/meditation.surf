/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import videoPlayerState from "../app/VideoPlayerState";

/**
 * Holds playback state for a single video URL.
 */
export class ManagedVideo {
  /** Stream URL. */
  private readonly url: string;

  /** True when this video should appear as the overlay. */
  private readonly overlay: boolean;

  /** Last playback position in seconds. */
  private currentTime: number = 0;

  /** Base64-encoded screenshot or `undefined` when none captured. */
  private screenshot: string | undefined;

  constructor(url: string, overlay: boolean) {
    this.url = url;
    this.overlay = overlay;
  }

  /** Whether this video is for the overlay position. */
  public isOverlay(): boolean {
    return this.overlay;
  }

  /** Retrieve the screenshot data for rendering. */
  public getScreenshot(): string | undefined {
    return this.screenshot;
  }

  /**
   * Begin playback using the global VideoPlayer.
   *
   * @param x - Left position in pixels.
   * @param y - Top position in pixels.
   * @param w - Width in pixels.
   * @param h - Height in pixels.
   */
  public async play(x: number, y: number, w: number, h: number): Promise<void> {
    const player = videoPlayerState.videoPlayer;
    player.position(x, y);
    player.size(w, h);
    player.open(this.url, { startTime: this.currentTime });
    const videoEl = videoPlayerState.videoElement;
    if (videoEl !== undefined) {
      videoEl.addEventListener(
        "playing",
        (): void => {
          this.screenshot = undefined;
        },
        { once: true },
      );
    }
    player.play();
  }

  /**
   * Pause playback, store the current time, and capture a screenshot.
   */
  public async pause(): Promise<void> {
    const player = videoPlayerState.videoPlayer;
    const videoEl = videoPlayerState.videoElement;
    if (videoEl !== undefined) {
      this.currentTime = videoEl.currentTime;
      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx !== null) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        this.screenshot = canvas.toDataURL("image/png");
      }
    }
    player.pause();
    player.close();
  }
}
