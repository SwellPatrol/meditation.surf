/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Environment-agnostic timeout handle used by the shared overlay timer
 */
type IdleTimerHandle = ReturnType<typeof globalThis.setTimeout>;

/**
 * @brief Own the restartable idle timeout used by overlay interaction state
 *
 * The shared overlay controller depends on semantic time, not on any platform
 * event loop APIs beyond the standard JavaScript timer contract. Keeping the
 * timer in its own class makes the future removal of the visual fade effect
 * trivial while preserving the shared interaction plumbing.
 */
export class IdleTimer {
  private timeoutHandle: IdleTimerHandle | null;

  /**
   * @brief Create an idle timer with no active timeout
   */
  public constructor() {
    this.timeoutHandle = null;
  }

  /**
   * @brief Start or restart the idle timeout
   *
   * @param durationMs - Time to wait before the callback fires
   * @param onTimeout - Callback invoked when the timer expires
   */
  public restart(durationMs: number, onTimeout: () => void): void {
    this.clear();
    this.timeoutHandle = globalThis.setTimeout((): void => {
      this.timeoutHandle = null;
      onTimeout();
    }, durationMs);
  }

  /**
   * @brief Cancel any active timeout
   */
  public clear(): void {
    if (this.timeoutHandle !== null) {
      globalThis.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}
