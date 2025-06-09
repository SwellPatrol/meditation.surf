/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { ManagedVideo } from "./ManagedVideo";

/**
 * Manages multiple ShakaVideo instances so only one is active at a time.
 */
export class VideoManager {
  /** Map of video URLs to their managed state. */
  private readonly registry: Map<string, ManagedVideo> = new Map();

  /** URL currently playing, if any. */
  private activeUrl: string | undefined;

  /**
   * Play the given video into the specified container. Any currently playing
   * video is paused first.
   */
  public async play(url: string, container: HTMLElement): Promise<void> {
    if (this.activeUrl !== undefined && this.activeUrl !== url) {
      const active: ManagedVideo = this.registry.get(
        this.activeUrl,
      ) as ManagedVideo;
      await active.pause();
    }

    let state: ManagedVideo | undefined = this.registry.get(url);
    if (state === undefined) {
      state = new ManagedVideo(url);
      this.registry.set(url, state);
    }

    this.activeUrl = url;
    await state.play(container);
  }

  /** Pause all managed videos. */
  public async pauseAll(): Promise<void> {
    for (const video of this.registry.values()) {
      await video.pause();
    }
    this.activeUrl = undefined;
  }
}

/** Singleton instance of the video manager. */
let manager: VideoManager | undefined;

/** Obtain the global video manager, creating it on first access. */
export function getVideoManager(): VideoManager {
  if (manager === undefined) {
    manager = new VideoManager();
  }
  return manager;
}
