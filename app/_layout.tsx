/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Stack } from "expo-router";
import React from "react";
import { LogBox } from "react-native";

// React Native warns about the deprecated "shadow*" style props when running
// on the web. This project does not use these props directly, so suppress the
// warning to keep the console output clean.
LogBox.ignoreLogs([/shadow\* style props are deprecated/]);

export default function RootLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
