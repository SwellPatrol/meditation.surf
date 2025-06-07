/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Create a fullscreen background video element that autoplays and loops.
 *
 * The video is placed behind all other page content so it will not interfere
 * with user interactions.
 *
 * @param url - Source URL of the video file to play
 */
export function createBackgroundVideo(url: string): void {
  // Create the video element lazily in case it is never used
  const video: HTMLVideoElement = document.createElement("video");

  // Allow the video to start playing without explicit user interaction
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  // Preload the video so playback begins immediately
  video.preload = "auto";

  // Some browsers require the crossorigin attribute for remote sources
  video.setAttribute("crossorigin", "anonymous");

  // Ensure the video fills the viewport and does not capture pointer events
  video.id = "video-bg";
  video.style.position = "fixed";
  video.style.top = "0";
  video.style.left = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.zIndex = "-1";
  video.style.pointerEvents = "none";

  // Finally, set the source and add the element to the page
  video.src = url;
  document.body.appendChild(video);
}
