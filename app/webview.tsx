/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import BundledWebView from "@/components/BundledWebView";

export default function WebviewScreen(): JSX.Element {
  return (
    <View style={styles.container as ViewStyle}>
      <BundledWebView />
    </View>
  );
}

interface Styles {
  readonly container: ViewStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  container: {
    flex: 1,
  },
});
