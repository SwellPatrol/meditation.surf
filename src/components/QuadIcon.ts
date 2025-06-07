/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

// Type alias for the factory returned by Blits.Component
type QuadIconFactory = ReturnType<typeof Blits.Component>;

/**
 * Display the app icon four times, cropped into quadrants.
 * Each icon occupies a quarter of the viewport and resizes with the window.
 */
const QuadIcon: QuadIconFactory = Blits.Component("QuadIcon", {
  // Stage dimensions passed from the parent component
  props: ["stageW", "stageH"],

  computed: {
    /** Width of half of the viewport. */
    halfW(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return (this.stageW as number) / 2;
    },

    /** Height of half of the viewport. */
    halfH(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return (this.stageH as number) / 2;
    },

    /**
     * Size of the square icon in pixels. The longest stage
     * dimension is used to keep the icon centered when cropping.
     */
    iconSize(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return Math.max(this.stageW as number, this.stageH as number);
    },
  },

  // Render a single icon sliced into quadrants using clipping
  template: `<Element :w="$stageW" :h="$stageH">
      <!-- Top-left corner -->
      <Element :w="$halfW" :h="$halfH" clipping="true">
        <Element
          src="assets/icon.png"
          :w="$iconSize"
          :h="$iconSize"
          :x="$stageW / 2"
          :y="$stageH / 2"
          mount="0.5"
        />
      </Element>
      <!-- Top-right corner -->
      <Element :x="$halfW" :w="$halfW" :h="$halfH" clipping="true">
        <Element
          src="assets/icon.png"
          :w="$iconSize"
          :h="$iconSize"
          :x="0"
          :y="$stageH / 2"
          mount="0.5"
        />
      </Element>
      <!-- Bottom-left corner -->
      <Element :y="$halfH" :w="$halfW" :h="$halfH" clipping="true">
        <Element
          src="assets/icon.png"
          :w="$iconSize"
          :h="$iconSize"
          :x="$stageW / 2"
          :y="0"
          mount="0.5"
        />
      </Element>
      <!-- Bottom-right corner -->
      <Element :x="$halfW" :y="$halfH" :w="$halfW" :h="$halfH" clipping="true">
        <Element
          src="assets/icon.png"
          :w="$iconSize"
          :h="$iconSize"
          :x="0"
          :y="0"
          mount="0.5"
        />
      </Element>
    </Element>`,
});

export default QuadIcon;
