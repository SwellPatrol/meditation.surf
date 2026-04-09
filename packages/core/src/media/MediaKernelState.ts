/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AppMediaCapabilities } from "./AppMediaCapabilities";
import type { MediaIntent } from "./MediaIntent";
import type { MediaPlan } from "./MediaPlan";
import type { MediaSessionSnapshot } from "./MediaSessionSnapshot";

/**
 * @brief Immutable shared snapshot published by the media kernel controller
 */
export type MediaKernelState = {
  activeItemId: string | null;
  appCapabilities: AppMediaCapabilities[];
  currentIntent: MediaIntent | null;
  focusedItemId: string | null;
  plan: MediaPlan;
  selectedItemId: string | null;
  sessions: MediaSessionSnapshot[];
};
