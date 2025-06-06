/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import { appState } from "@lightningjs/blits/plugins";

import { startApp } from "./launcher";

/*
 * Interface describing the global application state persisted across
 * Lightning relaunches.
 */
interface GlobalState {
  iconSrc: string;
}

// Register the global application state plugin before launching the app
Blits.Plugin(appState, {
  iconSrc: "assets/icon.png",
} as GlobalState);

// Launch the Lightning application once the script loads
startApp();
