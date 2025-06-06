/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RESIZE_DEBOUNCE_MS } from "../src/launcher.js";

/*
 * The tests in this file validate the behavior of launcher.ts. They ensure
 * that the Lightning application restarts whenever the viewport size or
 * orientation changes. Because Vitest runs in Node, we stub out the minimal
 * DOM APIs and LightningJS functions required for the module under test.
 */

//
// Stub out the Lightning Blits APIs so the app can be imported in a Node
// environment. Only the methods exercised by launcher.ts are mocked.
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

// Minimal interfaces used to emulate the DOM elements accessed by launcher.ts
interface FakeElement {
  innerHTML: string;
}

interface FakeDocument {
  // eslint-disable-next-line no-unused-vars
  getElementById(id: string): FakeElement;
}

interface TestGlobal {
  window?: Window & {
    innerWidth: number;
    innerHeight: number;
    document: Document & FakeDocument;
  };
  document?: Document & FakeDocument;
}

beforeEach(() => {
  // Use fake timers so resize debouncing can be tested deterministically
  vi.useFakeTimers();
  // Reload the module in each test so that event handlers are re-registered
  vi.resetModules();

  // Simple document implementation that stores created elements by id. This is
  // enough for launcher.ts which only queries DOM nodes by id and writes to
  // innerHTML.
  const elements: Record<string, FakeElement> = {};
  const fakeDocument: FakeDocument = {
    getElementById(id: string): FakeElement {
      if (!elements[id]) {
        elements[id] = { innerHTML: "" };
      }
      return elements[id];
    },
  };

  // Construct a minimal window object with properties accessed by launcher.ts
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

  // Expose the fake window and document on the global object so launcher.ts can access them
  const globalObject: TestGlobal = globalThis as unknown as TestGlobal;
  globalObject.window = fakeWindow;
  globalObject.document = fakeDocument as unknown as Document & FakeDocument;

  // Capture the mocked Launch function so we can verify how the app is started
  // during each test.
  launchSpy = Blits.Launch as ReturnType<typeof vi.fn>;
  launchSpy.mockClear();
});

afterEach(() => {
  // Restore timers and module state between tests
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetModules();

  // Clean up the global objects to avoid leaking state between tests
  const globalObject: TestGlobal = globalThis as unknown as TestGlobal;
  delete globalObject.window;
  delete globalObject.document;
});

// Group tests validating that launcher.ts responds to window events
describe("launcher window events", () => {
  // The app should relaunch when the window is resized
  it("relaunches on resize", async () => {
    // Import the launcher module and manually start the app
    const { startApp } = await import("../src/launcher.js");
    startApp();

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
    // Import the launcher module and manually start the app
    const { startApp } = await import("../src/launcher.js");
    startApp();

    window.innerWidth = 600;
    window.innerHeight = 800;
    // Fire an orientation change event as would happen on mobile devices
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
    // Import the launcher module and manually start the app
    const { startApp } = await import("../src/launcher.js");
    startApp();

    window.innerWidth = 900;
    window.innerHeight = 500;
    // Fire several resize events in quick succession to test the debounce logic
    window.dispatchEvent(new Event("resize"));
    await vi.advanceTimersByTimeAsync(50);

    window.innerWidth = 1000;
    window.innerHeight = 600;
    // Another resize event occurs before the debounce period expires
    window.dispatchEvent(new Event("resize"));
    await vi.advanceTimersByTimeAsync(50);

    window.innerWidth = 1100;
    window.innerHeight = 700;
    // Final resize event that should trigger a relaunch once the debounce timer
    // expires
    window.dispatchEvent(new Event("resize"));

    // Allow the debounce timer to elapse so that any pending relaunch occurs
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE_MS);
    expect(launchSpy).toHaveBeenCalledTimes(2);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: 1100,
      h: 700,
    });
  });
});
