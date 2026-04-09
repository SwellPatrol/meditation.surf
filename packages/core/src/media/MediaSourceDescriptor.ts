/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaSourceKind } from "./MediaSourceKind";

/**
 * @brief Shared source metadata that logical media sessions can reference
 */
export type MediaSourceDescriptor = {
  sourceId: string;
  kind: MediaSourceKind;
  url: string;
  mimeType: string | null;
  posterUrl: string | null;
};
