/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CapabilityDecision } from "./CapabilityDecision";
import type { CapabilityProbeResult } from "./CapabilityProbeResult";
import type { MediaRoleCapabilityRequest } from "./MediaRoleCapabilityRequest";

/**
 * @brief Inspectable cached capability snapshot for one shared media role
 */
export type MediaRoleCapabilitySnapshot = {
  cacheKey: string;
  request: MediaRoleCapabilityRequest;
  probeResult: CapabilityProbeResult;
  decision: CapabilityDecision;
};
