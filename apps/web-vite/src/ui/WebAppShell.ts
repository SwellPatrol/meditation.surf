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
  MediaThumbnailCacheEntry,
  MediaThumbnailSnapshot,
} from "@meditation-surf/core";

import { WebAppLayoutController } from "../layout/WebAppLayoutController";
import {
  type WebPreviewSurfaceEntry,
  WebPreviewSurfaceRegistry,
} from "../media/WebPreviewSurfaceRegistry";

type WebThumbnailCardBinding = {
  itemId: string;
  cardElement: HTMLElement;
  artworkElement: HTMLDivElement;
  stillImageElement: HTMLImageElement;
  previewHostElement: HTMLDivElement;
};

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
  private readonly previewSurfaceRegistry: WebPreviewSurfaceRegistry;
  private previewSurfaceEntries: WebPreviewSurfaceEntry[];
  private thumbnailCardBindingsByItemId: Map<string, WebThumbnailCardBinding[]>;
  private thumbnailCardElements: HTMLElement[][];
  private thumbnailSnapshot: MediaThumbnailSnapshot;

  /**
   * @brief Build the DOM shell for the web app
   *
   * @param appLayoutController - Runtime adapter for the shared app layout
   * @param browseContent - Shared browse content rendered in the overlay UI plane
   */
  public constructor(
    appLayoutController: WebAppLayoutController,
    browseContent: BrowseScreenContent,
    previewSurfaceRegistry: WebPreviewSurfaceRegistry,
    thumbnailSnapshot: MediaThumbnailSnapshot,
  ) {
    this.browseFocusState = {
      activeRowIndex: 0,
      activeItemIndexByRow: [],
      hasFocusedItem: false,
    };
    this.previewSurfaceRegistry = previewSurfaceRegistry;
    this.previewSurfaceEntries = [];
    this.thumbnailCardBindingsByItemId = new Map<
      string,
      WebThumbnailCardBinding[]
    >();
    this.thumbnailCardElements = [];
    this.thumbnailSnapshot = thumbnailSnapshot;
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
    this.previewSurfaceEntries = [];
    this.thumbnailCardBindingsByItemId.clear();
    this.overlayUiElement.replaceChildren(
      this.createBrowseOverlayElement(browseContent),
    );
    this.renderBrowseFocusState(this.browseFocusState);
    this.renderThumbnailSnapshot(this.thumbnailSnapshot);
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
      hasFocusedItem: browseFocusState.hasFocusedItem,
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
          this.browseFocusState.hasFocusedItem &&
          rowIndex === this.browseFocusState.activeRowIndex &&
          itemIndex === activeItemIndex;

        thumbnailCardElement.classList.toggle("is-focused", isFocused);
      }
    }

    this.previewSurfaceRegistry.replaceEntries(this.previewSurfaceEntries);
  }

  /**
   * @brief Apply browse input-mode styling to the web app shell
   *
   * @param inputMode - Surface-local browse input mode
   */
  public renderInputMode(inputMode: BrowseInputMode): void {
    this.mountElement.classList.toggle(
      "is-keyboard-mode",
      inputMode === "directional",
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
   * @brief Apply the latest shared thumbnail snapshot to the rendered cards
   *
   * @param thumbnailSnapshot - Shared thumbnail state published by the media controller
   */
  public renderThumbnailSnapshot(
    thumbnailSnapshot: MediaThumbnailSnapshot,
  ): void {
    this.thumbnailSnapshot = {
      entries: thumbnailSnapshot.entries.map(
        (
          thumbnailEntry: MediaThumbnailCacheEntry,
        ): MediaThumbnailCacheEntry => ({
          descriptor: {
            itemIds: [...thumbnailEntry.descriptor.itemIds],
            sourceId: thumbnailEntry.descriptor.sourceId,
            sourceDescriptor: {
              sourceId: thumbnailEntry.descriptor.sourceDescriptor.sourceId,
              kind: thumbnailEntry.descriptor.sourceDescriptor.kind,
              url: thumbnailEntry.descriptor.sourceDescriptor.url,
              mimeType: thumbnailEntry.descriptor.sourceDescriptor.mimeType,
              posterUrl: thumbnailEntry.descriptor.sourceDescriptor.posterUrl,
            },
          },
          state: thumbnailEntry.state,
          request:
            thumbnailEntry.request === null
              ? null
              : {
                  descriptor: {
                    itemIds: [...thumbnailEntry.request.descriptor.itemIds],
                    sourceId: thumbnailEntry.request.descriptor.sourceId,
                    sourceDescriptor: {
                      sourceId:
                        thumbnailEntry.request.descriptor.sourceDescriptor
                          .sourceId,
                      kind: thumbnailEntry.request.descriptor.sourceDescriptor
                        .kind,
                      url: thumbnailEntry.request.descriptor.sourceDescriptor
                        .url,
                      mimeType:
                        thumbnailEntry.request.descriptor.sourceDescriptor
                          .mimeType,
                      posterUrl:
                        thumbnailEntry.request.descriptor.sourceDescriptor
                          .posterUrl,
                    },
                  },
                  sourceDescriptor: {
                    sourceId: thumbnailEntry.request.sourceDescriptor.sourceId,
                    kind: thumbnailEntry.request.sourceDescriptor.kind,
                    url: thumbnailEntry.request.sourceDescriptor.url,
                    mimeType: thumbnailEntry.request.sourceDescriptor.mimeType,
                    posterUrl:
                      thumbnailEntry.request.sourceDescriptor.posterUrl,
                  },
                  sourceId: thumbnailEntry.request.sourceId,
                  priorityHint: thumbnailEntry.request.priorityHint,
                  qualityHint: thumbnailEntry.request.qualityHint,
                  targetWidth: thumbnailEntry.request.targetWidth,
                  targetHeight: thumbnailEntry.request.targetHeight,
                  timeHintMs: thumbnailEntry.request.timeHintMs,
                  variantSelection: {
                    role: thumbnailEntry.request.variantSelection.role,
                    desiredQualityTier:
                      thumbnailEntry.request.variantSelection
                        .desiredQualityTier,
                    preferStartupLatency:
                      thumbnailEntry.request.variantSelection
                        .preferStartupLatency,
                    preferImageQuality:
                      thumbnailEntry.request.variantSelection
                        .preferImageQuality,
                    preferPremiumPlayback:
                      thumbnailEntry.request.variantSelection
                        .preferPremiumPlayback,
                    maxWidth: thumbnailEntry.request.variantSelection.maxWidth,
                    maxHeight:
                      thumbnailEntry.request.variantSelection.maxHeight,
                    maxBandwidth:
                      thumbnailEntry.request.variantSelection.maxBandwidth,
                    reasons: [
                      ...thumbnailEntry.request.variantSelection.reasons,
                    ],
                    notes: [...thumbnailEntry.request.variantSelection.notes],
                  },
                  extractionPolicy: {
                    strategy: thumbnailEntry.request.extractionPolicy.strategy,
                    quality: thumbnailEntry.request.extractionPolicy.quality,
                    timeoutMs:
                      thumbnailEntry.request.extractionPolicy.timeoutMs,
                    targetWidth:
                      thumbnailEntry.request.extractionPolicy.targetWidth,
                    targetHeight:
                      thumbnailEntry.request.extractionPolicy.targetHeight,
                  },
                },
          result:
            thumbnailEntry.result === null
              ? null
              : {
                  sourceId: thumbnailEntry.result.sourceId,
                  imageUrl: thumbnailEntry.result.imageUrl,
                  width: thumbnailEntry.result.width,
                  height: thumbnailEntry.result.height,
                  frameTimeMs: thumbnailEntry.result.frameTimeMs,
                  extractedAt: thumbnailEntry.result.extractedAt,
                  wasApproximate: thumbnailEntry.result.wasApproximate,
                },
          failureReason: thumbnailEntry.failureReason,
          isRelevant: thumbnailEntry.isRelevant,
          lastRequestedAt: thumbnailEntry.lastRequestedAt,
          lastUpdatedAt: thumbnailEntry.lastUpdatedAt,
        }),
      ),
      requestedSourceIds: [...thumbnailSnapshot.requestedSourceIds],
      cachedSourceIds: [...thumbnailSnapshot.cachedSourceIds],
      readySourceIds: [...thumbnailSnapshot.readySourceIds],
      failedSourceIds: [...thumbnailSnapshot.failedSourceIds],
      unsupportedSourceIds: [...thumbnailSnapshot.unsupportedSourceIds],
    };

    for (const [itemId, thumbnailBindings] of this
      .thumbnailCardBindingsByItemId) {
      const thumbnailEntry: MediaThumbnailCacheEntry | null =
        this.findThumbnailEntryForItemId(itemId);

      for (const thumbnailBinding of thumbnailBindings) {
        this.applyThumbnailEntry(thumbnailBinding, thumbnailEntry);
      }
    }
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
    const stillImageElement: HTMLImageElement = document.createElement("img");
    const previewHostElement: HTMLDivElement = document.createElement("div");
    const monogramElement: HTMLParagraphElement = document.createElement("p");
    const titleElement: HTMLParagraphElement = document.createElement("p");
    const metaElement: HTMLParagraphElement = document.createElement("p");
    const thumbnailBindings: WebThumbnailCardBinding[] =
      this.thumbnailCardBindingsByItemId.get(thumbnailContent.id) ?? [];

    thumbnailCardElement.className = "browse-thumbnail-card";
    artworkElement.className = "browse-thumbnail-artwork";
    stillImageElement.className = "browse-thumbnail-still";
    previewHostElement.className = "browse-thumbnail-preview-slot";
    titleElement.className = "browse-thumbnail-title";
    metaElement.className = "browse-thumbnail-meta";
    monogramElement.className = "browse-thumbnail-monogram";

    artworkElement.dataset.placeholderKey =
      thumbnailContent.artwork.placeholderKey;
    stillImageElement.alt = `${thumbnailContent.title} still`;
    previewHostElement.dataset.itemId = thumbnailContent.id;
    thumbnailCardElement.dataset.rowIndex = `${rowIndex}`;
    thumbnailCardElement.dataset.itemIndex = `${itemIndex}`;
    thumbnailCardElement.dataset.thumbnailItemId = thumbnailContent.id;
    thumbnailCardElement.dataset.thumbnailVisualState = "fallback";
    monogramElement.textContent = thumbnailContent.artwork.placeholderMonogram;
    titleElement.textContent = thumbnailContent.title;
    metaElement.textContent = thumbnailContent.secondaryText;
    artworkElement.append(
      stillImageElement,
      previewHostElement,
      monogramElement,
    );
    thumbnailCardElement.append(artworkElement, titleElement, metaElement);
    this.previewSurfaceEntries.push({
      itemId: thumbnailContent.id,
      hostElement: previewHostElement,
    });
    thumbnailBindings.push({
      itemId: thumbnailContent.id,
      cardElement: thumbnailCardElement,
      artworkElement,
      stillImageElement,
      previewHostElement,
    });
    this.thumbnailCardBindingsByItemId.set(
      thumbnailContent.id,
      thumbnailBindings,
    );
    this.applyThumbnailEntry(
      thumbnailBindings[thumbnailBindings.length - 1]!,
      this.findThumbnailEntryForItemId(thumbnailContent.id),
    );

    return thumbnailCardElement;
  }

  /**
   * @brief Resolve one thumbnail cache entry by browse item identifier
   *
   * @param itemId - Stable browse item identifier
   *
   * @returns Matching cache entry, or `null` when the item has no still yet
   */
  private findThumbnailEntryForItemId(
    itemId: string,
  ): MediaThumbnailCacheEntry | null {
    for (const thumbnailEntry of this.thumbnailSnapshot.entries) {
      if (thumbnailEntry.descriptor.itemIds.includes(itemId)) {
        return thumbnailEntry;
      }
    }

    return null;
  }

  /**
   * @brief Apply one thumbnail cache entry to a rendered card binding
   *
   * @param thumbnailBinding - Rendered card DOM binding
   * @param thumbnailEntry - Current shared thumbnail cache entry for the item
   */
  private applyThumbnailEntry(
    thumbnailBinding: WebThumbnailCardBinding,
    thumbnailEntry: MediaThumbnailCacheEntry | null,
  ): void {
    const readyThumbnailResult = thumbnailEntry?.result ?? null;
    const hasReadyStill: boolean =
      thumbnailEntry?.state === "ready" && readyThumbnailResult !== null;
    const isPreviewActive: boolean =
      thumbnailBinding.previewHostElement.classList.contains("is-active");

    thumbnailBinding.cardElement.dataset.thumbnailState =
      thumbnailEntry?.state ?? "idle";
    thumbnailBinding.cardElement.dataset.thumbnailSourceId =
      thumbnailEntry?.descriptor.sourceId ?? "";

    if (hasReadyStill && readyThumbnailResult !== null) {
      if (
        thumbnailBinding.stillImageElement.getAttribute("src") !==
        readyThumbnailResult.imageUrl
      ) {
        thumbnailBinding.stillImageElement.src = readyThumbnailResult.imageUrl;
      }

      thumbnailBinding.stillImageElement.classList.add("is-ready");
      thumbnailBinding.artworkElement.classList.add("has-still");
    } else {
      thumbnailBinding.stillImageElement.removeAttribute("src");
      thumbnailBinding.stillImageElement.classList.remove("is-ready");
      thumbnailBinding.artworkElement.classList.remove("has-still");
    }

    thumbnailBinding.cardElement.dataset.thumbnailVisualState = isPreviewActive
      ? "preview"
      : hasReadyStill
        ? "still"
        : "fallback";
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
