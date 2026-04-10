/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VariantQualityTier } from "./VariantQualityTier";
import type { VariantSelectionDecision } from "./VariantSelectionDecision";
import type { VariantSelectionReason } from "./VariantSelectionReason";
import type { VariantSelectionRequest } from "./VariantSelectionRequest";

/**
 * @brief Pure role-based variant policy used by shared planning and execution
 */
export class VariantPolicy {
  /**
   * @brief Resolve one quality-intent decision for the supplied role
   *
   * @param request - Immutable variant selection request
   *
   * @returns Deterministic quality-intent decision
   */
  public static select(
    request: VariantSelectionRequest,
  ): VariantSelectionDecision {
    const reasons: VariantSelectionReason[] = [];
    const notes: string[] = [
      `Variant policy evaluated ${request.role} for the current media request.`,
    ];
    let desiredQualityTier: VariantQualityTier = "medium";
    let preferStartupLatency: boolean = false;
    let preferImageQuality: boolean = false;
    let preferPremiumPlayback: boolean = false;

    switch (request.role) {
      case "thumbnail-extract":
        preferImageQuality = true;
        reasons.push("role-prefers-image-quality");
        desiredQualityTier =
          request.capabilitySnapshot?.decision.premiumPlaybackViable === true
            ? "premium-attempt"
            : "high";
        notes.push(
          "Thumbnail extraction prefers image fidelity so stills stay sharp when decoded off-screen.",
        );
        break;
      case "thumbnail-preview":
        preferStartupLatency = true;
        reasons.push("role-prefers-startup-latency");
        desiredQualityTier =
          request.maxWidth !== null && request.maxWidth <= 320
            ? "low"
            : "medium";
        notes.push(
          "Thumbnail preview favors fast card paint over richer decode cost.",
        );
        break;
      case "preview-warm":
        preferStartupLatency = true;
        reasons.push("role-prefers-startup-latency");
        desiredQualityTier =
          request.capabilitySnapshot?.decision.supportLevel === "supported"
            ? "medium"
            : "low";
        notes.push(
          "Warm preview sessions stay intentionally cheaper so the focused card can light up quickly.",
        );
        break;
      case "preview-active":
        desiredQualityTier = "medium";
        reasons.push("conservative-default");
        notes.push(
          "Active preview remains on a medium tier to preserve current browse-card behavior.",
        );
        break;
      case "background-warm":
        desiredQualityTier =
          request.capabilitySnapshot?.decision.supportLevel === "supported"
            ? "high"
            : "medium";
        reasons.push("conservative-default");
        notes.push(
          "Background warm reserves headroom for better quality without assuming premium playback yet.",
        );
        break;
      case "background-playback":
        preferPremiumPlayback = true;
        reasons.push("role-prefers-premium-playback");
        desiredQualityTier =
          request.capabilitySnapshot?.decision.premiumPlaybackViable === true
            ? "premium-attempt"
            : request.capabilitySnapshot?.decision.supportLevel === "supported"
              ? "high"
              : "medium";
        notes.push(
          "Committed background playback prefers the richest safe tier reported by the runtime.",
        );
        break;
    }

    if (request.capabilitySnapshot?.decision.premiumPlaybackViable === true) {
      reasons.push("premium-tier-viable");
    } else if (preferPremiumPlayback || request.role === "thumbnail-extract") {
      reasons.push("premium-tier-unavailable");
    }

    if (
      request.capabilitySnapshot !== null &&
      request.capabilitySnapshot.decision.supportLevel !== "supported"
    ) {
      reasons.push("runtime-limited");
      notes.push(
        "The current capability snapshot is conservative, so the chosen tier avoids overcommitting to a richer variant.",
      );
    }

    if (request.maxWidth !== null || request.maxHeight !== null) {
      reasons.push("dimension-limited");
    }

    if (request.maxBandwidth !== null) {
      reasons.push("bandwidth-limited");
    }

    return {
      role: request.role,
      desiredQualityTier,
      preferStartupLatency,
      preferImageQuality,
      preferPremiumPlayback,
      maxWidth: request.maxWidth,
      maxHeight: request.maxHeight,
      maxBandwidth: request.maxBandwidth,
      reasons,
      notes,
    };
  }
}
