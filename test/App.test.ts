import { describe, expect, it, vi } from "vitest";

vi.mock("@lightningjs/blits", () => ({
  default: {
    Application: (config: unknown) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
    Component: (_name: string, config: unknown) => {
      const factory = (() => {}) as (() => void) & { [key: symbol]: unknown };
      factory[Symbol.for("config")] = config;
      return factory;
    },
  },
}));

import App from "../src/App";
import Home from "../src/pages/Home";

const configSymbol = Symbol.for("config");
const appConfig = (App as any)[configSymbol];

describe("App configuration", () => {
  it("defines a root route with Home component", () => {
    expect(appConfig.routes).toHaveLength(1);
    const route = appConfig.routes[0];
    expect(route.path).toBe("/");
    expect(route.component).toBe(Home);
  });
});
