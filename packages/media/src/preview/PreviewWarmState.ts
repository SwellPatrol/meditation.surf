/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Preview-specific warmth states used by the shared preview scheduler
 */
export type PreviewWarmState =
  | "cold"
  | "warming"
  | "ready-first-frame"
  | "preview-active"
  | "cooling-down"
  | "evicted";
