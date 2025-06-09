/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Setup the brightness control overlay and attach interaction handlers.
 */
export function setupBrightnessControl(): void {
  // SVG icons for the three brightness states.
  const ICON_SUN: string = `<path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"/>`;
  const ICON_MOON: string = `<path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd"/>`;
  const ICON_OFF: string = `<path fill-rule="evenodd" d="m6.72 5.66 11.62 11.62A8.25 8.25 0 0 0 6.72 5.66Zm10.56 12.68L5.66 6.72a8.25 8.25 0 0 0 11.62 11.62ZM5.105 5.106c3.807-3.808 9.98-3.808 13.788 0 3.808 3.807 3.808 9.98 0 13.788-3.807 3.808-9.98 3.808-13.788 0-3.808-3.807-3.808-9.98 0-13.788Z" clip-rule="evenodd"/>`;

  const container: HTMLDivElement = document.createElement("div");
  container.id = "brightness-control";
  container.style.position = "fixed";
  container.style.left = "1rem";
  container.style.bottom = "1rem";
  container.style.width = "40px";
  container.style.height = "40px";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.color = "white";
  container.style.opacity = "1";
  container.style.transition = "opacity 1s ease-out";
  container.style.cursor = "pointer";

  const svgNs: string = "http://www.w3.org/2000/svg";
  const svg: SVGSVGElement = document.createElementNS(
    svgNs,
    "svg",
  ) as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  container.appendChild(svg);

  let state: number = 0; // 0=on, 1=dim, 2=off

  const states: [string, number][] = [
    [ICON_SUN, 1],
    [ICON_MOON, 0.5],
    [ICON_OFF, 0],
  ];

  const updateIcon = (): void => {
    svg.innerHTML = states[state][0];
  };

  const applyBrightness = (): void => {
    const brightness: number = states[state][1];
    const video: HTMLVideoElement | null = document.querySelector("video");
    if (video !== null) {
      video.style.filter = `brightness(${brightness})`;
    }
  };

  const cycleState = (): void => {
    state = (state + 1) % states.length;
    updateIcon();
    applyBrightness();
  };

  container.addEventListener("click", cycleState);
  updateIcon();
  document.body.appendChild(container);
  applyBrightness();

  let hideTimeout: number | undefined;

  const showControl = (): void => {
    container.style.transition = "opacity 0.1s ease-in";
    container.style.opacity = "1";
    if (hideTimeout !== undefined) {
      window.clearTimeout(hideTimeout);
    }
    hideTimeout = window.setTimeout((): void => {
      container.style.transition = "opacity 1s ease-out";
      container.style.opacity = "0";
    }, 3000);
  };

  document.addEventListener("pointerdown", showControl);
  showControl();
}
