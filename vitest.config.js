/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node is used so the tests can provide their own window and document objects
    environment: "node",
  },
});
