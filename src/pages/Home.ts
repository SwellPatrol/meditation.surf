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
  computed: {
    // Size of the square icon based on the larger stage dimension
    iconSize(): number {
      return Math.max(this.$stageW, this.$stageH);
    },
  },
  template: `
    <Element :w="$stageW" :h="$stageH" color="#000000">
      <Element
        :w="$iconSize"
        :h="$iconSize"
        :x="($stageW - $iconSize) / 2"
        :y="($stageH - $iconSize) / 2"
        :src="$$appState.iconSrc"
        fit="cover"
      />
    </Element>
  `,
});
