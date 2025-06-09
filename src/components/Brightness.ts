/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import videoPlayerState from "../app/VideoPlayerState";
import {
  BrightnessLevel,
  getBrightnessLevel,
  setBrightnessLevel,
} from "../utils/brightness";

// Type alias for the factory returned by Blits.Component
type BrightnessFactory = ReturnType<typeof Blits.Component>;

/** SVG image for full brightness. */
const ICON_ON: string =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'><circle cx='12' cy='12' r='5' fill='white'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/></svg>";

/** SVG image for dimmed brightness. */
const ICON_DIM: string =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><circle cx='12' cy='12' r='5'/></svg>";

/** SVG image for turning the video off. */
const ICON_OFF: string =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'><circle cx='12' cy='12' r='5'/><line x1='6' y1='6' x2='18' y2='18'/><line x1='6' y1='18' x2='18' y2='6'/></svg>";

/** Order of brightness levels when toggling. */
const LEVEL_SEQUENCE: BrightnessLevel[] = ["on", "dim", "off"];

/** Milliseconds before the icon fades out after showing. */
const FADE_DELAY_MS: number = 2000;

/** Duration of the fade out transition. */
const FADE_OUT_MS: number = 600;

/** Duration of the fade in transition. */
const FADE_IN_MS: number = 150;

/**
 * Display and toggle the brightness level with an overlay icon.
 */
const Brightness: BrightnessFactory = Blits.Component("Brightness", {
  props: ["stageW", "stageH"],

  state() {
    return {
      alpha: 0 as number,
      level: getBrightnessLevel() as BrightnessLevel,
      timer: undefined as number | undefined,
    };
  },

  computed: {
    /** Current icon source based on brightness level. */
    iconSrc(): string {
      // @ts-ignore runtime binding of this
      switch (this.level as BrightnessLevel) {
        case "dim":
          return ICON_DIM;
        case "off":
          return ICON_OFF;
        default:
          return ICON_ON;
      }
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
          event.clientX <= size &&
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
    /** Cycle the brightness level and apply the change. */
    toggle(): void {
      // @ts-ignore runtime binding
      const current: BrightnessLevel = this.level as BrightnessLevel;
      const index: number = LEVEL_SEQUENCE.indexOf(current);
      this.level = LEVEL_SEQUENCE[
        (index + 1) % LEVEL_SEQUENCE.length
      ] as BrightnessLevel;
      setBrightnessLevel(this.level as BrightnessLevel);
      videoPlayerState.setBrightness(this.level as BrightnessLevel);
      // Keep the icon visible after toggling.
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
      :x="0"
      :y="$stageH"
      :mountX="0"
      :mountY="1"
      :alpha.transition="{ value: $alpha, duration: $fadeDuration }"
    />
  `,
});

export default Brightness;
