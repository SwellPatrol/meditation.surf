/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  DEMO_BACKGROUND_VIDEO_POLICY,
  getDemoBackgroundVideoSource,
} from "@meditation-surf/core";
import type { PlaybackSource } from "@meditation-surf/player-core";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

/**
 * @brief Apply the shared demo background playback policy to the web video element
 */
export function configureDemoBackgroundVideoElement(
  videoElement: HTMLVideoElement,
): void {
  videoElement.autoplay = DEMO_BACKGROUND_VIDEO_POLICY.autoplay;
  videoElement.controls = false;
  videoElement.crossOrigin = "anonymous";
  videoElement.loop = DEMO_BACKGROUND_VIDEO_POLICY.loop;
  videoElement.muted = DEMO_BACKGROUND_VIDEO_POLICY.muted;
  videoElement.preload = "auto";
  videoElement.playsInline = DEMO_BACKGROUND_VIDEO_POLICY.playsInline;
  videoElement.style.objectFit = DEMO_BACKGROUND_VIDEO_POLICY.objectFit;
  videoElement.setAttribute("autoplay", "");
  videoElement.setAttribute("crossorigin", "anonymous");
  videoElement.setAttribute("loop", "");
  videoElement.setAttribute("muted", "");
  videoElement.setAttribute("playsinline", "");
}

/**
 * @brief Apply the minimal background playback behavior expected by the demo
 */
export async function attemptDemoBackgroundAutoplay(
  videoElement: HTMLVideoElement,
): Promise<void> {
  videoElement.muted = DEMO_BACKGROUND_VIDEO_POLICY.muted;
  videoElement.autoplay = DEMO_BACKGROUND_VIDEO_POLICY.autoplay;
  videoElement.loop = DEMO_BACKGROUND_VIDEO_POLICY.loop;
  videoElement.playsInline = DEMO_BACKGROUND_VIDEO_POLICY.playsInline;

  try {
    await videoElement.play();
  } catch (error: unknown) {
    console.warn(
      "Background video autoplay was blocked by the browser.",
      error,
    );
  }
}

/**
 * @brief Load the shared demo HLS stream using native playback when available
 * and Shaka as the browser compatibility fallback
 */
export async function loadDemoBackgroundVideo(
  videoElement: HTMLVideoElement,
): Promise<ShakaPlayer | null> {
  const playbackSource: PlaybackSource = getDemoBackgroundVideoSource();
  const playbackSourceUrl: string = playbackSource.url;
  const playbackMimeType: string =
    playbackSource.mimeType ?? "application/x-mpegURL";
  const canUseNativeHlsPlayback: boolean =
    videoElement.canPlayType(playbackMimeType) !== "";

  if (canUseNativeHlsPlayback) {
    videoElement.src = playbackSourceUrl;
    videoElement.addEventListener(
      "loadedmetadata",
      (): void => {
        void attemptDemoBackgroundAutoplay(videoElement);
      },
      { once: true },
    );
    videoElement.load();

    return null;
  }

  // Load Shaka only when native HLS playback is unavailable so the initial
  // browser demo stays as small as possible.
  const shakaModule: { default: ShakaModule } =
    await import("shaka-player/dist/shaka-player.compiled.js");
  const shaka: ShakaModule = shakaModule.default;

  shaka.polyfill.installAll();
  if (!shaka.Player.isBrowserSupported()) {
    console.error("Shaka Player is not supported in this browser.");
    return null;
  }

  const shakaPlayer: ShakaPlayer = new shaka.Player(videoElement);

  try {
    await shakaPlayer.load(playbackSourceUrl);
    await attemptDemoBackgroundAutoplay(videoElement);
  } catch (error: unknown) {
    console.error("Failed to load the shared demo stream.", error);
  }

  return shakaPlayer;
}
