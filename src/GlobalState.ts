/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Application-wide state preserved across Lightning app launches.
 */
export interface GlobalState {
  /** Width of the application icon in pixels */
  iconWidth: number;
  /** Height of the application icon in pixels */
  iconHeight: number;
}

/**
 * Singleton instance holding global state.
 */
export const globalState: GlobalState = {
  iconWidth: 0,
  iconHeight: 0,
};

/**
 * Load icon dimensions from the application icon and store them in globalState.
 */
export function loadIconDimensions(): void {
  const icon: HTMLImageElement = new window.Image();
  icon.onload = (): void => {
    globalState.iconWidth = icon.width;
    globalState.iconHeight = icon.height;
  };
  icon.src = "assets/icon.png";
}
