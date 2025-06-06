/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

/** LightningJS application displaying a full-screen black view. */
const BlackApp = Blits.Application({
  template: `<Element :w="$stageW" :h="$stageH" color="#000000" />`,
});

/**
 * Launch the LightningJS application sized to the current viewport.
 */
export function launchBlackApp(): void {
  Blits.Launch(BlackApp, "app", {
    w: window.innerWidth,
    h: window.innerHeight,
  });
}
