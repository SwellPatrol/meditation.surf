/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Why one warmed preview session was removed from the active pool
 */
export type PreviewEvictionReason =
  | "over-budget"
  | "lower-priority"
  | "runtime-unsupported"
  | "background-priority"
  | "reuse-window-expired";
