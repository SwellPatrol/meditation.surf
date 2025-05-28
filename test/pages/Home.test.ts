import { describe, expect, it, vi } from "vitest";

vi.mock("@lightningjs/blits", () => ({
  default: {
    Component: (_name: string, config: unknown) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
    Application: (config: unknown) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
  },
}));

import Home from "../../src/pages/Home";

const configSymbol = Symbol.for("config");
const homeConfig = (Home as any)[configSymbol];

const rotateColors = homeConfig.methods.rotateColors as (
  // eslint-disable-next-line no-unused-vars
  this: {
    color: string;
    // eslint-disable-next-line no-undef
    $setInterval: typeof setInterval;
  },
  // eslint-disable-next-line no-unused-vars
  interval: number,
) => void;
// eslint-disable-next-line no-unused-vars
const ready = homeConfig.hooks.ready as (this: any) => void;

describe("Home.rotateColors", () => {
  it("cycles through loader colors", () => {
    vi.useFakeTimers();
    const context = {
      color: "",
      // eslint-disable-next-line no-undef
      $setInterval: setInterval,
    };
    rotateColors.call(context, 100);

    expect(context.color).toBe("");
    vi.advanceTimersByTime(100);
    expect(context.color).toBe("#ede9fe");
    vi.advanceTimersByTime(100);
    expect(context.color).toBe("#ddd6fe");
    vi.useRealTimers();
  });
});

describe("Home.hooks.ready", () => {
  it("updates state over time", () => {
    vi.useFakeTimers();
    const rotateSpy = vi.fn();
    const context = {
      rotateColors: rotateSpy,
      loaderAlpha: 0,
      x: 0,
      rotation: 0,
      scale: 1,
      y: 0,
      textAlpha: 0,
      color: "",
      // eslint-disable-next-line no-undef
      $setTimeout: setTimeout,
      // eslint-disable-next-line no-undef
      $setInterval: setInterval,
    };

    ready.call(context);

    expect(rotateSpy).toHaveBeenCalledWith(200);
    expect(context.loaderAlpha).toBe(1);
    expect(context.x).toBe(1920 / 2);

    vi.advanceTimersByTime(3000);
    expect(context.rotation).toBe(720);
    expect(context.scale).toBe(1.5);

    vi.advanceTimersByTime(300);
    expect(context.scale).toBe(1);

    vi.advanceTimersByTime(2700);
    expect(context.y).toBe(-60);
    expect(context.loaderAlpha).toBe(0);
    expect(context.scale).toBe(1);
    expect(context.textAlpha).toBe(1);
    vi.useRealTimers();
  });
});
