/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Create a function that throttles calls to the provided callback.
 * The callback executes immediately on the first call and then at most once
 * every `waitMs` milliseconds while it continues to be invoked. The trailing
 * execution uses the arguments from the last invocation that occurred during
 * the cooldown period.
 *
 * @param callback - Function to throttle
 * @param waitMs - Minimum milliseconds between executions
 * @returns A throttled version of the callback
 */
export function throttle<Args extends unknown[]>(
  callback: (...errArgs: Args) => void,
  waitMs: number,
): (...errArgs: Args) => void {
  // Timestamp in milliseconds when the callback last executed
  let lastExecution: number | undefined;
  // Timer ID for a trailing execution
  let timer: number | undefined;
  // Arguments from the most recent call
  let lastArgs: Args;

  return (...errArgs: Args): void => {
    const now: number = Date.now();
    lastArgs = errArgs;

    if (lastExecution === undefined || now - lastExecution >= waitMs) {
      // If enough time has passed, execute immediately
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      callback(...lastArgs);
      lastExecution = now;
      return;
    }

    // Schedule a trailing execution if one isn't already queued
    if (timer === undefined) {
      const remaining: number = waitMs - (now - lastExecution);
      timer = window.setTimeout((): void => {
        callback(...lastArgs);
        lastExecution = Date.now();
        timer = undefined;
      }, remaining);
    }
  };
}
