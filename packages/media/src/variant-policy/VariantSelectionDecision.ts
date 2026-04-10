/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VariantQualityTier } from "./VariantQualityTier";
import type { VariantRolePolicy } from "./VariantRolePolicy";
import type { VariantSelectionReason } from "./VariantSelectionReason";

/**
 * @brief Pure quality-intent decision emitted for one shared media role
 */
export type VariantSelectionDecision = {
  role: VariantRolePolicy;
  desiredQualityTier: VariantQualityTier;
  preferStartupLatency: boolean;
  preferImageQuality: boolean;
  preferPremiumPlayback: boolean;
  maxWidth: number | null;
  maxHeight: number | null;
  maxBandwidth: number | null;
  reasons: VariantSelectionReason[];
  notes: string[];
};
