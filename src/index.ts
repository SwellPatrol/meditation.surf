/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import App from "./App";

Blits.Launch(App, "app", {
  w: window.innerWidth,
  h: window.innerHeight,
  debugLevel: 1,
  fonts: [
    {
      family: "lato",
      type: "msdf",
      file: "fonts/Lato-Regular.ttf",
    },
    {
      family: "raleway",
      type: "msdf",
      file: "fonts/Raleway-ExtraBold.ttf",
    },
    {
      family: "opensans",
      type: "web",
      file: "fonts/OpenSans-Medium.ttf",
    },
  ],
});
