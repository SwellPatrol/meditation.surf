/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import videoPlayerState from "../app/VideoPlayerState";
import { getAudioMuted, setAudioMuted } from "../utils/audio";

// Type alias for the factory returned by Blits.Component
type VolumeFactory = ReturnType<typeof Blits.Component>;

/** SVG image for the speaker icon when audio plays. */
const ICON_UNMUTED: string =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M4 9v6h4l5 5V4L8 9H4z'/><path d='M16.5 12a4.5 4.5 0 0 0-4.09-4.47v2.05A2.5 2.5 0 0 1 14 12a2.5 2.5 0 0 1-1.59 2.42v2.05A4.5 4.5 0 0 0 16.5 12z'/></svg>";

/** SVG image for the muted speaker icon. */
const ICON_MUTED: string =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M4 9v6h4l5 5V4L8 9H4z'/><path d='M19 6.41 17.59 5 14 8.59 10.41 5 9 6.41 12.59 10 9 13.59 10.41 15 14 11.41 17.59 15 19 13.59 15.41 10z'/></svg>";

/** Milliseconds before the icon fades out after showing. */
const FADE_DELAY_MS: number = 2000;

/** Duration of the fade out transition. */
const FADE_OUT_MS: number = 600;

/** Duration of the fade in transition. */
const FADE_IN_MS: number = 150;

/**
 * Control displaying and toggling the muted state with an overlay icon.
 */
const Volume: VolumeFactory = Blits.Component("Volume", {
  props: ["stageW", "stageH"],

  state() {
    return {
      alpha: 0 as number,
      muted: getAudioMuted() as boolean,
      timer: undefined as number | undefined,
    };
  },

  computed: {
    /** Current icon source based on muted state. */
    iconSrc(): string {
      // @ts-ignore runtime binding of this
      return this.muted ? ICON_MUTED : ICON_UNMUTED;
    },

    /** Size of the icon keeping the aspect ratio. */
    iconSize(): number {
      // @ts-ignore runtime binding of this
      return Math.min(this.stageW as number, this.stageH as number) / 4;
    },

    /** Transition duration based on visibility. */
    fadeDuration(): number {
      // @ts-ignore runtime binding of this
      return (this.alpha as number) > 0 ? FADE_IN_MS : FADE_OUT_MS;
    },
  },

  hooks: {
    ready(): void {
      // Show the icon briefly on startup.
      // @ts-ignore runtime binding
      this.show();
      // Attach event listeners to display the icon on interaction.
      const self: any = this;
      const showHandler: () => void = (): void => {
        self.show();
      };
      const clickHandler = (event: MouseEvent): void => {
        const size: number = self.iconSize as number;
        if (
          event.clientX >= window.innerWidth - size &&
          event.clientY >= window.innerHeight - size
        ) {
          self.toggle();
        }
      };
      self._showHandler = showHandler;
      self._clickHandler = clickHandler;
      window.addEventListener("touchstart", showHandler);
      window.addEventListener("mousedown", showHandler);
      window.addEventListener("click", clickHandler);
    },
    destroy(): void {
      const self: any = this;
      if (self._showHandler) {
        window.removeEventListener(
          "touchstart",
          self._showHandler as () => void,
        );
        window.removeEventListener(
          "mousedown",
          self._showHandler as () => void,
        );
      }
      if (self._clickHandler) {
        window.removeEventListener(
          "click",
          self._clickHandler as EventListener,
        );
      }
    },
  },

  methods: {
    /** Toggle mute state and persist the preference. */
    toggle(): void {
      // @ts-ignore runtime binding
      this.muted = !(this.muted as boolean);
      // @ts-ignore runtime binding
      setAudioMuted(this.muted as boolean);
      // @ts-ignore runtime binding
      videoPlayerState.setMuted(this.muted as boolean);
      // Ensure the icon stays visible after toggling.
      // @ts-ignore runtime binding
      this.show();
    },

    /** Display the icon and schedule a fade out. */
    show(): void {
      // @ts-ignore runtime binding
      this.alpha = 1;
      const self: any = this;
      if (self.timer !== undefined) {
        window.clearTimeout(self.timer as number);
      }
      self.timer = window.setTimeout((): void => {
        self.alpha = 0;
      }, FADE_DELAY_MS);
    },
  },

  template: `
    <Element
      :src="$iconSrc"
      :w="$iconSize"
      :h="$iconSize"
      :x="$stageW"
      :y="$stageH"
      mount="1"
      :alpha.transition="{ value: $alpha, duration: $fadeDuration }"
    />
  `,
});

export default Volume;
