/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/** Currently active Lightning application instance. */
let appInstance: unknown | null = null;

/**
 * Register the active Lightning application.
 *
 * @param app - Root Lightning application instance or `null`.
 */
export function setAppInstance(app: unknown | null): void {
  appInstance = app;
}

/**
 * Retrieve the Lightning application previously registered.
 *
 * @returns Active Lightning application or `null`.
 */
export function getAppInstance(): unknown | null {
  return appInstance;
}

/** Clear the stored Lightning application reference. */
export function clearAppInstance(): void {
  appInstance = null as unknown | null;
}
