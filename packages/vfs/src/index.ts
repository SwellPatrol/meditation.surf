/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Public entrypoint for the virtual filesystem workspace package
 *
 * The package starts by re-exporting the upstream WebTorrent client so the
 * monorepo can adopt the dependency through a single internal workspace
 * package while the higher-level VFS API takes shape.
 */
export { default as WebTorrent } from "webtorrent";
