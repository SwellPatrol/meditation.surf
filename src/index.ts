/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchApp } from "./app/launchApp";
import { setupVolumeControl } from "./volumeControl";

// Application entry point
launchApp();
setupVolumeControl();
