/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";

/**
 * Web-only shim that renders nothing. The native implementation is provided
 * in `BundledWebView.native.tsx`.
 */
export default function BundledWebView(): JSX.Element | null {
  return null;
}
