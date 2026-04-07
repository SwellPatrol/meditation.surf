/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "@meditation-surf/player-core";

import { DEMO_SURF_VIDEO } from "./catalog/demoCatalog";

/**
 * @brief Playback policy for a runtime-agnostic background video model
 */
export type BackgroundVideoPlaybackPolicy = {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playsInline: boolean;
  objectFit: "cover";
};

/**
 * @brief Shared background video model for the meditation experience
 *
 * The model owns product-level intent only. Each app still decides how to
 * apply this policy to a concrete player implementation.
 */
export class BackgroundVideoModel {
  private readonly playbackSource: PlaybackSource;
  private readonly playbackPolicy: BackgroundVideoPlaybackPolicy;

  /**
   * @brief Create a background video model from source and policy data
   *
   * @param playbackSource - Shared playback source metadata
   * @param playbackPolicy - Shared product playback policy
   */
  public constructor(
    playbackSource: PlaybackSource,
    playbackPolicy: BackgroundVideoPlaybackPolicy,
  ) {
    this.playbackSource = playbackSource;
    this.playbackPolicy = playbackPolicy;
  }

  /**
   * @brief Return the shared playback source for the background treatment
   *
   * @returns The playback source consumed by runtime-specific player adapters
   */
  public getPlaybackSource(): PlaybackSource {
    return this.playbackSource;
  }

  /**
   * @brief Return the shared playback policy for the background treatment
   *
   * @returns Product-level playback flags for runtime adapters
   */
  public getPlaybackPolicy(): BackgroundVideoPlaybackPolicy {
    return this.playbackPolicy;
  }
}

/**
 * @brief Shared product-level playback behavior for the demo background video
 *
 * Each app still owns its own player wiring and fullscreen presentation.
 */
export const DEMO_BACKGROUND_VIDEO_POLICY: BackgroundVideoPlaybackPolicy = {
  autoplay: true,
  loop: true,
  muted: true,
  playsInline: true,
  objectFit: "cover",
};

/**
 * @brief Concrete background model for the current demo scene
 */
export class DemoBackgroundVideo extends BackgroundVideoModel {
  /**
   * @brief Create the canonical demo background video model
   */
  public constructor() {
    super(DEMO_SURF_VIDEO.getPlaybackSource(), DEMO_BACKGROUND_VIDEO_POLICY);
  }
}

/**
 * @brief Backward-compatible alias kept during the domain-model transition
 */
export type DemoBackgroundVideoPolicy = BackgroundVideoPlaybackPolicy;

/**
 * @brief Return the canonical demo background video model
 *
 * @returns Shared demo background video object
 */
export function createDemoBackgroundVideo(): DemoBackgroundVideo {
  return new DemoBackgroundVideo();
}

/**
 * @brief Return the shared demo playback source used by the background treatment
 *
 * @returns The playback source used for the demo background video
 */
export function getDemoBackgroundVideoSource(): PlaybackSource {
  return createDemoBackgroundVideo().getPlaybackSource();
}
