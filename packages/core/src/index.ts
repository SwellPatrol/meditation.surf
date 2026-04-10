/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { DemoExperienceFactory } from "./bootstrap/DemoExperienceFactory";
export { MeditationExperience } from "./experience/MeditationExperience";
export {
  CapabilityOracle,
  CommittedPlaybackChooser,
  FocusDelayController,
  MediaExecutionController,
  MediaKernelController,
  MediaKernelExperienceBridge,
  MediaThumbnailController,
  MediaSessionPlanner,
  VariantPolicy,
  type AudioActivationMode,
  type AppMediaCapabilities,
  type CapabilityDecision,
  type CapabilityDecisionReason,
  type CapabilityProbeResult,
  type CommittedPlaybackChooserInput,
  type CommittedPlaybackDecision,
  type CommittedPlaybackDecisionReason,
  type CommittedPlaybackIntent,
  type CommittedPlaybackLanePreference,
  type CommittedPlaybackLifecycleState,
  type CommittedPlaybackMode,
  type CommittedPlaybackSnapshot,
  type FocusDelayState,
  type FocusDelayStateListener,
  type MediaExecutionCommand,
  type MediaExecutionCommandType,
  type MediaExecutionResult,
  type MediaExecutionSnapshot,
  type MediaExecutionState,
  type MediaExecutionStateListener,
  type MediaBrowseContentResolver,
  type MediaBrowseFocusController,
  type MediaBrowseFocusState,
  type MediaBrowseSelectionController,
  type MediaBrowseSelectionState,
  type MediaCapabilityProfile,
  type MediaIntent,
  type MediaIntentType,
  type MediaKernelItem,
  type MediaKernelState,
  type MediaKernelStateListener,
  type MediaPlan,
  type MediaPlanReason,
  type MediaPlanSession,
  type MediaPlaybackLane,
  type MediaPlaybackSequenceController,
  type MediaPlaybackSequenceState,
  type MediaRoleCapabilityRequest,
  type MediaRoleCapabilitySnapshot,
  type MediaRendererKind,
  type MediaRuntimeAdapter,
  type MediaRuntimeCapabilities,
  type MediaRuntimeSupportLevel,
  type MediaRuntimeSessionHandle,
  type MediaSessionDescriptor,
  type MediaSessionPlannerInput,
  type MediaSessionPriority,
  type MediaSessionRole,
  type MediaSessionSnapshot,
  type MediaSessionState,
  type MediaSessionVisibility,
  type MediaSourceDescriptor,
  type MediaSourceKind,
  type MediaSourcePlaybackSource,
  type MediaThumbnailCacheEntry,
  type MediaThumbnailDescriptor,
  type MediaThumbnailExtractionPolicy,
  type MediaThumbnailExtractionStrategy,
  type MediaThumbnailPriority,
  type MediaThumbnailQuality,
  type MediaThumbnailRequest,
  type MediaThumbnailResult,
  type MediaThumbnailRuntimeAdapter,
  type MediaThumbnailRuntimeCapabilities,
  type MediaThumbnailSnapshot,
  type MediaThumbnailSnapshotListener,
  type MediaThumbnailState,
  type PreviewCandidate,
  type PreviewCandidateInput,
  type PreviewCandidateScore,
  type PreviewEvictionReason,
  type PreviewFarmState,
  type PreviewSchedulerBudget,
  type PreviewSchedulerDecision,
  type PreviewSchedulerDecisionReason,
  type PreviewSessionAssignment,
  type PreviewWarmState,
  type VariantQualityTier,
  type VariantRolePolicy,
  type VariantSelectionDecision,
  type VariantSelectionReason,
  type VariantSelectionRequest,
  type MediaWarmth,
} from "@meditation-surf/media";
export { MediaSourceDescriptorFactory } from "./catalog/MediaSourceDescriptorFactory";
export { AppLayout } from "./layout/AppLayout";
export { BackgroundLayerLayout } from "./layout/BackgroundLayerLayout";
export {
  CenteredOverlayLayout,
  DEMO_CENTERED_OVERLAY_LAYOUT,
  type CenteredOverlayPlacement,
  type CenteredOverlaySize,
} from "./layout/CenteredOverlayLayout";
export { ForegroundLayerLayout } from "./layout/ForegroundLayerLayout";
export {
  BackgroundVideoModel,
  type BackgroundVideoPlaybackPolicy,
} from "./playback/BackgroundVideoModel";
export {
  PlaybackSequenceController,
  type PlaybackSequenceListener,
  type PlaybackSequenceState,
} from "./playback/PlaybackSequenceController";
export {
  OverlayController,
  type OverlayConfig,
  type OverlayEventType,
  type OverlayState,
  type OverlayStateListener,
  type OverlayVisibility,
} from "./ui/OverlayController";
export { OverlayRevealHandoffController } from "./ui/OverlayRevealHandoffController";
export { ForegroundUiElement } from "./ui/ForegroundUiElement";
export type {
  ForegroundUiElementPlacement,
  ForegroundUiElementSize,
} from "./ui/ForegroundUiElement";
export { ForegroundUiModel } from "./ui/ForegroundUiModel";
export type { ICatalogClient } from "./api/ICatalogClient";
export {
  AppLaunchedAnalyticsEvent,
  type AppLaunchedAnalyticsEventApp,
  type AppLaunchedAnalyticsEventPayload,
} from "./analytics/AppLaunchedAnalyticsEvent";
export {
  AudioPreferencesChangedAnalyticsEvent,
  type AudioPreferencesChangedAnalyticsEventPayload,
} from "./analytics/AudioPreferencesChangedAnalyticsEvent";
export {
  CatalogLoadedAnalyticsEvent,
  type CatalogLoadedAnalyticsEventPayload,
} from "./analytics/CatalogLoadedAnalyticsEvent";
export type { IAnalyticsEvent } from "./analytics/IAnalyticsEvent";
export {
  PlaybackStartedAnalyticsEvent,
  type PlaybackStartedAnalyticsEventPayload,
} from "./analytics/PlaybackStartedAnalyticsEvent";
export {
  BrowseContentAdapter,
  type BrowseArtworkContent,
  type BrowseHeroContent,
  type BrowseMetadataEntry,
  type BrowseRowContent,
  type BrowseScreenContent,
  type BrowseThumbnailContent,
} from "./browse/BrowseContentAdapter";
export {
  BrowseFocusController,
  type BrowseFocusState,
  type BrowseFocusStateListener,
} from "./browse/BrowseFocusController";
export {
  BrowseSelectionController,
  type BrowseSelectionState,
  type BrowseSelectionStateListener,
} from "./browse/BrowseSelectionController";
export {
  BrowseInteractionController,
  type BrowseInputMode,
  type BrowseInputModeListener,
} from "./input/BrowseInteractionController";
export {
  type BrowseActivateItemInputIntent,
  type BrowseActivateFocusedItemInputIntent,
  type BrowseDirectionalInputIntent,
  type BrowseFocusItemInputIntent,
  type BrowseInputCommand,
  type BrowseInputIntent,
  type BrowseInputIntentType,
  type BrowseModeInputIntent,
} from "./input/BrowseInputIntent";
export { Catalog } from "./catalog/Catalog";
export { CatalogSection } from "./catalog/CatalogSection";
export { FixtureCatalog } from "./catalog/FixtureCatalog";
export { MediaItem } from "./catalog/MediaItem";
export {
  MediaItemMetadata,
  type MediaItemMetadataInit,
  type MediaItemMetadataRow,
  type MediaItemMetadataTag,
} from "./catalog/MediaItemMetadata";
export {
  AudioPreferences,
  type AudioPreferencesInit,
} from "./preferences/AudioPreferences";
export type { IAudioPreferencesStorage } from "./preferences/IAudioPreferencesStorage";
export { BrowserAudioPreferencesStorage } from "./preferences/BrowserAudioPreferencesStorage";
