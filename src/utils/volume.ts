/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import videoPlayerState from "../app/VideoPlayerState";

/**
 * Time in milliseconds before the volume button fades out after user
 * interaction.
 */
const VOLUME_TIMEOUT_MS: number = 3000;

/** SVG icon for unmuted audio. */
const VOLUME_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.73 2.5-2.25 2.5-4.03z"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';

/** SVG icon for muted audio. */
const MUTE_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63z"/><path d="M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z"/><path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

/**
 * Attach a volume toggle button to the page. The button fades out after
 * a short delay and reappears on user interaction.
 */
export function setupVolumeButton(): void {
  const button: HTMLButtonElement = document.createElement("button");
  button.id = "volume-button";

  let audioEnabled: boolean =
    window.localStorage.getItem("audio-enabled") === "true";

  /** Apply the current audio state to the video element and button. */
  const applyAudioState = (): void => {
    const videoEl: HTMLVideoElement | null = document.querySelector("video");
    if (videoEl !== null) {
      videoEl.muted = !audioEnabled;
    }
    videoPlayerState.videoPlayer.mute(!audioEnabled);
    button.innerHTML = audioEnabled ? VOLUME_ICON : MUTE_ICON;
    button.ariaLabel = audioEnabled ? "Mute audio" : "Play audio";
  };

  applyAudioState();

  let fadeTimer: number | undefined;

  /** Show the button and start a new fade-out timer. */
  const showButton = (): void => {
    button.classList.remove("fade-out");
    button.style.transition = "opacity 0.2s ease-in";
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout((): void => {
      button.style.transition = "opacity 1s ease-out";
      button.classList.add("fade-out");
    }, VOLUME_TIMEOUT_MS);
  };

  /** Toggle the audio state and persist the new value. */
  const toggleAudio = (): void => {
    audioEnabled = !audioEnabled;
    window.localStorage.setItem("audio-enabled", String(audioEnabled));
    applyAudioState();
    showButton();
  };

  button.addEventListener("click", toggleAudio);

  const attachVideoListener = (): void => {
    const videoEl: HTMLVideoElement | null = document.querySelector("video");
    if (videoEl !== null) {
      videoEl.addEventListener("click", showButton);
    } else {
      window.setTimeout(attachVideoListener, 500);
    }
  };

  document.addEventListener("touchstart", showButton);
  attachVideoListener();

  document.body.appendChild(button);
  showButton();
}
