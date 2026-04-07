/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import "./styles.css";

import {
  DemoExperienceFactory,
  type MeditationExperience,
} from "@meditation-surf/core";

import type { WebAppShell } from "./appShell";
import { applyWebAppShellLayout, createWebAppShell } from "./appShell";
import {
  configureBackgroundVideoElement,
  loadBackgroundVideo,
} from "./demoBackgroundVideo";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

const experience: MeditationExperience = DemoExperienceFactory.create();
const webAppShell: WebAppShell = createWebAppShell(experience);

configureBackgroundVideoElement(
  webAppShell.backgroundVideoElement,
  experience.backgroundVideo,
);

let activeShakaPlayer: ShakaPlayer | null = null;

/**
 * @brief Start background playback using the shared demo scene model
 */
async function startPlayback(): Promise<void> {
  activeShakaPlayer = await loadBackgroundVideo(
    webAppShell.backgroundVideoElement,
    experience.backgroundVideo,
  );
}

window.addEventListener("beforeunload", (): void => {
  if (activeShakaPlayer !== null) {
    void activeShakaPlayer.destroy();
  }
});
window.addEventListener("resize", (): void => {
  applyWebAppShellLayout(webAppShell, experience);
});

applyWebAppShellLayout(webAppShell, experience);
void startPlayback();
