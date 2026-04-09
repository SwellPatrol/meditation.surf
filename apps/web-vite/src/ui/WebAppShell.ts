/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BrowseFocusState,
  BrowseHeroContent,
  BrowseInputMode,
  BrowseMetadataEntry,
  BrowseRowContent,
  BrowseScreenContent,
  BrowseThumbnailContent,
} from "@meditation-surf/core";

import { WebAppLayoutController } from "../layout/WebAppLayoutController";

/**
 * @brief Own the DOM shell used by the web demo surface
 *
 * The shell is intentionally runtime-specific. It knows how to assemble the
 * DOM nodes that the web app needs, while the shared experience model stays
 * outside the shell itself.
 */
export class WebAppShell {
  public readonly backgroundVideoElement: HTMLVideoElement;
  public readonly fullscreenInteractionElement: HTMLButtonElement;
  public readonly loadingOverlayElement: HTMLImageElement;
  public readonly overlayUiElement: HTMLDivElement;
  public readonly mountElement: HTMLDivElement;

  private browseFocusState: BrowseFocusState;
  private thumbnailCardElements: HTMLElement[][];

  /**
   * @brief Build the DOM shell for the web app
   *
   * @param appLayoutController - Runtime adapter for the shared app layout
   * @param browseContent - Shared browse content rendered in the overlay UI plane
   */
  public constructor(
    appLayoutController: WebAppLayoutController,
    browseContent: BrowseScreenContent,
  ) {
    this.browseFocusState = {
      activeRowIndex: 0,
      activeItemIndexByRow: [],
    };
    this.thumbnailCardElements = [];
    this.mountElement = this.getMountElement();
    this.backgroundVideoElement = document.createElement("video");
    this.fullscreenInteractionElement = document.createElement("button");
    this.loadingOverlayElement =
      appLayoutController.createCenteredOverlayElement();
    this.overlayUiElement = this.createOverlayUiElement();
    const loadingPlaneElement: HTMLDivElement = this.createOverlayPlaneElement(
      "loading-plane",
      false,
    );
    const overlayUiPlaneElement: HTMLDivElement =
      this.createOverlayPlaneElement("overlay-ui-plane", true);

    this.backgroundVideoElement.className = "background-video";
    this.fullscreenInteractionElement.className = "interaction-surface";
    this.fullscreenInteractionElement.type = "button";
    this.fullscreenInteractionElement.setAttribute(
      "aria-label",
      "Show overlay controls",
    );
    this.loadingOverlayElement.classList.add("loading-icon");

    /**
     * @brief Prime both overlay planes with the shared centered sizing
     *
     * The loading plane is visible immediately, so its icon must receive its
     * initial width and height before the first paint. The overlay UI plane is
     * independent text, so only the loading plane consumes the shared overlay
     * sizing guidance.
     */
    appLayoutController.applyCenteredOverlayLayout(this.loadingOverlayElement);
    this.renderBrowseContent(browseContent);
    loadingPlaneElement.append(this.loadingOverlayElement);
    overlayUiPlaneElement.append(this.overlayUiElement);
    this.mountElement.append(
      this.backgroundVideoElement,
      this.fullscreenInteractionElement,
      loadingPlaneElement,
      overlayUiPlaneElement,
    );
  }

  /**
   * @brief Resolve the root mount element used by the Vite app
   *
   * @returns DOM mount element used for the entire surface
   */
  private getMountElement(): HTMLDivElement {
    const appRootElement: HTMLDivElement | null =
      document.querySelector("#app");

    if (appRootElement === null) {
      throw new Error("Expected the #app root element to exist.");
    }

    return appRootElement;
  }

  /**
   * @brief Render the shared browse content into the overlay UI plane
   *
   * @param browseContent - Shared browse content prepared by the core adapter
   */
  public renderBrowseContent(browseContent: BrowseScreenContent): void {
    this.thumbnailCardElements = [];
    this.overlayUiElement.replaceChildren(
      this.createBrowseOverlayElement(browseContent),
    );
    this.renderBrowseFocusState(this.browseFocusState);
  }

