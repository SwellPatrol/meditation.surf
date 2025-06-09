/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import shaka from "shaka-player/dist/shaka-player.compiled.js";

/**
 * Wrapper around a Shaka Player instance that handles pausing by capturing a
 * screenshot and destroying the player to save resources.
 */
export class ShakaVideo {
  /** DOM id for the underlying video element. */
  private readonly id: string;

  /** CSS class for positioning (top or bottom). */
  private readonly positionClass: string;

  /** URL currently loaded into the player. */
  private readonly url: string;

  /** Shaka Player instance for playback. */
  private player: any | undefined;

  /** Video element used for playback. */
  private videoEl: HTMLVideoElement | undefined;

  /** Image element showing the paused frame. */
  private readonly screenshotEl: HTMLImageElement;

  /** Playback time saved when pausing. */
  private currentTime: number = 0;

  constructor(id: string, positionClass: string, url: string) {
    this.id = id;
    this.positionClass = positionClass;
    this.url = url;

    // Pre-create the screenshot element so it persists while paused.
    this.screenshotEl = document.createElement("img");
    this.screenshotEl.classList.add("video-half", positionClass);
    this.screenshotEl.style.position = "absolute";
    this.screenshotEl.style.zIndex = "0";
    this.screenshotEl.style.display = "none";
    document.body.appendChild(this.screenshotEl);
  }

  /** Create and attach the video element used for playback. */
  private createVideoEl(): HTMLVideoElement {
    const video: HTMLVideoElement = document.createElement("video");
    video.id = this.id;
    video.classList.add("video-half", this.positionClass);
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    return video;
  }

  /**
   * Start or resume playback. The previously saved time position is restored
   * if the video was paused earlier.
   */
  public async play(): Promise<void> {
    if (this.videoEl === undefined) {
      this.videoEl = this.createVideoEl();
      document.body.appendChild(this.videoEl);
      this.player = new shaka.Player(this.videoEl);
    }

    const player: any = this.player as any;
    await player.load(this.url, this.currentTime);
    await this.videoEl.play().catch((): void => {
      /* ignore */
    });

    this.videoEl.addEventListener(
      "playing",
      (): void => {
        this.screenshotEl.style.display = "none";
      },
      { once: true },
    );
  }

  /**
   * Pause playback by capturing the current frame and tearing down the player.
   */
  public async pause(): Promise<void> {
    if (this.videoEl === undefined || this.player === undefined) {
      return;
    }

    this.currentTime = this.videoEl.currentTime;

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = this.videoEl.videoWidth;
    canvas.height = this.videoEl.videoHeight;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (ctx !== null) {
      ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);
      this.screenshotEl.src = canvas.toDataURL("image/png");
      this.screenshotEl.style.display = "block";
    }

    await this.player.destroy();
    this.videoEl.remove();
    this.videoEl = undefined;
    this.player = undefined;
  }
}
