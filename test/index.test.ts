/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RESIZE_DEBOUNCE_MS } from "../src/launcher.js";

// Timeout interval used in the size management utilities

// Stub out the Lightning Blits APIs so the app can be imported in a Node environment
vi.mock("@lightningjs/blits", () => {
  const launch = vi.fn();
  return {
    default: {
      Application: vi.fn(() => ({})),
      Component: vi.fn(() => ({})),
      Launch: launch,
    },
  };
});

// Import the mocked module so we can inspect calls made during the tests
import Blits from "@lightningjs/blits";

// Reference to the mocked Blits.Launch function
let launchSpy: ReturnType<typeof vi.fn>;

// Minimal interfaces used to emulate the DOM elements accessed by the launcher
interface FakeElement {
  innerHTML: string;
}

interface FakeDocument {
  getElementById(errId: string): FakeElement;
}

beforeEach(() => {
  // Use fake timers so resize debouncing can be tested deterministically
  vi.useFakeTimers();
  vi.resetModules();

  // Simple document implementation that stores created elements by id
  const elements: Record<string, FakeElement> = {};
  const fakeDocument: FakeDocument = {
    getElementById(errId: string): FakeElement {
      if (!elements[errId]) {
        elements[errId] = { innerHTML: "" };
      }
      return elements[errId];
    },
  };

  // Construct a minimal window object with properties accessed by the launcher
  const fakeWindow: Window & {
    innerWidth: number;
    innerHeight: number;
    document: Document & FakeDocument;
  } = new EventTarget() as unknown as Window & {
    innerWidth: number;
    innerHeight: number;
    document: Document & FakeDocument;
  };
  // Default window size before any resize events are triggered
  fakeWindow.innerWidth = 800;
  fakeWindow.innerHeight = 600;
  fakeWindow.document = fakeDocument as unknown as Document & FakeDocument;
  // Use the global timer functions so Vitest's fake timers apply
  fakeWindow.setTimeout = globalThis.setTimeout.bind(globalThis);
  fakeWindow.clearTimeout = globalThis.clearTimeout.bind(globalThis);

  // Expose the fake window and document on the global object so the launcher can access them
  (globalThis as any).window = fakeWindow;
  (globalThis as any).document = fakeDocument;

  launchSpy = Blits.Launch as ReturnType<typeof vi.fn>;
  launchSpy.mockClear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetModules();

  // Clean up the global objects to avoid leaking state between tests
  delete (globalThis as any).window;
  delete (globalThis as any).document;
});

describe("index window events", () => {
  // The app should relaunch when the window is resized
  it("relaunches on resize", async () => {
    await import("../src/index.js");

    expect(launchSpy).toHaveBeenCalledTimes(1);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: 800,
      h: 600,
    });

    window.innerWidth = 1000;
    window.innerHeight = 700;
    window.dispatchEvent(new Event("resize"));

    // Advance only part of the debounce time to verify no relaunch yet
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE_MS - 1);
    expect(launchSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(launchSpy).toHaveBeenCalledTimes(2);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: 1000,
      h: 700,
    });
  });

  // The app should also relaunch when the device orientation changes
  it("relaunches on orientation change", async () => {
    await import("../src/index.js");

    window.innerWidth = 600;
    window.innerHeight = 800;
    window.dispatchEvent(new Event("orientationchange"));

    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE_MS);
    expect(launchSpy).toHaveBeenCalledTimes(2);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: 600,
      h: 800,
    });
  });

  // Multiple quick resizes should only cause a single relaunch
  it("debounces spurious resize events", async () => {
    await import("../src/index.js");

    window.innerWidth = 900;
    window.innerHeight = 500;
    window.dispatchEvent(new Event("resize"));
    await vi.advanceTimersByTimeAsync(50);

    window.innerWidth = 1000;
    window.innerHeight = 600;
    window.dispatchEvent(new Event("resize"));
    await vi.advanceTimersByTimeAsync(50);

    window.innerWidth = 1100;
    window.innerHeight = 700;
    window.dispatchEvent(new Event("resize"));

    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE_MS);
    expect(launchSpy).toHaveBeenCalledTimes(2);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: 1100,
      h: 700,
    });
  });
});
