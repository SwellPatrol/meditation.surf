/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import "shaka-player/dist/shaka-player.hls.js";

import { VideoPlayer } from "@lightningjs/sdk";
import Hls from "hls.js";

// Shaka Player attaches itself to the global scope when imported.
/* global shaka */
declare const shaka: any;

/**
 * Manage Shaka Player and Hls.js integration for the Lightning VideoPlayer.
 */
class ShakaLoader {
  /** Current Hls.js instance or null when not in use. */
  private hls: Hls | null;

  /** Current Shaka Player instance or null when not created. */
  private player: shaka.Player | null;

  constructor() {
    this.hls = null as Hls | null;
    this.player = null as shaka.Player | null;
  }

  /**
   * Load a video URL using Shaka Player first, then fall back to Hls.js.
   *
   * @param url - URL of the media to load.
   * @param videoEl - Video tag used by the Lightning VideoPlayer.
   */
  public async load(url: string, videoEl: HTMLVideoElement): Promise<void> {
    if (this.player === null) {
      this.player = new (shaka as any).Player(videoEl);
    } else {
      await this.player.attach(videoEl, true);
    }

    try {
      await this.player!.load(url);
      return;
    } catch (error: unknown) {
      console.error("Shaka Player failed to load", error);
    }

    if (!Hls.isSupported()) {
      throw new Error("HLS is not supported and Shaka playback failed");
    }

    if (this.hls !== null) {
      this.hls.destroy();
    }
    this.hls = new Hls();
    this.hls.attachMedia(videoEl);
    await new Promise<void>((resolve, reject): void => {
      if (this.hls === null) {
        reject(new Error("Hls.js not available"));
        return;
      }
      this.hls.on(Hls.Events.MEDIA_ATTACHED, (): void => {
        this.hls?.loadSource(url);
      });
      this.hls.on(Hls.Events.MANIFEST_PARSED, (): void => {
        videoEl.play().then(resolve).catch(reject);
      });
      this.hls.on(Hls.Events.ERROR, (_event, data): void => {
        if (data?.fatal) {
          reject(new Error(data.type));
        }
      });
    });
  }

  /**
   * Clear playback resources for both Hls.js and Shaka Player.
   *
   * @param videoEl - Video tag used by the Lightning VideoPlayer.
   */
  public async unload(videoEl: HTMLVideoElement): Promise<void> {
    if (this.player !== null) {
      await this.player.detach();
      await this.player.destroy();
      this.player = null;
    }
    if (this.hls !== null) {
      this.hls.destroy();
      this.hls = null;
    }
    videoEl.removeAttribute("src");
  }
}

/** Singleton instance used by the video player plugin. */
const loader: ShakaLoader = new ShakaLoader();

/**
 * Register the custom loader with the Lightning VideoPlayer plugin.
 */
export function registerShakaLoader(): void {
  VideoPlayer.loader(
    (url: string, videoEl: HTMLVideoElement): Promise<void> =>
      loader.load(url, videoEl),
  );
  VideoPlayer.unloader(
    (videoEl: HTMLVideoElement): Promise<void> => loader.unload(videoEl),
  );
}

export default loader;
