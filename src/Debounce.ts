/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Helper class for running a function after a period of inactivity.
 * Useful for debouncing frequent events like resize or scroll.
 */
export class Debounce {
  private timer: number | undefined;
  private readonly delayMs: number;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
    this.timer = undefined;
  }

  /** Schedule the callback to run after the configured delay. */
  run(callback: () => void): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(callback, this.delayMs);
  }
}
