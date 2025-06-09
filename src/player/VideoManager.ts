/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { PLAYLIST } from "../playlist";
import { ShakaVideo } from "./ShakaVideo";

/**
 * Manages multiple ShakaVideo instances so only one is active at a time.
 */
export class VideoManager {
  /** Underlying video wrappers. */
  private readonly videos: ShakaVideo[] = [];

  /** Index of the currently playing video, if any. */
  private activeIndex: number | undefined;

  constructor() {
    this.videos.push(new ShakaVideo("video-top", "video-top", PLAYLIST[0]));
    this.videos.push(
      new ShakaVideo("video-bottom", "video-bottom", PLAYLIST[1]),
    );
  }

  /** Play the specified video and pause the previous one. */
  public async play(index: number): Promise<void> {
    if (this.activeIndex !== undefined && this.activeIndex !== index) {
      await this.videos[this.activeIndex].pause();
    }

    this.activeIndex = index;
    await this.videos[index].play();
  }

  /** Pause the specified video. */
  public async pause(index: number): Promise<void> {
    await this.videos[index].pause();
    if (this.activeIndex === index) {
      this.activeIndex = undefined;
    }
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
