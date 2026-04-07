/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import { getBrandOverlayIconSize } from "@meditation-surf/core";
import { BRAND_OVERLAY_ICON_URL } from "@meditation-surf/core/brand/web";

// Type alias for the factory returned by Blits.Component
type IconFactory = ReturnType<typeof Blits.Component>;

/**
 * A reusable component that displays the app icon centered on the stage.
 * The icon is rendered at most one third the size of the smaller viewport
 * dimension to keep it unobtrusive while maintaining its aspect ratio.
 */
const Icon: IconFactory = Blits.Component("Icon", {
  // Stage dimensions passed from the parent component
  props: ["stageW", "stageH"],

  computed: {
    /**
     * Size the icon using the shared overlay policy while keeping the TV
     * renderer responsible for its own stage-centered placement.
     */
    iconSize(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;
      const stageH: number = this.stageH as number;
      return getBrandOverlayIconSize(stageW, stageH);
    },

    /**
     * Resolve the shared icon asset through Vite so the TV app renders the
     * same source image as the web surface.
     */
    iconSource(): string {
      return BRAND_OVERLAY_ICON_URL;
    },
  },

  // Render the icon centered at half mount
  template: `<Element
      :src="$iconSource"
      :w="$iconSize"
      :h="$iconSize"
      :x="$stageW / 2"
      :y="$stageH / 2"
      :mount="0.5"
    />`,
});

export default Icon;
