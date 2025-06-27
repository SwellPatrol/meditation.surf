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

export type ShakaVideoProps = NativeProps;

export default function ShakaVideo(props: ShakaVideoProps): JSX.Element | null {
  const Component: ComponentType<ShakaVideoProps> =
    Platform.OS === "web" ? Web : Native;
  return <Component {...props} />;
}
