/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/** Persisted brightness level values. */
export type BrightnessLevel = "on" | "dim" | "off";

/** Key used to persist brightness state in local storage. */
const STORAGE_KEY: string = "videoBrightness";

/**
 * Retrieve the persisted brightness level from local storage.
 *
 * @returns Brightness level, defaults to "on".
 */
export function getBrightnessLevel(): BrightnessLevel {
  const value: string | null = window.localStorage.getItem(STORAGE_KEY);
  if (value === "dim" || value === "off") {
    return value as BrightnessLevel;
  }
  return "on";
}

/**
 * Persist the brightness level in local storage.
 *
 * @param level - The desired brightness level.
 */
export function setBrightnessLevel(level: BrightnessLevel): void {
  window.localStorage.setItem(STORAGE_KEY, level);
}
