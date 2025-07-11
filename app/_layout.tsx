/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Stack } from "expo-router";
import type { JSX } from "react";
import React from "react";

export default function RootLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
