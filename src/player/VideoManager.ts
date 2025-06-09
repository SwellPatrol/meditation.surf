/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { ManagedVideo } from "./ManagedVideo";

/** Coordinates playback and preserves state for multiple videos. */
export class VideoManager {
  /** Registry mapping URLs to managed video objects. */
  private readonly registry: Map<string, ManagedVideo> = new Map();

  /** URL currently playing or `undefined` if none. */
  private activeUrl: string | undefined;

  /** Screenshot element for the background video. */
  private bgShot: any;

  /** Screenshot element for the overlay video. */
  private overlayShot: any;

  /** Reference to the VideoTexture component. */
  private videoTexture: any;

  /** Current stage dimensions. */
  private stageW: number = 0;
  private stageH: number = 0;

  /** Record Lightning components used for rendering. */
  public setComponents(texture: any, bg: any, overlay: any): void {
    this.videoTexture = texture;
    this.bgShot = bg;
    this.overlayShot = overlay;
  }

  /** Update dimensions on resize. */
  public setStageSize(w: number, h: number): void {
    this.stageW = w;
    this.stageH = h;
  }

  /** Pause any active video and start the requested one. */
  public async play(url: string, overlay: boolean): Promise<void> {
    if (this.activeUrl !== undefined && this.activeUrl !== url) {
      const active: ManagedVideo = this.registry.get(
        this.activeUrl,
      ) as ManagedVideo;
      await active.pause();
      this.displayScreenshot(active);
    }

    let video: ManagedVideo | undefined = this.registry.get(url);
    if (video === undefined) {
      video = new ManagedVideo(url, overlay);
      this.registry.set(url, video);
    }

    this.activeUrl = url;
    await this.startVideo(video, overlay);
  }

  /** Begin playback and position the video texture. */
  private async startVideo(
    video: ManagedVideo,
    overlay: boolean,
  ): Promise<void> {
    const x: number = overlay ? this.stageW / 2 : 0;
    const y: number = overlay ? this.stageH / 2 : 0;
    const w: number = overlay ? this.stageW / 2 : this.stageW;
    const h: number = overlay ? this.stageH / 2 : this.stageH;

    // Ensure correct layering.
    const z: number = overlay ? 4 : 2;
    if (this.videoTexture) {
      this.videoTexture.patch({ x, y, w, h, zIndex: z });
    }
    await video.play(x, y, w, h);
    this.hideScreenshot(overlay ? "overlay" : "background");
  }

  /** Show the screenshot for the specified URL if available. */
  private displayScreenshot(video: ManagedVideo): void {
    const src: string | undefined = video.getScreenshot();
    if (src === undefined) {
      return;
    }

    const element = video.isOverlay() ? this.overlayShot : this.bgShot;
    if (element !== undefined) {
      element.patch({ src, alpha: 1 });
    }
  }

  private hideScreenshot(which: "overlay" | "background"): void {
    const element = which === "overlay" ? this.overlayShot : this.bgShot;
    if (element !== undefined) {
      element.patch({ alpha: 0 });
    }
  }
}

/** Singleton instance. */
let instance: VideoManager | undefined;
export function getVideoManager(): VideoManager {
  if (instance === undefined) {
    instance = new VideoManager();
  }
  return instance;
}
