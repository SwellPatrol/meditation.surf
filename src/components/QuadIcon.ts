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
    /** Width of each quadrant in pixels. */
    cellW(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return (this.stageW as number) / 2;
    },

    /** Height of each quadrant in pixels. */
    cellH(): number {
      // @ts-ignore `this` contains the reactive props provided at runtime
      return (this.stageH as number) / 2;
    },
  },

  // Render four cropped icons positioned in a 2x2 grid
  template: `<Element :w="$stageW" :h="$stageH">
      <Element
        src="assets/icon.png"
        :w="$cellW"
        :h="$cellH"
        fit="{type: 'cover', position: {x: 0, y: 0}}"
      />
      <Element
        src="assets/icon.png"
        :x="$cellW"
        :w="$cellW"
        :h="$cellH"
        fit="{type: 'cover', position: {x: 1, y: 0}}"
      />
      <Element
        src="assets/icon.png"
        :y="$cellH"
        :w="$cellW"
        :h="$cellH"
        fit="{type: 'cover', position: {x: 0, y: 1}}"
      />
      <Element
        src="assets/icon.png"
        :x="$cellW"
        :y="$cellH"
        :w="$cellW"
        :h="$cellH"
        fit="{type: 'cover', position: {x: 1, y: 1}}"
      />
    </Element>`,
});

export default QuadIcon;
