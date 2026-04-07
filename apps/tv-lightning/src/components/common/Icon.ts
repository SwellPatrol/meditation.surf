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

import { getStageCompensatedIconSize } from "../../app/layout/icon";

/**
 * @brief Type alias for the factory returned by Blits.Component
 */
type IconFactory = ReturnType<typeof Blits.Component>;

/**
 * @brief Reusable component that displays the app icon centered on the stage
 *
 * The icon is rendered at most one third the size of the smaller viewport
 * dimension to keep it unobtrusive while maintaining its aspect ratio.
 *
 * @property {number} stageW The Lightning stage width in pixels
 * @property {number} stageH The Lightning stage height in pixels
 * @property {number} viewportW The browser viewport width in pixels
 * @property {number} viewportH The browser viewport height in pixels
 */
const Icon: IconFactory = Blits.Component("Icon", {
  // Stage coordinates stay fixed for centering, while viewport dimensions
  // drive the shared icon sizing policy to match web and mobile behavior.
  props: ["stageW", "stageH", "viewportW", "viewportH"],

  computed: {
    /**
     * @brief Computes the requested icon size from the shared overlay policy
     *
     * Keeps the TV renderer responsible for its own stage-centered placement.
     *
     * @returns {number} The target icon size in viewport pixels
     */
    requestedIconSize(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportW: number = this.viewportW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportH: number = this.viewportH as number;
      return getBrandOverlayIconSize(viewportW, viewportH);
    },

    /**
     * @brief Computes the rendered icon size in stage coordinates
     *
     * The Lightning stage is rendered at a fixed TV resolution and then scaled
     * into the browser viewport. Compensate for that stage scale so the final
     * on-screen icon size matches the shared viewport-based size target.
     *
     * @returns {number} The icon size to render within the Lightning stage
     */
    iconSize(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageH: number = this.stageH as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportW: number = this.viewportW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportH: number = this.viewportH as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const requestedIconSize: number = this.requestedIconSize as number;

      return getStageCompensatedIconSize(requestedIconSize, {
        stageWidth: stageW,
        stageHeight: stageH,
        viewportWidth: viewportW,
        viewportHeight: viewportH,
      });
    },

    /**
     * @brief Resolves the shared icon asset URL for the TV app
     *
     * Ensures the TV app renders the same source image as the web surface.
     *
     * @returns {string} The resolved icon asset URL
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
      fit="contain"
      :mount="0.5"
    />`,
});

export default Icon;
