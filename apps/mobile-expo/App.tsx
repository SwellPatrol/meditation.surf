/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { Text, View } from "react-native";

const containerStyle: ViewStyle = {
  alignItems: "center",
  backgroundColor: "#000000",
  flex: 1,
  justifyContent: "center",
};

const titleStyle: TextStyle = {
  color: "#ffffff",
  fontSize: 24,
};

export default function App(): JSX.Element {
  return (
    <View style={containerStyle}>
      <Text style={titleStyle}>meditation.surf</Text>
    </View>
  );
}
