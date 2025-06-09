/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import videoPlayerState from "./app/VideoPlayerState";

/** Local storage key storing whether audio is muted. */
const STORAGE_KEY: string = "audioMuted";

/** Duration before the icon fades out in milliseconds. */
const HIDE_DELAY_MS: number = 2000;

/** Duration of the fade-in transition in milliseconds. */
const FADE_IN_MS: number = 100;

/** Duration of the fade-out transition in milliseconds. */
const FADE_OUT_MS: number = 500;

/**
 * Retrieve the path to the correct volume icon.
 *
 * @param muted - Whether the audio is muted.
 * @returns Path to the SVG asset.
 */
function getIconPath(muted: boolean): string {
  return muted ? "assets/volume-off.svg" : "assets/volume-on.svg";
}

/**
 * Create the HTML image element used as the volume icon.
 *
 * @param muted - Initial mute state.
 * @returns Created image element.
 */
function createIcon(muted: boolean): HTMLImageElement {
  const img: HTMLImageElement = document.createElement("img");
  img.id = "volume-icon";
  img.src = getIconPath(muted);
  img.style.position = "absolute";
  img.style.bottom = "0";
  img.style.right = "0";
  img.style.width = "25%";
  img.style.height = "25%";
  img.style.objectFit = "contain";
  img.style.opacity = "0";
  img.style.pointerEvents = "auto";
  img.style.transition = `opacity ${FADE_IN_MS}ms linear`;
  img.style.zIndex = "10";
  return img;
}

/**
 * Apply the mute state to the video player and persist the value.
 *
 * @param muted - Whether the player should be muted.
 */
function applyMute(muted: boolean): void {
  videoPlayerState.setMuted(muted);
  window.localStorage.setItem(STORAGE_KEY, String(muted));
}

/**
 * Setup the DOM based volume control overlay.
 */
export function setupVolumeControl(): void {
  const stored: string | null = window.localStorage.getItem(STORAGE_KEY);
  const muted: boolean = stored === null ? true : stored === "true";
  applyMute(muted);

  const mount: HTMLElement = document.getElementById("app") as HTMLElement;
  const icon: HTMLImageElement = createIcon(muted);
  mount.appendChild(icon);

  let hideTimer: number | null = null;

  const showIcon: () => void = (): void => {
    icon.style.transition = `opacity ${FADE_IN_MS}ms linear`;
    icon.style.opacity = "1";
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }
    hideTimer = window.setTimeout((): void => {
      icon.style.transition = `opacity ${FADE_OUT_MS}ms linear`;
      icon.style.opacity = "0";
    }, HIDE_DELAY_MS);
  };

  const toggleMute: () => void = (): void => {
    const newMuted: boolean = !videoPlayerState.isMuted();
    icon.src = getIconPath(newMuted);
    applyMute(newMuted);
    showIcon();
  };

  icon.addEventListener("click", toggleMute);
  document.addEventListener("touchstart", showIcon);

  const videoEl: HTMLVideoElement | undefined = (
    videoPlayerState.videoPlayer as any
  )._videoEl;
  if (videoEl !== undefined) {
    videoEl.addEventListener("mousedown", showIcon);
  }

  showIcon();
}
