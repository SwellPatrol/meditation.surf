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

import { WebApp } from "./WebApp";

const experience: MeditationExperience = DemoExperienceFactory.create();
const app: WebApp = new WebApp(experience);

void app.start();
