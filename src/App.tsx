/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React from "react";

/**
 * Root React component for the application. Displays a welcome message and
 * ensures the layout matches the application's minimalist design.
 */
export function App(): React.ReactElement {
  return (
    <div
      style={{
        color: "white",
        textAlign: "center",
        paddingTop: "20px",
      }}
    >
      <h1>Welcome to meditation.surf</h1>
    </div>
  );
}
