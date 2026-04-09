/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  PlaybackSource,
  PlaybackVisualReadinessController,
} from "@meditation-surf/player-core";

import {
  BrowseContentAdapter,
  type BrowseRowContent,
} from "../browse/BrowseContentAdapter";
import { BrowseFocusController } from "../browse/BrowseFocusController";
import {
  BrowseSelectionController,
  type BrowseSelectionState,
} from "../browse/BrowseSelectionController";
import { Catalog } from "../catalog/Catalog";
import { FixtureCatalog } from "../catalog/FixtureCatalog";
import type { MediaItem } from "../catalog/MediaItem";
import { MeditationExperience } from "../experience/MeditationExperience";
import { AppLayout } from "../layout/AppLayout";
import { BackgroundLayerLayout } from "../layout/BackgroundLayerLayout";
import {
  CenteredOverlayLayout,
  DEMO_CENTERED_OVERLAY_LAYOUT,
} from "../layout/CenteredOverlayLayout";
import { ForegroundLayerLayout } from "../layout/ForegroundLayerLayout";
import type { MediaIntent } from "../media/MediaIntent";
import { MediaKernelController } from "../media/MediaKernelController";
import type { MediaSourceDescriptor } from "../media/MediaSourceDescriptor";
import type { MediaSourceKind } from "../media/MediaSourceKind";
import { BackgroundVideoModel } from "../playback/BackgroundVideoModel";
import { DemoBackgroundVideo } from "../playback/DemoBackgroundVideo";
import {
  PlaybackSequenceController,
  type PlaybackSequenceState,
} from "../playback/PlaybackSequenceController";
import { OverlayController } from "../ui/OverlayController";
import { OverlayRevealHandoffController } from "../ui/OverlayRevealHandoffController";

/**
 * @brief Factory that assembles the current demo meditation experience
 *
 * The factory keeps demo assembly logic in one place so apps can consume a
 * single coherent product model instead of rebuilding the same structure.
 */
export class DemoExperienceFactory {
  /**
   * @brief Build the canonical demo experience
   *
   * @returns Shared demo experience with background video and foreground UI
   */
  public static create(): MeditationExperience {
    const backgroundVideo: BackgroundVideoModel = DemoBackgroundVideo.create();
    const centeredOverlayLayout: CenteredOverlayLayout =
      DEMO_CENTERED_OVERLAY_LAYOUT;
    const appLayout: AppLayout = new AppLayout(
      new BackgroundLayerLayout(backgroundVideo),
      new ForegroundLayerLayout(centeredOverlayLayout),
    );
    const catalog: Catalog = FixtureCatalog.getCatalog();
    const browseContentAdapter: BrowseContentAdapter = new BrowseContentAdapter(
      catalog,
    );
    const overlayController: OverlayController = new OverlayController();
    const playbackVisualReadinessController: PlaybackVisualReadinessController =
      new PlaybackVisualReadinessController();
    const overlayRevealHandoffController: OverlayRevealHandoffController =
      new OverlayRevealHandoffController(
        overlayController,
        playbackVisualReadinessController,
      );
    const playbackSequenceController: PlaybackSequenceController =
      new PlaybackSequenceController(catalog);
    const initialRowItemCounts: number[] = browseContentAdapter
      .getBrowseScreenContent(playbackSequenceController.getActiveItem())
      .rows.map(
        (browseRow: BrowseRowContent): number => browseRow.items.length,
      );
    const browseFocusController: BrowseFocusController =
      new BrowseFocusController(initialRowItemCounts);
    const browseSelectionController: BrowseSelectionController =
      new BrowseSelectionController(initialRowItemCounts);
    const mediaKernelController: MediaKernelController =
      new MediaKernelController();

    mediaKernelController.setCurrentIntent(
      this.createBackgroundIntent(playbackSequenceController.getActiveItem()),
    );

    browseSelectionController.subscribe(
      (browseSelectionState: BrowseSelectionState): void => {
        if (!browseSelectionState.hasSelectedItem) {
          return;
        }

        const selectedItem: MediaItem | null =
          browseContentAdapter.getMediaItemAt(
            browseSelectionState.selectedRowIndex,
            browseSelectionState.selectedItemIndex,
          );

        if (selectedItem === null) {
          return;
        }

        playbackSequenceController.setActiveItem(selectedItem);
      },
    );
    playbackSequenceController.subscribe(
      (playbackSequenceState: PlaybackSequenceState): void => {
        mediaKernelController.setCurrentIntent(
          this.createBackgroundIntent(playbackSequenceState.activeItem),
        );
      },
    );

    return new MeditationExperience(
      appLayout,
      browseFocusController,
      browseSelectionController,
      catalog,
      mediaKernelController,
      overlayController,
      overlayRevealHandoffController,
      playbackVisualReadinessController,
      playbackSequenceController,
    );
  }

  /**
   * @brief Create the shared background playback intent for the active item
   *
   * @param mediaItem - Active media item chosen by the shared playback sequence
   *
   * @returns Shared runtime-agnostic background media intent
   */
  private static createBackgroundIntent(
    mediaItem: MediaItem | null,
  ): MediaIntent | null {
    if (mediaItem === null) {
      return null;
    }

    return {
      itemId: mediaItem.id,
      role: "background",
      source: this.createMediaSourceDescriptor(mediaItem),
      preferredPlaybackLane: null,
      preferredRendererKind: null,
      targetWarmth: "active",
    };
  }

  /**
   * @brief Translate shared playback metadata into a media source descriptor
   *
   * @param mediaItem - Media item whose shared playback source should be described
   *
   * @returns Shared media source descriptor for future orchestration phases
   */
  private static createMediaSourceDescriptor(
    mediaItem: MediaItem,
  ): MediaSourceDescriptor {
    const playbackSource: PlaybackSource = mediaItem.getPlaybackSource();

    return {
      kind: this.inferMediaSourceKind(
        playbackSource.url,
        playbackSource.mimeType ?? null,
      ),
      url: playbackSource.url,
      mimeType: playbackSource.mimeType ?? null,
      posterUrl: playbackSource.posterUrl ?? null,
    };
  }

  /**
   * @brief Infer a high-level source kind from stable playback metadata
   *
   * @param url - Shared playback URL
   * @param mimeType - Optional explicit playback MIME type
   *
   * @returns Best-effort shared source kind for the playback source
   */
  private static inferMediaSourceKind(
    url: string,
    mimeType: string | null,
  ): MediaSourceKind {
    const normalizedUrl: string = url.toLowerCase();
    const normalizedMimeType: string = (mimeType ?? "").toLowerCase();

    if (
      normalizedMimeType.includes("mpegurl") ||
      normalizedMimeType.includes("application/vnd.apple.mpegurl") ||
      normalizedUrl.endsWith(".m3u8")
    ) {
      return "hls";
    }

    if (normalizedMimeType.includes("mp4") || normalizedUrl.endsWith(".mp4")) {
      return "mp4";
    }

    if (
      normalizedMimeType.includes("bittorrent") ||
      normalizedUrl.startsWith("magnet:") ||
      normalizedUrl.endsWith(".torrent")
    ) {
      return "torrent";
    }

    return "unknown";
  }
}
