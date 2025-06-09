/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

// Volume control overlay for the demo video.
// Adds a clickable icon to toggle mute state and persists
// the choice using local storage.

const STORAGE_KEY: string = "audio-muted";

/**
 * Persistent volume control overlay attached to the video element.
 */
class VolumeControl {
  /** Container element displaying the SVG icon. */
  private button: HTMLDivElement;

  /** Video player interface from the Lightning SDK. */
  private readonly videoPlayer: any;

  /** Hide timer identifier or undefined when not visible. */
  private hideTimer: number | undefined;

  /** True after the DOM and listeners are configured. */
  private initialized: boolean;

  /** Current mute state. */
  private muted: boolean;

  constructor(videoPlayer: any) {
    this.videoPlayer = videoPlayer;
    this.button = document.createElement("div");
    this.button.id = "volume-button";
    this.hideTimer = undefined;
    this.muted = true as boolean;
    this.initialized = false as boolean;
  }

  /**
   * Read the mute state from local storage.
   */
  private loadState(): boolean {
    const value: string | null = window.localStorage.getItem(STORAGE_KEY);
    return value === null ? true : value === "true";
  }

  /**
   * Persist the mute state to local storage.
   */
  private saveState(): void {
    window.localStorage.setItem(STORAGE_KEY, String(this.muted));
  }

  /**
   * Update the SVG path based on the current mute state.
   */
  private updateGraphic(): void {
    const mutedSvg: string =
      '<svg viewBox="0 0 64 64"><path fill="white" d="M12 24v16h12l12 12V12L24 24H12z"/><line x1="44" y1="24" x2="52" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/><line x1="52" y1="24" x2="44" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>';
    const unmutedSvg: string =
      '<svg viewBox="0 0 64 64"><path fill="white" d="M12 24v16h12l12 12V12L24 24H12z"/><path d="M40 24c4 4 4 12 0 16" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M46 18c8 8 8 20 0 28" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>';
    const svg: string = this.muted ? mutedSvg : unmutedSvg;
    this.button.innerHTML = svg;
  }

  /**
   * Toggle the mute state and update the video player and UI.
   */
  private toggleMute = (): void => {
    this.muted = !this.muted;
    this.videoPlayer.mute(this.muted);
    const videoEl: HTMLVideoElement | undefined = (this.videoPlayer as any)
      ._videoEl;
    if (videoEl !== undefined) {
      videoEl.muted = this.muted;
    }
    this.saveState();
    this.updateGraphic();
    this.show();
  };

  /**
   * Fade the icon in rapidly and schedule a slower fade out.
   */
  private show = (): void => {
    window.clearTimeout(this.hideTimer);
    this.button.classList.remove("fade-out");
    this.button.classList.add("fade-in");
    this.hideTimer = window.setTimeout(this.hide, 3000);
  };

  /**
   * Fade the icon out slowly.
   */
  private hide = (): void => {
    this.button.classList.remove("fade-in");
    this.button.classList.add("fade-out");
  };

  /**
   * Retrieve the current mute state.
   */
  public getMuted(): boolean {
    return this.muted;
  }

  /**
   * Adjust the icon size based on the viewport.
   */
  public updateSize(width: number, height: number): void {
    const side: number = Math.min(width, height) / 4;
    this.button.style.width = `${side}px`;
    this.button.style.height = `${side}px`;
  }

  /**
   * Attach the overlay to the page and configure event handlers.
   */
  public attach(videoEl: HTMLVideoElement): void {
    this.muted = this.loadState();
    this.updateGraphic();

    if (!this.initialized) {
      this.button.style.position = "absolute";
      this.button.style.bottom = "1rem";
      this.button.style.right = "1rem";
      this.button.style.opacity = "0";
      this.button.style.cursor = "pointer";
      this.button.classList.add("fade-out");

      this.button.addEventListener("click", this.toggleMute);
      videoEl.addEventListener("click", this.show);
      videoEl.addEventListener("touchstart", this.show);
      this.initialized = true as boolean;
    }

    if (!this.button.isConnected) {
      document.body.appendChild(this.button);
    }

    this.videoPlayer.mute(this.muted);
    videoEl.muted = this.muted;
  }
}

export default VolumeControl;
