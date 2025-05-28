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
    Component: (_name: string, config: unknown) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
  },
}));

import Home from "../../src/pages/Home";

const configSymbol = Symbol.for("config");
const homeConfig = (Home as any)[configSymbol];

const startSpin = homeConfig.methods.startSpin as (
  // eslint-disable-next-line no-unused-vars
  this: {
    rotation: number;
    // eslint-disable-next-line no-undef
    $setInterval: typeof setInterval;
  },
) => void;
const ready = homeConfig.hooks.ready as (
  // eslint-disable-next-line no-unused-vars
  this: {
    startSpin: () => void;
    w: number;
    h: number;
  },
) => void;

describe("Home.startSpin", () => {
  it("increments rotation over time", () => {
    vi.useFakeTimers();
    const context = {
      rotation: 0,
      // eslint-disable-next-line no-undef
      $setInterval: setInterval,
    };
    startSpin.call(context);
    expect(context.rotation).toBe(0);
    vi.advanceTimersByTime(800);
    expect(context.rotation).toBe(360);
    vi.useRealTimers();
  });
});

describe("Home.hooks.ready", () => {
  it("starts spinning on ready", () => {
    const originalWindow = globalThis.window;
    // Mock a minimal window object for the component
    (globalThis as any).window = { addEventListener: vi.fn() };

    const spinSpy = vi.fn();
    const context = { startSpin: spinSpy, w: 0, h: 0 };
    ready.call(context);
    expect(spinSpy).toHaveBeenCalled();

    // Restore the original window
    (globalThis as any).window = originalWindow;
  });
});
