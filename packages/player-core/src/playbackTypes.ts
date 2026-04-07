/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Audio layout metadata for a playback source.
 * The player implementation can use this to describe or select streams.
 */
export type AudioProfile = "stereo" | "5.1" | "7.1" | "atmos";

/**
 * Platform-agnostic media source details shared by both apps.
 * Platform-specific player implementations decide how to consume this.
 */
export type PlaybackSource = {
  url: string;
  mimeType?: string;
  posterUrl?: string;
  audioProfile?: AudioProfile;
};

/**
 * Public playback lifecycle states shared by controllers and observers.
 */
export type PlaybackStatus =
  | "idle"
  | "initializing"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

/**
 * Minimal playback state model shared across app boundaries.
 */
export type PlaybackState = {
  status: PlaybackStatus;
  source: PlaybackSource | null;
  muted: boolean;
  volume: number;
};

/**
 * Shared event names for analytics and lightweight playback observation.
 */
export type PlaybackEventName =
  | "playback_initialized"
  | "playback_loaded"
  | "playback_played"
  | "playback_paused"
  | "playback_volume_changed"
  | "playback_destroyed";

/**
 * Shared payload shapes for playback events.
 */
export type PlaybackEventPayloadMap = {
  playback_initialized: undefined;
  playback_loaded: {
    source: PlaybackSource;
  };
  playback_played: {
    source: PlaybackSource | null;
  };
  playback_paused: {
    source: PlaybackSource | null;
  };
  playback_volume_changed: {
    muted: boolean;
    volume: number;
  };
  playback_destroyed: undefined;
};
