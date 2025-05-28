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
    iconSize: number;
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
  it("tracks window size and registers resize listener", () => {
    const originalWindow = globalThis.window;
    const addEventListener = vi.fn();
    (globalThis as any).window = {
      addEventListener,
      innerWidth: 100,
      innerHeight: 80,
    };

    const spinSpy = vi.fn();
    const context = { startSpin: spinSpy, w: 0, h: 0, iconSize: 0 };
    ready.call(context);
    expect(spinSpy).toHaveBeenCalled();
    expect(context.w).toBe(100);
    expect(context.h).toBe(80);
    // iconSize should be based on the smallest dimension divided by four
    expect(context.iconSize).toBe(20);
    expect(addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );

    const resizeCb = addEventListener.mock.calls[0][1] as () => void;
    (globalThis as any).window.innerWidth = 50;
    (globalThis as any).window.innerHeight = 60;
    resizeCb();
    expect(context.w).toBe(50);
    expect(context.h).toBe(60);
    expect(context.iconSize).toBe(12.5);

    (globalThis as any).window = originalWindow;
  });
});
