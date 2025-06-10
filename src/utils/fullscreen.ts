/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/** SVG icon for entering fullscreen mode. */
const FULLSCREEN_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5V2H2v7h2zm15-7h-5v2h5v5h2V2h-2zM19 15v5h-5v2h7v-7h-2zm-10 5H4v-5H2v7h7v-2z"/></svg>';

/** SVG icon for exiting fullscreen mode. */
const EXIT_FULLSCREEN_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h5v5h-2V6h-3V4zM9 4v2H6v3H4V4h5zm10 10h2v5h-5v-2h3v-3zm-12 3h3v2H4v-5h2v3z"/></svg>';

/**
 * Create and attach a fullscreen toggle button. The button remains visible and
 * toggles fullscreen mode when clicked.
 */
export function setupFullscreenButton(): void {
  const button: HTMLButtonElement = document.createElement("button");
  button.id = "fullscreen-button";
  button.innerHTML = FULLSCREEN_ICON;
  button.ariaLabel = "Enter full screen";

  /** Show the button without fading out. */
  const showButton = (): void => {
    button.classList.remove("fade-out");
  };

  /** Toggle fullscreen mode using the browser's fullscreen API. */
  const toggleFullscreen = (): void => {
    if (document.fullscreenElement !== null) {
      document.exitFullscreen().catch((err: unknown): void => {
        console.error("Failed to exit full screen", err);
      });
    } else {
      document.documentElement
        .requestFullscreen()
        .catch((err: unknown): void => {
          console.error("Failed to enter full screen", err);
        });
    }
  };

  button.addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", (): void => {
    if (document.fullscreenElement !== null) {
      button.innerHTML = EXIT_FULLSCREEN_ICON;
      button.ariaLabel = "Exit full screen";
    } else {
      button.innerHTML = FULLSCREEN_ICON;
      button.ariaLabel = "Enter full screen";
    }
    showButton();
  });

  document.addEventListener("mousemove", showButton);
  document.addEventListener("touchstart", showButton);

  document.body.appendChild(button);
  showButton();
}
