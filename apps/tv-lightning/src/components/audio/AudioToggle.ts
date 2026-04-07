/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import lightningPlaybackAdapter from "../../app/playback/LightningPlaybackAdapter";
import AudioState from "../../app/state/AudioState";

type AudioToggleState = {
  muted: boolean;
};

type AudioToggleFactory = ReturnType<typeof Blits.Component>;

/**
 * Overlay button that toggles the player's audio mute state.
 * The icon is anchored to the bottom-right corner of the stage.
 */
const AudioToggle: AudioToggleFactory = Blits.Component("AudioToggle", {
  // Stage dimensions passed from the parent component
  props: ["stageW", "stageH"],

  // Maintain local mute state in sync with AudioState
  state(): AudioToggleState {
    return {
      muted: AudioState.isMuted(),
    };
  },

  methods: {
    /** Toggle the mute state and apply it to the video player. */
    toggle(this: AudioToggleState): void {
      const newMuted: boolean = !this.muted;
      lightningPlaybackAdapter.setMuted(newMuted);
      AudioState.setMuted(newMuted);
      this.muted = newMuted;
    },
  },

  template: `<Element
      :src="$muted ? 'assets/audio-off.svg' : 'assets/audio-on.svg'"
      :w="$stageW / 3"
      :h="$stageH / 3"
      :x="$stageW"
      :y="$stageH"
      :zIndex="2"
      :mount="1"
      @click="toggle"
    />`,
});

export default AudioToggle;
