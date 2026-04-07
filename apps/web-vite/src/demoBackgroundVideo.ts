/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BackgroundVideoModel,
  BackgroundVideoPlaybackPolicy,
} from "@meditation-surf/core";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

/**
 * @brief Apply the shared background playback policy to the web video element
 *
 * @param videoElement - DOM video element that renders the background
 * @param backgroundVideo - Shared background video model
 */
export function configureBackgroundVideoElement(
  videoElement: HTMLVideoElement,
  backgroundVideo: BackgroundVideoModel,
): void {
  const playbackPolicy: BackgroundVideoPlaybackPolicy =
    backgroundVideo.getPlaybackPolicy();

  videoElement.autoplay = playbackPolicy.autoplay;
  videoElement.controls = false;
  videoElement.crossOrigin = "anonymous";
  videoElement.loop = playbackPolicy.loop;
  videoElement.muted = playbackPolicy.muted;
  videoElement.preload = "auto";
  videoElement.playsInline = playbackPolicy.playsInline;
  videoElement.style.objectFit = playbackPolicy.objectFit;
  videoElement.setAttribute("autoplay", "");
  videoElement.setAttribute("crossorigin", "anonymous");
  videoElement.setAttribute("loop", "");
  videoElement.setAttribute("muted", "");
  videoElement.setAttribute("playsinline", "");
}

/**
 * @brief Apply the minimal background playback behavior expected by the demo
 *
 * @param videoElement - DOM video element that renders the background
 * @param playbackPolicy - Shared background playback policy
 */
export async function attemptBackgroundAutoplay(
  videoElement: HTMLVideoElement,
  playbackPolicy: BackgroundVideoPlaybackPolicy,
): Promise<void> {
  videoElement.muted = playbackPolicy.muted;
  videoElement.autoplay = playbackPolicy.autoplay;
  videoElement.loop = playbackPolicy.loop;
  videoElement.playsInline = playbackPolicy.playsInline;

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
 * @brief Load the shared HLS stream using native playback when available and
 * Shaka as the browser compatibility fallback
 *
 * @param videoElement - DOM video element that renders the background
 * @param backgroundVideo - Shared background video model
 *
 * @returns Active Shaka player when the fallback path is used
 */
export async function loadBackgroundVideo(
  videoElement: HTMLVideoElement,
  backgroundVideo: BackgroundVideoModel,
): Promise<ShakaPlayer | null> {
  const playbackSource: { url: string; mimeType?: string } =
    backgroundVideo.getPlaybackSource();
  const playbackPolicy: BackgroundVideoPlaybackPolicy =
    backgroundVideo.getPlaybackPolicy();
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
        void attemptBackgroundAutoplay(videoElement, playbackPolicy);
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
    await attemptBackgroundAutoplay(videoElement, playbackPolicy);
  } catch (error: unknown) {
    console.error("Failed to load the shared demo stream.", error);
  }

  return shakaPlayer;
}
