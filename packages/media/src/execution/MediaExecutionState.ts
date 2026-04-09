/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Runtime execution phases tracked for one planned media session
 */
export type MediaExecutionState =
  | "inactive"
  | "warming-metadata"
  | "warming-first-frame"
  | "ready-first-frame"
  | "preview-active"
  | "background-active"
  | "disposed"
  | "failed"
  | "unsupported";
