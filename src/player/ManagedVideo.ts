/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import shaka from "shaka-player/dist/shaka-player.compiled.js";

/**
 * Holds playback state for a single video URL. The screenshot element persists
 * across play and pause so that it can be reattached to different containers.
 */
export class ManagedVideo {
  /** URL for this video. */
  private readonly url: string;

  /** Shaka Player instance used for playback. */
  private player: shaka.Player | undefined;

  /** Video element that renders the stream. */
  private videoEl: HTMLVideoElement | undefined;

  /** Image element displaying the paused frame. */
  private readonly screenshotEl: HTMLImageElement;

  /** Last playback position in seconds. */
  private currentTime: number = 0;

  constructor(url: string) {
    this.url = url;

    this.screenshotEl = document.createElement("img");
    this.screenshotEl.style.position = "absolute";
    this.screenshotEl.style.top = "0";
    this.screenshotEl.style.left = "0";
    this.screenshotEl.style.width = "100%";
    this.screenshotEl.style.height = "100%";
    this.screenshotEl.style.objectFit = "cover";
    this.screenshotEl.style.display = "none";
  }

  /**
   * Create the HTML video element and attach it to the provided container.
   */
  private attachVideo(container: HTMLElement): void {
    if (this.videoEl !== undefined) {
      container.appendChild(this.videoEl);
      return;
    }

    const video: HTMLVideoElement = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";

    container.appendChild(video);
    this.videoEl = video;
    this.player = new shaka.Player(video);
  }

  /**
   * Start or resume playback at the previously saved time.
   */
  public async play(container: HTMLElement): Promise<void> {
    // Attach screenshot and video to the new container.
    container.appendChild(this.screenshotEl);
    this.attachVideo(container);

    const player: shaka.Player = this.player as shaka.Player;
    await player.load(this.url, this.currentTime);

    await this.videoEl!.play().catch((): void => {
      /* ignore */
    });

    this.videoEl!.addEventListener(
      "playing",
      (): void => {
        this.screenshotEl.style.display = "none";
      },
      { once: true },
    );
  }

  /**
   * Pause playback and capture the current frame as a screenshot.
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
