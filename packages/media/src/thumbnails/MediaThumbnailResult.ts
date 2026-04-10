/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Runtime thumbnail payload that can be rendered by an app shell
 */
export type MediaThumbnailResult = {
  sourceId: string;
  imageUrl: string;
  width: number;
  height: number;
  frameTimeMs: number | null;
  extractedAt: number;
  wasApproximate: boolean;
};
