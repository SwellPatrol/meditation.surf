/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import "./styles.css";

import { DEMO_SURF_VIDEO } from "@meditation-surf/core";

import swellPatrolIconSource from "./icon-1500x1500.png";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

const appRootElement: HTMLDivElement | null = document.querySelector("#app");

if (appRootElement === null) {
  throw new Error("Expected the #app root element to exist.");
}

const backgroundVideoElement: HTMLVideoElement =
  document.createElement("video");
backgroundVideoElement.className = "background-video";
backgroundVideoElement.autoplay = true;
backgroundVideoElement.controls = false;
backgroundVideoElement.crossOrigin = "anonymous";
backgroundVideoElement.loop = true;
backgroundVideoElement.muted = true;
backgroundVideoElement.preload = "auto";
backgroundVideoElement.playsInline = true;
backgroundVideoElement.setAttribute("autoplay", "");
backgroundVideoElement.setAttribute("crossorigin", "anonymous");
backgroundVideoElement.setAttribute("loop", "");
backgroundVideoElement.setAttribute("muted", "");
backgroundVideoElement.setAttribute("playsinline", "");

const overlayElement: HTMLDivElement = document.createElement("div");
overlayElement.className = "overlay";
overlayElement.setAttribute("aria-hidden", "true");

const overlayIconElement: HTMLImageElement = document.createElement("img");
overlayIconElement.className = "overlay-icon";
overlayIconElement.alt = "";
overlayIconElement.src = swellPatrolIconSource;

overlayElement.appendChild(overlayIconElement);
appRootElement.append(backgroundVideoElement, overlayElement);

let activeShakaPlayer: ShakaPlayer | null = null;

/**
 * Apply the minimal background playback behavior expected by the demo.
 */
const attemptAutoplay: () => Promise<void> = async (): Promise<void> => {
  backgroundVideoElement.muted = true;
  backgroundVideoElement.autoplay = true;
  backgroundVideoElement.loop = true;
  backgroundVideoElement.playsInline = true;

  try {
    await backgroundVideoElement.play();
  } catch (error: unknown) {
    console.warn(
      "Background video autoplay was blocked by the browser.",
      error,
    );
  }
};

/**
 * Load the shared demo HLS stream using native playback when available and
 * Shaka as the browser compatibility fallback.
 */
const loadDemoVideoSource: () => Promise<void> = async (): Promise<void> => {
  const playbackSourceUrl: string = DEMO_SURF_VIDEO.playbackSource.url;
  const playbackMimeType: string =
    DEMO_SURF_VIDEO.playbackSource.mimeType ?? "application/x-mpegURL";
  const canUseNativeHlsPlayback: boolean =
    backgroundVideoElement.canPlayType(playbackMimeType) !== "";

  if (canUseNativeHlsPlayback) {
    backgroundVideoElement.src = playbackSourceUrl;
    backgroundVideoElement.addEventListener(
      "loadedmetadata",
      (): void => {
        void attemptAutoplay();
      },
      { once: true },
    );
    backgroundVideoElement.load();

    return;
  }

  // Load Shaka only when native HLS playback is unavailable so the initial
  // browser demo stays as small as possible.
  const shakaModule: { default: ShakaModule } =
    await import("shaka-player/dist/shaka-player.compiled.js");
  const shaka: ShakaModule = shakaModule.default;

  shaka.polyfill.installAll();
  if (!shaka.Player.isBrowserSupported()) {
    console.error("Shaka Player is not supported in this browser.");
    return;
  }

  const shakaPlayer: ShakaPlayer = new shaka.Player(backgroundVideoElement);
  activeShakaPlayer = shakaPlayer;

  try {
    await shakaPlayer.load(playbackSourceUrl);
    await attemptAutoplay();
  } catch (error: unknown) {
    console.error("Failed to load the shared demo stream.", error);
  }
};

window.addEventListener("beforeunload", (): void => {
  if (activeShakaPlayer !== null) {
    void activeShakaPlayer.destroy();
  }
});

void loadDemoVideoSource();
