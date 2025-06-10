/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

/**
 * Application entry point. Creates the React root and renders the application
 * sized to the current viewport.
 */
function main(): void {
  const container: HTMLElement | null = document.getElementById("app");
  if (container === null) {
    throw new Error("App container element not found");
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

main();
