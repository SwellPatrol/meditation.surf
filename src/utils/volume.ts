/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import videoPlayerState from "../app/VideoPlayerState";

/** Storage key for persisting the muted state. */
const STORAGE_KEY: string = "audio-muted";

/** SVG icon for sound on. */
const VOLUME_ON_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';

/** SVG icon for muted sound. */
const VOLUME_OFF_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

/**
 * Create and attach a volume toggle button. The button remains visible and the
 * muted state is persisted in local storage.
 */
export function setupVolumeButton(): void {
  const button: HTMLButtonElement = document.createElement("button");
  button.id = "volume-button";

  let muted: boolean = true;
  const saved: string | null = window.localStorage.getItem(STORAGE_KEY);
  if (saved !== null) {
    muted = saved === "true";
  }

  /** Apply the current mute state to the video element and SDK. */
  const applyMuted = (): void => {
    const videoEl: HTMLVideoElement | null = document.querySelector("video");
    if (videoEl !== null) {
      videoEl.muted = muted;
      if (muted) {
        videoEl.setAttribute("muted", "");
      } else {
        videoEl.removeAttribute("muted");
      }
    }
    videoPlayerState.videoPlayer.mute(muted);
  };

  /** Update the button icon and label. */
  const updateIcon = (): void => {
    if (muted) {
      button.innerHTML = VOLUME_OFF_ICON;
      button.ariaLabel = "Unmute";
    } else {
      button.innerHTML = VOLUME_ON_ICON;
      button.ariaLabel = "Mute";
    }
  };

  /** Resize the button to one quarter of the viewport's smallest dimension. */
  const updateSize = (): void => {
    const size: number = Math.min(window.innerWidth, window.innerHeight) / 4;
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
  };

  /** Show the button without fading out. */
  const showButton = (): void => {
    button.classList.remove("fade-out");
  };

  /** Toggle between muted and unmuted states. */
  const toggleMuted = (): void => {
    muted = !muted;
    videoPlayerState.saveMutedState(muted);
    updateIcon();
    applyMuted();
    showButton();
  };

  button.addEventListener("click", toggleMuted);
  document.addEventListener("touchstart", showButton);
  document.addEventListener("click", (event: MouseEvent): void => {
    if (event.target instanceof HTMLVideoElement) {
      showButton();
    }
  });

  window.addEventListener("resize", updateSize);

  document.body.appendChild(button);
  updateSize();
  updateIcon();
  applyMuted();
  showButton();
}
