/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * This test validates that the application's entry point correctly launches
 * the LightningJS application when imported. The DOM APIs and LightningJS
 * functions are mocked so that the app can run in a Node environment.
 */

//
// Stub out the Lightning Blits APIs so the entry point can be imported in a
// Node environment. Only the minimal functionality required by the tests is
// mocked.
//
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

import Blits from "@lightningjs/blits";

// Default viewport dimensions used when launching the app during tests
const DEFAULT_WIDTH: number = 800;
const DEFAULT_HEIGHT: number = 600;

// Reference to the mocked Launch function captured in beforeEach
let launchSpy: ReturnType<typeof vi.fn>;

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

beforeEach((): void => {
  // Use fake timers so any timeouts behave deterministically in tests
  vi.useFakeTimers();

  // Reload modules between tests so event handlers are freshly registered
  vi.resetModules();

  // Minimal document implementation that provides getElementById. Elements are
  // created on demand and cached by id so that innerHTML can be inspected.
  const elements: Record<string, FakeElement> = {};
  const fakeDocument: FakeDocument = {
    getElementById(id: string): FakeElement {
      if (!elements[id]) {
        elements[id] = { innerHTML: "" };
      }
      return elements[id];
    },
  };

  // Construct a minimal window object with the properties used by the app
  const fakeWindow: Window & {
    innerWidth: number;
    innerHeight: number;
    document: Document & FakeDocument;
  } = new EventTarget() as unknown as Window & {
    innerWidth: number;
    innerHeight: number;
    document: Document & FakeDocument;
  };

  // Provide initial dimensions used by the app launch logic
  fakeWindow.innerWidth = DEFAULT_WIDTH;
  fakeWindow.innerHeight = DEFAULT_HEIGHT;
  fakeWindow.document = fakeDocument as unknown as Document & FakeDocument;
  fakeWindow.setTimeout = globalThis.setTimeout.bind(globalThis);
  fakeWindow.clearTimeout = globalThis.clearTimeout.bind(globalThis);

  // Expose the fake window and document on the global object so the app can
  // access them like it would in a browser environment
  const globalObject: TestGlobal = globalThis as unknown as TestGlobal;
  globalObject.window = fakeWindow;
  globalObject.document = fakeDocument as unknown as Document & FakeDocument;

  // Capture the mocked Launch function for assertions within the tests
  launchSpy = Blits.Launch as ReturnType<typeof vi.fn>;
  launchSpy.mockClear();
});

afterEach((): void => {
  // Restore timer and module state between tests
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetModules();

  // Clean up the global objects to avoid leaking state across tests
  const globalObject: TestGlobal = globalThis as unknown as TestGlobal;
  delete globalObject.window;
  delete globalObject.document;
});

// Ensure the app launches when the entry point is imported
describe("index entry point", () => {
  // Importing the entry point should automatically start the Lightning app
  it("launches the app", async () => {
    await import("../src/index.js");

    expect(launchSpy).toHaveBeenCalledTimes(1);
    expect(launchSpy).toHaveBeenLastCalledWith(expect.anything(), "app", {
      w: DEFAULT_WIDTH,
      h: DEFAULT_HEIGHT,
    });
  });
});
