/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PreviewWarmState } from "./PreviewWarmState";

/**
 * @brief Mapping from one logical preview session to one runtime slot
 */
export type PreviewSessionAssignment = {
  sessionId: string;
  itemId: string;
  slotId: string;
  warmState: PreviewWarmState;
  isActive: boolean;
};
