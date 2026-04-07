/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export type FittedStageBounds = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type StageLayoutEventDetail = {
  viewportWidth: number;
  viewportHeight: number;
};

export type ViewportSizeListener = (viewportSize: ViewportSize) => void;
export type StageBoundsListener = (
  fittedStageBounds: FittedStageBounds,
  viewportSize: ViewportSize,
) => void;

// Fixed design resolution for a TV-only Lightning experience
export const LIGHTNING_APP_WIDTH: number = 1920;
export const LIGHTNING_APP_HEIGHT: number = 1080;
export const TV_STAGE_LAYOUT_EVENT: string = "meditation-surf:tv-stage-layout";

/**
 * @brief Fit the fixed Lightning stage into the live browser viewport
 *
 * Keep the original TV aspect ratio intact while centering the fitted stage.
 */
export function getFittedStageBounds(
  viewportWidth: number,
  viewportHeight: number,
): FittedStageBounds {
  const widthScale: number = viewportWidth / LIGHTNING_APP_WIDTH;
  const heightScale: number = viewportHeight / LIGHTNING_APP_HEIGHT;
  const scale: number = Math.min(widthScale, heightScale);
  const width: number = LIGHTNING_APP_WIDTH * scale;
  const height: number = LIGHTNING_APP_HEIGHT * scale;
  const left: number = (viewportWidth - width) / 2;
  const top: number = (viewportHeight - height) / 2;

  return {
    width,
    height,
    left,
    top,
  };
}

/**
 * @brief Capture the current browser viewport size
 *
 * Keeps the TV layout module responsible for translating browser dimensions
 * into the fixed-stage Lightning coordinate system.
 */
export function getViewportSize(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * @brief Convert the current viewport into the event payload expected by TV UI
 *
 * @returns Stage-layout detail describing the live browser viewport
 */
export function createStageLayoutEventDetail(): StageLayoutEventDetail {
  const viewportSize: ViewportSize = getViewportSize();

  return {
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
  };
}

/**
 * @brief Notify the Lightning root that the fitted stage layout changed
 */
export function dispatchStageLayoutEvent(): void {
  const stageLayoutEvent: CustomEvent<StageLayoutEventDetail> =
    new CustomEvent<StageLayoutEventDetail>(TV_STAGE_LAYOUT_EVENT, {
      detail: createStageLayoutEventDetail(),
    });

  window.dispatchEvent(stageLayoutEvent);
}

/**
 * @brief Apply fitted bounds to the Lightning canvas element
 *
 * The TV app still owns its Lightning-specific canvas styling, but the stage
 * layout module now owns how fitted bounds map onto that DOM node.
 *
 * @param canvasElement - Lightning canvas rendered into the mount element
 * @param fittedStageBounds - Fixed stage fitted into the current viewport
 */
export function applyCanvasStageLayout(
  canvasElement: HTMLCanvasElement,
  fittedStageBounds: FittedStageBounds,
): void {
  canvasElement.style.position = "absolute";
  canvasElement.style.top = `${fittedStageBounds.top}px`;
  canvasElement.style.left = `${fittedStageBounds.left}px`;
  canvasElement.style.width = `${fittedStageBounds.width}px`;
  canvasElement.style.height = `${fittedStageBounds.height}px`;
  canvasElement.style.zIndex = "1";
}

/**
 * @brief Fit the Lightning canvas into the browser viewport and notify listeners
 *
 * The TV bootstrap owns when layout work runs, while this helper keeps the
 * viewport-to-stage calculation and DOM updates localized in one place.
 *
 * @param mountElement - App mount containing the Lightning canvas
 * @param onStageBoundsChanged - Optional TV-specific side effects for fitted bounds
 */
export function applyStageLayout(
  mountElement: HTMLElement,
  onStageBoundsChanged?: StageBoundsListener,
): void {
  const viewportSize: ViewportSize = getViewportSize();
  const fittedStageBounds: FittedStageBounds = getFittedStageBounds(
    viewportSize.width,
    viewportSize.height,
  );
  const canvasElement: HTMLCanvasElement | null =
    mountElement.querySelector("canvas");

  if (canvasElement !== null) {
    applyCanvasStageLayout(canvasElement, fittedStageBounds);
  }

  if (onStageBoundsChanged !== undefined) {
    onStageBoundsChanged(fittedStageBounds, viewportSize);
  }

  dispatchStageLayoutEvent();
}

/**
 * @brief Keep the fitted Lightning canvas synced to browser resizes
 *
 * Returns a teardown function so the bootstrap layer can own lifecycle
 * without duplicating the stage fitting implementation.
 *
 * @param mountElement - App mount containing the Lightning canvas
 * @param onStageBoundsChanged - Optional TV-specific side effects for fitted bounds
 * @returns Cleanup function removing the resize listener
 */
export function initializeStageLayout(
  mountElement: HTMLElement,
  onStageBoundsChanged?: StageBoundsListener,
): () => void {
  const handleResize: () => void = (): void => {
    applyStageLayout(mountElement, onStageBoundsChanged);
  };

  window.setTimeout(handleResize, 0);
  window.addEventListener("resize", handleResize);

  return (): void => {
    window.removeEventListener("resize", handleResize);
  };
}

/**
 * @brief Subscribe to viewport-size updates emitted by the bootstrap layer
 *
 * This keeps the Lightning root focused on reacting to viewport changes,
 * rather than parsing window events and event payloads itself.
 *
 * @param listener - Receives the live browser viewport dimensions
 * @returns Cleanup function removing the stage-layout listener
 */
export function subscribeToStageLayout(
  listener: ViewportSizeListener,
): () => void {
  const handleStageLayout: (event: Event) => void = (event: Event): void => {
    const stageLayoutEvent: CustomEvent<StageLayoutEventDetail> =
      event as CustomEvent<StageLayoutEventDetail>;

    listener({
      width: stageLayoutEvent.detail.viewportWidth,
      height: stageLayoutEvent.detail.viewportHeight,
    });
  };

  listener(getViewportSize());
  window.addEventListener(TV_STAGE_LAYOUT_EVENT, handleStageLayout);

  return (): void => {
    window.removeEventListener(TV_STAGE_LAYOUT_EVENT, handleStageLayout);
  };
}
