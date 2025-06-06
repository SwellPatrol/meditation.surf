/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default Blits.Component("Home", {
  template: `
    <Element :w="$stageW" :h="$stageH" color="#000000">
      <Element
        src="assets/icon.png"
        :x="($stageW - $iconSize) / 2"
        :y="($stageH - $iconSize) / 2"
        :w="$iconSize"
        :h="$iconSize"
      />
    </Element>
  `,
  computed: {
    iconSize(): number {
      return Math.min(this.$stageW, this.$stageH) * 0.5;
    },
  },
});
