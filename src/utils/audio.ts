/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/** Key used to persist the muted state in local storage. */
const STORAGE_KEY: string = "audioMuted";

/**
 * Retrieve the persisted muted state from local storage.
 *
 * @returns True if audio should start muted.
 */
export function getAudioMuted(): boolean {
  const value: string | null = window.localStorage.getItem(STORAGE_KEY);
  if (value === null) {
    return true;
  }
  return value === "true";
}

/**
 * Persist the muted state in local storage.
 *
 * @param muted - The current muted state.
 */
export function setAudioMuted(muted: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, String(muted));
}
