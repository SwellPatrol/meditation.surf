/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

/**
 * @brief Type alias for the factory returned by Blits.Component
 */
type OverlayTitleFactory = ReturnType<typeof Blits.Component>;

/**
 * @brief Reusable component that renders the current item title on the TV stage
 *
 * The title uses a simple duplicate-text treatment so the overlay stays
 * readable above motion video without introducing extra shared typography
 * abstractions yet.
 *
 * @property {number} alpha The current overlay alpha owned by the parent state
 * @property {number} fadeDurationMs Fade duration shared with the overlay controller
 * @property {number} stageW The Lightning stage width in pixels
 * @property {number} stageH The Lightning stage height in pixels
 * @property {string} title The centered title rendered above the video
 */
const OverlayTitle: OverlayTitleFactory = Blits.Component("OverlayTitle", {
  props: ["alpha", "fadeDurationMs", "stageW", "stageH", "title"],

  computed: {
    /**
     * @brief Resolve the maximum title width within the fixed stage
     *
     * @returns {number} The width available to the rendered title
     */
    titleMaxWidth(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;

      return stageW * 0.8;
    },

    /**
     * @brief Resolve the centered stage x position used by both text layers
     *
     * @returns {number} The horizontal center of the stage
     */
    titleCenterX(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageW: number = this.stageW as number;

      return stageW / 2;
    },

    /**
     * @brief Resolve the centered stage y position used by the white title text
     *
     * @returns {number} The vertical center of the stage
     */
    titleCenterY(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      const stageH: number = this.stageH as number;

      return stageH / 2;
    },

    /**
     * @brief Offset the black shadow slightly below the foreground title
     *
     * @returns {number} The y position used by the shadow text layer
     */
    shadowCenterY(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return (this.titleCenterY as number) + 2;
    },
  },

  template: `<Element>
      <Text
        :alpha.transition="{ value: $alpha, duration: $fadeDurationMs, easing: 'ease' }"
        align="center"
        color="#000000"
        :content="$title"
        font="sans-serif"
        :maxwidth="$titleMaxWidth"
        :mount="{ x: 0.5, y: 0.5 }"
        size="48"
        :x="$titleCenterX"
        :y="$shadowCenterY"
      />
      <Text
        :alpha.transition="{ value: $alpha, duration: $fadeDurationMs, easing: 'ease' }"
        align="center"
        color="#FFFFFF"
        :content="$title"
        font="sans-serif"
        :maxwidth="$titleMaxWidth"
        :mount="{ x: 0.5, y: 0.5 }"
        size="48"
        :x="$titleCenterX"
        :y="$titleCenterY"
      />
    </Element>`,
});

export default OverlayTitle;
