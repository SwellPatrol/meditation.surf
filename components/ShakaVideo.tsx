/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { ComponentType, JSX } from "react";
import { Platform } from "react-native";

import type { ShakaVideoProps as NativeProps } from "./ShakaVideo.native";
import Native from "./ShakaVideo.native";
import Web from "./ShakaVideo.web";

// Re-export the property interface from the platform-specific module so that the
// consumer of this component does not need to worry about which underlying
// implementation is chosen at runtime.
export type ShakaVideoProps = NativeProps;

/**
 * Cross-platform video player component that selects the appropriate
 * implementation based on the current platform at runtime.
 */
export default function ShakaVideo(props: ShakaVideoProps): JSX.Element | null {
  // Determine which implementation to use. The web version relies on Shaka
  // Player, while the native version embeds a WebView that runs Shaka Player.
  const Implementation: ComponentType<ShakaVideoProps> =
    Platform.OS === "web" ? Web : Native;

  // Delegate the actual rendering work to the selected implementation.
  return <Implementation {...props} />;
}