  /**
   * @brief Apply the shared browse focus state to the currently rendered cards
   *
   * @param browseFocusState - Shared browse focus snapshot
   */
  public renderBrowseFocusState(browseFocusState: BrowseFocusState): void {
    this.browseFocusState = {
      activeRowIndex: browseFocusState.activeRowIndex,
      activeItemIndexByRow: [...browseFocusState.activeItemIndexByRow],
    };

    for (const [
      rowIndex,
      rowCardElements,
    ] of this.thumbnailCardElements.entries()) {
      const activeItemIndex: number =
        this.browseFocusState.activeItemIndexByRow[rowIndex] ?? 0;

      for (const [
        itemIndex,
        thumbnailCardElement,
      ] of rowCardElements.entries()) {
        const isFocused: boolean =
          rowIndex === this.browseFocusState.activeRowIndex &&
          itemIndex === activeItemIndex;

        thumbnailCardElement.classList.toggle("is-focused", isFocused);
      }
    }
  }

  /**
   * @brief Apply browse input-mode styling to the web app shell
   *
   * @param inputMode - Surface-local browse input mode
   */
  public renderInputMode(inputMode: BrowseInputMode): void {
    this.mountElement.classList.toggle(
      "is-keyboard-mode",
      inputMode === "keyboard",
    );
  }

  /**
   * @brief Expose the currently rendered thumbnail cards to input adapters
   *
   * @returns Matrix of rendered thumbnail card elements
   */
  public getThumbnailCardElements(): readonly (readonly HTMLElement[])[] {
    return this.thumbnailCardElements;
  }

  /**
   * @brief Create the overlay UI root element
   *
   * @returns DOM element used as the overlay UI root
   */
  private createOverlayUiElement(): HTMLDivElement {
    const overlayUiElement: HTMLDivElement = document.createElement("div");

    overlayUiElement.className = "browse-overlay";

    return overlayUiElement;
  }

  /**
   * @brief Create the full browse overlay DOM tree from shared content
   *
   * @param browseContent - Shared browse content prepared by the core adapter
   *
   * @returns DOM subtree rendered inside the overlay UI plane
   */
  private createBrowseOverlayElement(
    browseContent: BrowseScreenContent,
  ): HTMLDivElement {
    const browseOverlayRootElement: HTMLDivElement =
      document.createElement("div");
    const heroContent: BrowseHeroContent | null = browseContent.hero;
    const browseRowsElement: HTMLDivElement = document.createElement("div");

    browseOverlayRootElement.className = "browse-overlay-root";
    browseRowsElement.className = "browse-rows";

    if (heroContent !== null) {
      browseOverlayRootElement.append(
        this.createHeroSectionElement(heroContent),
      );
    }

    for (const [rowIndex, browseRow] of browseContent.rows.entries()) {
      browseRowsElement.append(
        this.createBrowseRowElement(browseRow, rowIndex),
      );
    }

    browseOverlayRootElement.append(browseRowsElement);

    return browseOverlayRootElement;
  }

  /**
   * @brief Create the hero section shown above the browse rows
   *
   * @param heroContent - Shared browse hero content
   *
   * @returns DOM element representing the hero area
   */
  private createHeroSectionElement(
    heroContent: BrowseHeroContent,
  ): HTMLElement {
    const heroSectionElement: HTMLElement = document.createElement("section");
    const heroTextColumnElement: HTMLDivElement = document.createElement("div");
    const titleElement: HTMLHeadingElement = document.createElement("h1");
    const viewCountElement: HTMLParagraphElement = document.createElement("p");
    const descriptionElement: HTMLParagraphElement =
      document.createElement("p");
    const metadataRowElement: HTMLDivElement = document.createElement("div");

    heroSectionElement.className = "browse-hero";
    heroTextColumnElement.className = "browse-hero-text";
    titleElement.className = "browse-hero-title";
    viewCountElement.className = "browse-hero-view-count";
    descriptionElement.className = "browse-hero-description";
    metadataRowElement.className = "browse-metadata-row";

    titleElement.textContent = heroContent.title;
    viewCountElement.textContent = heroContent.viewCount;
    descriptionElement.textContent = heroContent.description;

    for (const metadataEntry of heroContent.metadataEntries) {
      metadataRowElement.append(this.createMetadataEntryElement(metadataEntry));
    }

    heroTextColumnElement.append(
      titleElement,
      viewCountElement,
      descriptionElement,
      metadataRowElement,
    );
    heroSectionElement.append(heroTextColumnElement);

    return heroSectionElement;
  }

