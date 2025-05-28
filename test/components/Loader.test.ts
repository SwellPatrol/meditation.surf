/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@lightningjs/blits", () => ({
  default: {
    // Return a minimal Component factory and stash the config on a symbol so the
    // test can grab Loader.start without loading the real library
    Component: (_name: string, config: unknown): (() => void) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
  },
}));

import Loader from "../../src/components/Loader";

// Access the original methods through the configuration symbol
const configSymbol = Symbol.for("config");
// eslint-disable-next-line no-unused-vars
const start = (Loader as any)[configSymbol].methods.start as (this: {
  alpha: number;
  // eslint-disable-next-line no-undef
  $setInterval: typeof setInterval;
}) => void;

describe("Loader.start", (): void => {
  it("toggles alpha between 0 and 1", (): void => {
    vi.useFakeTimers();

    // Mimic the component instance
    // eslint-disable-next-line no-undef
    const context: { alpha: number; $setInterval: typeof setInterval } = {
      alpha: 0,
      // eslint-disable-next-line no-undef
      $setInterval: setInterval,
    };

    // Start the interval-based toggle
    start.call(context);

    // Nothing happens immediately
    expect(context.alpha).toBe(0);

    // After 800ms the value flips to 1
    vi.advanceTimersByTime(800);
    expect(context.alpha).toBe(1);

    // Next interval should flip it back
    vi.advanceTimersByTime(800);
    expect(context.alpha).toBe(0);

    vi.useRealTimers();
  });
});
