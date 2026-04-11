/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Website-root path for the shared brand icon
 *
 * The binary file intentionally lives in `public/` so web entry points,
 * manifests, and metadata can continue to reference a stable root-relative
 * path. This package simply centralizes that path for app code.
 */
export const BRAND_ICON_URL: string = "/images/icon-1500x1500.png";
