/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VfsNode } from "./VfsNode";

/**
 * @brief Immutable VFS snapshot exposed for debug and inspection
 */
export type VfsSnapshot = {
  nodes: VfsNode[];
  generatedAt: number;
};