  /**
   * @brief Create a single ordered hero metadata element
   *
   * @param metadataEntry - Shared metadata entry already ordered by the core adapter
   *
   * @returns DOM element representing the created label or a boxed tag
   */
  private createMetadataEntryElement(
    metadataEntry: BrowseMetadataEntry,
  ): HTMLDivElement {
    if (metadataEntry.kind === "calendar") {
      const calendarItemElement: HTMLDivElement = document.createElement("div");
      const calendarIconElement: HTMLSpanElement =
        document.createElement("span");
      const calendarTextElement: HTMLSpanElement =
        document.createElement("span");

      calendarItemElement.className = "browse-calendar-item";
      calendarIconElement.className = "browse-calendar-icon";
      calendarTextElement.className = "browse-calendar-text";
      calendarTextElement.textContent = metadataEntry.value;
      calendarItemElement.append(calendarIconElement, calendarTextElement);

      return calendarItemElement;
    }

    const tagElement: HTMLDivElement = document.createElement("div");

    tagElement.className = "browse-metadata-tag";
    tagElement.textContent = metadataEntry.value;

    return tagElement;
  }

  /**
   * @brief Create one horizontal browse rail with thumbnail cards
   *
   * @param browseRow - Shared browse row content sourced from the catalog
   *
   * @returns DOM element representing one browse row
   */
  private createBrowseRowElement(
    browseRow: BrowseRowContent,
    rowIndex: number,
  ): HTMLElement {
    const browseRowElement: HTMLElement = document.createElement("section");
    const rowTitleElement: HTMLHeadingElement = document.createElement("h2");
    const rowTrackElement: HTMLDivElement = document.createElement("div");
    const thumbnailCardElements: HTMLElement[] = [];

    browseRowElement.className = "browse-row";
    rowTitleElement.className = "browse-row-title";
    rowTrackElement.className = "browse-row-track";
    rowTitleElement.textContent = browseRow.title;

    for (const [itemIndex, thumbnailContent] of browseRow.items.entries()) {
      const thumbnailCardElement: HTMLElement = this.createThumbnailCardElement(
        thumbnailContent,
        rowIndex,
        itemIndex,
      );

      thumbnailCardElements.push(thumbnailCardElement);
      rowTrackElement.append(thumbnailCardElement);
    }

    this.thumbnailCardElements[rowIndex] = thumbnailCardElements;
    browseRowElement.append(rowTitleElement, rowTrackElement);

    return browseRowElement;
  }

  /**
   * @brief Create one thumbnail card shown inside a browse rail
   *
   * @param thumbnailContent - Shared thumbnail content prepared by the core adapter
   *
   * @returns DOM element representing one thumbnail card
   */
  private createThumbnailCardElement(
    thumbnailContent: BrowseThumbnailContent,
    rowIndex: number,
    itemIndex: number,
  ): HTMLElement {
    const thumbnailCardElement: HTMLElement = document.createElement("article");
    const artworkElement: HTMLDivElement = document.createElement("div");
    const monogramElement: HTMLParagraphElement = document.createElement("p");
    const titleElement: HTMLParagraphElement = document.createElement("p");
    const metaElement: HTMLParagraphElement = document.createElement("p");

    thumbnailCardElement.className = "browse-thumbnail-card";
    artworkElement.className = "browse-thumbnail-artwork";
    titleElement.className = "browse-thumbnail-title";
    metaElement.className = "browse-thumbnail-meta";
    monogramElement.className = "browse-thumbnail-monogram";

    artworkElement.dataset.placeholderKey =
      thumbnailContent.artwork.placeholderKey;
    thumbnailCardElement.dataset.rowIndex = `${rowIndex}`;
    thumbnailCardElement.dataset.itemIndex = `${itemIndex}`;
    monogramElement.textContent = thumbnailContent.artwork.placeholderMonogram;
    titleElement.textContent = thumbnailContent.title;
    metaElement.textContent = thumbnailContent.secondaryText;
    artworkElement.append(monogramElement);
    thumbnailCardElement.append(artworkElement, titleElement, metaElement);

    return thumbnailCardElement;
  }

  /**
   * @brief Create a fullscreen plane that centers a single overlay child
   *
   * @param className - Plane-specific CSS class name
   * @param isAccessible - Whether assistive technology should read this plane
   *
   * @returns DOM element that centers its child across the viewport
   */
  private createOverlayPlaneElement(
    className: string,
    isAccessible: boolean,
  ): HTMLDivElement {
    const overlayPlaneElement: HTMLDivElement = document.createElement("div");

    overlayPlaneElement.className = className;

    if (!isAccessible) {
      overlayPlaneElement.setAttribute("aria-hidden", "true");
    }

    return overlayPlaneElement;
  }
}
