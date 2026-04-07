/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import type { CenteredIconOverlayModel } from "@meditation-surf/core";
import { BRAND_OVERLAY_ICON_URL } from "@meditation-surf/core/brand/web";

import { getStageCompensatedElementSize } from "../../app/layout/icon";

/**
 * @brief Type alias for the factory returned by Blits.Component
 */
type IconFactory = ReturnType<typeof Blits.Component>;

/**
 * @brief Reusable component that displays the app icon centered on the stage
 *
 * The shared overlay model owns the target on-screen size, while the Lightning
 * app compensates for stage scaling before rendering.
 *
 * @property {CenteredIconOverlayModel} overlayModel Shared centered icon model
 * @property {number} stageW The Lightning stage width in pixels
 * @property {number} stageH The Lightning stage height in pixels
 * @property {number} viewportW The browser viewport width in pixels
 * @property {number} viewportH The browser viewport height in pixels
 */
const Icon: IconFactory = Blits.Component("Icon", {
  // Stage coordinates stay fixed for centering, while viewport dimensions
  // drive the shared icon sizing policy to match web and mobile behavior.
  props: ["overlayModel", "stageW", "stageH", "viewportW", "viewportH"],

  computed: {
    /**
     * @brief Computes the rendered icon width in stage coordinates
     *
     * @returns {number} The icon width to render within the Lightning stage
     */
    iconWidth(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const overlayModel: CenteredIconOverlayModel = this
        .overlayModel as CenteredIconOverlayModel;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageH: number = this.stageH as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportW: number = this.viewportW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportH: number = this.viewportH as number;

      const layoutSize: { width: number; height: number } =
        overlayModel.getLayoutSize(viewportW, viewportH);

      return getStageCompensatedElementSize(layoutSize.width, {
        stageWidth: stageW,
        stageHeight: stageH,
        viewportWidth: viewportW,
        viewportHeight: viewportH,
      });
    },

    /**
     * @brief Computes the rendered icon height in stage coordinates
     *
     * @returns {number} The icon height to render within the Lightning stage
     */
    iconHeight(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const overlayModel: CenteredIconOverlayModel = this
        .overlayModel as CenteredIconOverlayModel;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageH: number = this.stageH as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportW: number = this.viewportW as number;

      // @ts-ignore `this` contains the reactive props provided at runtime
      const viewportH: number = this.viewportH as number;

      const layoutSize: { width: number; height: number } =
        overlayModel.getLayoutSize(viewportW, viewportH);

      return getStageCompensatedElementSize(layoutSize.height, {
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
      :w="$iconWidth"
      :h="$iconHeight"
      :x="$stageW / 2"
      :y="$stageH / 2"
      fit="contain"
      :mount="0.5"
    />`,
});

export default Icon;
