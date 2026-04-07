/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import "./styles.css";

import type { WebAppShell } from "./appShell";
import { createWebAppShell } from "./appShell";
import { applyWebBrandOverlayLayout } from "./brandOverlay";
import {
  configureDemoBackgroundVideoElement,
  loadDemoBackgroundVideo,
} from "./demoBackgroundVideo";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

const webAppShell: WebAppShell = createWebAppShell();

configureDemoBackgroundVideoElement(webAppShell.backgroundVideoElement);

let activeShakaPlayer: ShakaPlayer | null = null;

/**
 * Keep the web entry point focused on startup orchestration.
 */
function applyLayout(): void {
  applyWebBrandOverlayLayout(webAppShell.overlayIconElement);
}

/**
 * Start background playback using the shared demo policy and source config.
 */
async function startPlayback(): Promise<void> {
  activeShakaPlayer = await loadDemoBackgroundVideo(
    webAppShell.backgroundVideoElement,
  );
}

window.addEventListener("beforeunload", (): void => {
  if (activeShakaPlayer !== null) {
    void activeShakaPlayer.destroy();
  }
});
window.addEventListener("resize", applyLayout);

applyLayout();
void startPlayback();
