/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  MediaThumbnailCandidateFrame,
  MediaThumbnailExtractionAttempt,
  MediaThumbnailExtractionResult,
  MediaThumbnailRequest,
  MediaThumbnailRuntimeAdapter,
  MediaThumbnailRuntimeCapabilities,
  MediaThumbnailSelectionDecision,
  MediaThumbnailSelectionReason,
} from "@meditation-surf/core";
import { MediaThumbnailFrameSelector } from "@meditation-surf/core";
import { VfsController } from "@meditation-surf/vfs";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;
type WebFrameAnalysis = {
  averageLuma: number;
  darkestSampleLuma: number;
  brightestSampleLuma: number;
  darkPixelRatio: number;
};

/**
 * @brief Real web thumbnail extraction adapter backed by hidden media elements
 *
 * The implementation intentionally stays practical for this phase: one hidden
 * extraction path, bounded first-non-black inspection, optional time-hint
 * seeking, and raw image payloads that the shared VFS layer can persist and
 * lease.
 */
export class WebMediaThumbnailRuntimeAdapter implements MediaThumbnailRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "web-vite-thumbnail";

  private static readonly CAPABILITIES: MediaThumbnailRuntimeCapabilities = {
    canExtractFirstFrame: true,
    canExtractNonBlackFrame: true,
    canExtractFromHiddenMedia: true,
    canCacheObjectUrls: false,
    canPrioritizeFocusedItem: true,
  };

  public readonly runtimeId: string;

  private analysisCanvasElement: HTMLCanvasElement | null;
  private extractionCanvasElement: HTMLCanvasElement | null;
  private extractionRootElement: HTMLDivElement | null;
  private extractionVideoElement: HTMLVideoElement | null;
  private shakaPlayer: ShakaPlayer | null;
  private readonly vfsController: VfsController | null;

  /**
   * @brief Create the reusable web thumbnail extraction adapter
   *
   * @param vfsController - Optional VFS controller used for startup warming
   */
  public constructor(vfsController: VfsController | null = null) {
    this.runtimeId = WebMediaThumbnailRuntimeAdapter.RUNTIME_ID;
    this.analysisCanvasElement = null;
    this.extractionCanvasElement = null;
    this.extractionRootElement = null;
    this.extractionVideoElement = null;
    this.shakaPlayer = null;
    this.vfsController = vfsController;
  }

  /**
   * @brief Report the web thumbnail extraction features available right now
   *
   * @returns Web thumbnail runtime capability snapshot
   */
  public getCapabilities(): MediaThumbnailRuntimeCapabilities {
    return {
      ...WebMediaThumbnailRuntimeAdapter.CAPABILITIES,
    };
  }

  /**
   * @brief Extract one still thumbnail from the supplied media source
   *
   * @param request - Shared thumbnail request emitted by the media controller
   *
   * @returns Extracted still image that the web shell can render directly
   */
  public async extractThumbnail(
    request: MediaThumbnailRequest,
  ): Promise<MediaThumbnailExtractionResult> {
    const videoElement: HTMLVideoElement = this.ensureExtractionVideoElement();
    const analysisCanvasElement: HTMLCanvasElement =
      this.ensureAnalysisCanvasElement();
    const canvasElement: HTMLCanvasElement =
      this.ensureExtractionCanvasElement();
    const extractionStartedAt: number = Date.now();

    try {
      await this.warmStartupArtifacts(request);
      await this.loadRequestSource(request, videoElement, extractionStartedAt);
      const candidateFrames: MediaThumbnailCandidateFrame[] =
        await this.collectCandidateFrames(
          request,
          videoElement,
          analysisCanvasElement,
          extractionStartedAt,
        );
      const selectionDecision: MediaThumbnailSelectionDecision =
        MediaThumbnailFrameSelector.selectCandidateFrame(
          request.extractionPolicy,
          candidateFrames,
        );

      return await this.captureSelectedFrame(
        request,
        videoElement,
        canvasElement,
        selectionDecision,
        extractionStartedAt,
      );
    } finally {
      await this.resetExtractionPath();
    }
  }

  /**
   * @brief Ensure one hidden extraction root exists in the current document
   *
   * @returns Hidden DOM node that owns reusable extraction elements
   */
  private ensureExtractionRootElement(): HTMLDivElement {
    if (this.extractionRootElement !== null) {
      return this.extractionRootElement;
    }

    const extractionRootElement: HTMLDivElement = document.createElement("div");

    extractionRootElement.setAttribute("aria-hidden", "true");
    extractionRootElement.style.height = "1px";
    extractionRootElement.style.left = "-10000px";
    extractionRootElement.style.overflow = "hidden";
    extractionRootElement.style.pointerEvents = "none";
    extractionRootElement.style.position = "fixed";
    extractionRootElement.style.top = "0";
    extractionRootElement.style.width = "1px";
    extractionRootElement.style.opacity = "0";
    document.body.append(extractionRootElement);
    this.extractionRootElement = extractionRootElement;

    return extractionRootElement;
  }

  /**
   * @brief Ensure one reusable hidden video element exists for extraction work
   *
   * @returns Hidden video element used to decode still frames
   */
  private ensureExtractionVideoElement(): HTMLVideoElement {
    if (this.extractionVideoElement !== null) {
      return this.extractionVideoElement;
    }

    const videoElement: HTMLVideoElement = document.createElement("video");
    const extractionRootElement: HTMLDivElement =
      this.ensureExtractionRootElement();

    videoElement.autoplay = false;
    videoElement.controls = false;
    videoElement.crossOrigin = "anonymous";
    videoElement.defaultMuted = true;
    videoElement.disablePictureInPicture = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.preload = "auto";
    videoElement.setAttribute("aria-hidden", "true");
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("muted", "");
    videoElement.setAttribute("playsinline", "");
    extractionRootElement.append(videoElement);
    this.extractionVideoElement = videoElement;

    return videoElement;
  }

  /**
   * @brief Ensure one reusable canvas exists for frame capture
   *
   * @returns Canvas element used to serialize still images
   */
  private ensureExtractionCanvasElement(): HTMLCanvasElement {
    if (this.extractionCanvasElement !== null) {
      return this.extractionCanvasElement;
    }

    const canvasElement: HTMLCanvasElement = document.createElement("canvas");

    this.extractionCanvasElement = canvasElement;

    return canvasElement;
  }

  /**
   * @brief Ensure one reusable analysis canvas exists for luma inspection
   *
   * @returns Canvas element used for bounded candidate-frame analysis
   */
  private ensureAnalysisCanvasElement(): HTMLCanvasElement {
    if (this.analysisCanvasElement !== null) {
      return this.analysisCanvasElement;
    }

    const analysisCanvasElement: HTMLCanvasElement =
      document.createElement("canvas");

    this.analysisCanvasElement = analysisCanvasElement;

    return analysisCanvasElement;
  }

  /**
   * @brief Load the request source through native playback or Shaka
   *
   * @param request - Shared request being loaded
   * @param videoElement - Hidden video element used for decoding
   */
  private async loadRequestSource(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
    extractionStartedAt: number,
  ): Promise<void> {
    const sourceDescriptor = request.sourceDescriptor;
    const playbackMimeType: string =
      sourceDescriptor.mimeType ?? "application/x-mpegURL";
    const canUseNativePlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";
    const loadPromise: Promise<void> = this.waitForLoadedData(videoElement);
    videoElement.poster = sourceDescriptor.posterUrl ?? "";

    if (canUseNativePlayback) {
      videoElement.src = sourceDescriptor.url;
      videoElement.load();
      await this.withRemainingTimeout(
        loadPromise,
        request.extractionPolicy.timeoutMs,
        extractionStartedAt,
      );
      return;
    }

    const shakaModule: { default: ShakaModule } =
      await import("shaka-player/dist/shaka-player.compiled.js");
    const shaka: ShakaModule = shakaModule.default;

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      throw new Error("Shaka Player is not supported in this browser.");
    }

    const shakaPlayer: ShakaPlayer = new shaka.Player(videoElement);

    this.shakaPlayer = shakaPlayer;
    await this.withRemainingTimeout(
      shakaPlayer.load(sourceDescriptor.url),
      request.extractionPolicy.timeoutMs,
      extractionStartedAt,
    );
    await this.withRemainingTimeout(
      loadPromise,
      request.extractionPolicy.timeoutMs,
      extractionStartedAt,
    );
  }

  /**
   * @brief Inspect a bounded set of candidate frames for the current request
   *
   * @param request - Shared request emitted by the thumbnail controller
   * @param videoElement - Hidden video element used for decoding
   * @param analysisCanvasElement - Reusable canvas used for luma analysis
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   *
   * @returns Candidate frames prepared for shared selection logic
   */
  private async collectCandidateFrames(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
    analysisCanvasElement: HTMLCanvasElement,
    extractionStartedAt: number,
  ): Promise<MediaThumbnailCandidateFrame[]> {
    const candidateFrameTimesMs: number[] =
      MediaThumbnailFrameSelector.createCandidateFrameTimes(
        request.extractionPolicy,
        request.timeHintMs,
      );
    const boundedCandidateFrameTimesMs: number[] = candidateFrameTimesMs.slice(
      0,
      request.extractionPolicy.maxAttemptCount,
    );
    const candidateFrames: MediaThumbnailCandidateFrame[] = [];

    for (const [
      attemptIndex,
      candidateFrameTimeMs,
    ] of boundedCandidateFrameTimesMs.entries()) {
      const candidateFrame: MediaThumbnailCandidateFrame =
        await this.inspectCandidateFrame(
          request,
          videoElement,
          analysisCanvasElement,
          candidateFrameTimeMs,
          attemptIndex,
          extractionStartedAt,
        );

      candidateFrames.push(candidateFrame);

      if (candidateFrame.rejectionReason === "timeout") {
        break;
      }
    }

    return candidateFrames;
  }

  /**
   * @brief Inspect one candidate frame at a requested time
   *
   * @param request - Shared request emitted by the thumbnail controller
   * @param videoElement - Hidden video element used for decoding
   * @param analysisCanvasElement - Reusable canvas used for luma analysis
   * @param candidateFrameTimeMs - Candidate frame time being inspected
   * @param attemptIndex - Stable attempt index within the bounded candidate set
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   *
   * @returns Shared candidate-frame description for selection logic
   */
  private async inspectCandidateFrame(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
    analysisCanvasElement: HTMLCanvasElement,
    candidateFrameTimeMs: number,
    attemptIndex: number,
    extractionStartedAt: number,
  ): Promise<MediaThumbnailCandidateFrame> {
    try {
      await this.seekToFrameTime(
        videoElement,
        candidateFrameTimeMs,
        request.extractionPolicy.timeoutMs,
        extractionStartedAt,
      );

      const frameAnalysis: WebFrameAnalysis = this.analyzeCurrentFrame(
        videoElement,
        analysisCanvasElement,
      );

      return {
        attemptIndex,
        frameTimeMs: Math.round(videoElement.currentTime * 1000),
        averageLuma: frameAnalysis.averageLuma,
        darkestSampleLuma: frameAnalysis.darkestSampleLuma,
        brightestSampleLuma: frameAnalysis.brightestSampleLuma,
        darkPixelRatio: frameAnalysis.darkPixelRatio,
        isDecodable: true,
        rejectionReason: null,
      };
    } catch (error: unknown) {
      const rejectionReason: MediaThumbnailCandidateFrame["rejectionReason"] =
        error instanceof Error && error.message.includes("timed out")
          ? "timeout"
          : "decode-failed";

      return {
        attemptIndex,
        frameTimeMs: candidateFrameTimeMs,
        averageLuma: null,
        darkestSampleLuma: null,
        brightestSampleLuma: null,
        darkPixelRatio: null,
        isDecodable: false,
        rejectionReason,
      };
    }
  }

  /**
   * @brief Seek the hidden extractor to one requested frame time
   *
   * @param videoElement - Hidden video element used for decoding
   * @param targetTimeMs - Requested frame time in milliseconds
   * @param timeoutMs - Optional request timeout
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   */
  private async seekToFrameTime(
    videoElement: HTMLVideoElement,
    targetTimeMs: number,
    timeoutMs: number | null,
    extractionStartedAt: number,
  ): Promise<void> {
    const normalizedTargetTimeSeconds: number = Math.max(
      0,
      targetTimeMs / 1000,
    );

    if (
      Math.abs(videoElement.currentTime - normalizedTargetTimeSeconds) <= 0.02
    ) {
      return;
    }

    const seekPromise: Promise<void> = this.waitForSeeked(videoElement);

    videoElement.currentTime = normalizedTargetTimeSeconds;
    await this.withRemainingTimeout(
      seekPromise,
      timeoutMs,
      extractionStartedAt,
    );
  }

  /**
   * @brief Capture the currently selected frame into the persisted still blob
   *
   * @param request - Shared thumbnail request
   * @param videoElement - Hidden video element used for decoding
   * @param canvasElement - Reusable canvas used for final serialization
   * @param selectionDecision - Shared selection decision produced by the selector
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   *
   * @returns Serialized thumbnail result with inspectable selection metadata
   */
  private async captureSelectedFrame(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    selectionDecision: MediaThumbnailSelectionDecision,
    extractionStartedAt: number,
  ): Promise<MediaThumbnailExtractionResult> {
    const selectedFrameTimeMs: number | null =
      selectionDecision.selectedFrameTimeMs;

    if (selectedFrameTimeMs === null) {
      throw new Error(
        `Thumbnail extraction could not decode any usable frames for ${request.sourceId}.`,
      );
    }

    await this.seekToFrameTime(
      videoElement,
      selectedFrameTimeMs,
      request.extractionPolicy.timeoutMs,
      extractionStartedAt,
    );

    const targetSize: { width: number; height: number } =
      this.resolveTargetSize(request, videoElement);
    const canvasContext: CanvasRenderingContext2D | null =
      canvasElement.getContext("2d");

    if (canvasContext === null) {
      throw new Error("The browser could not create a 2D canvas context.");
    }

    canvasElement.width = targetSize.width;
    canvasElement.height = targetSize.height;
    canvasContext.drawImage(
      videoElement,
      0,
      0,
      targetSize.width,
      targetSize.height,
    );

    const imagePayload: Blob = await this.serializeCanvas(
      canvasElement,
      request.qualityHint,
    );
    const extractionAttempt: MediaThumbnailExtractionAttempt =
      this.createExtractionAttempt(
        request,
        selectionDecision,
        extractionStartedAt,
      );

    return {
      sourceId: request.sourceId,
      imagePayload,
      imageContentType: imagePayload.type || "image/jpeg",
      width: targetSize.width,
      height: targetSize.height,
      frameTimeMs: Math.round(videoElement.currentTime * 1000),
      extractedAt: Date.now(),
      wasApproximate: selectionDecision.fallbackUsed,
      extractionAttempt,
      selectionDecision: {
        ...selectionDecision,
        resolvedReason: this.resolveSelectionReason(selectionDecision),
      },
    };
  }

  /**
   * @brief Build one shared extraction-attempt summary for debug consumers
   *
   * @param request - Shared request currently being processed
   * @param selectionDecision - Shared selection decision produced for the request
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   *
   * @returns Shared extraction-attempt summary
   */
  private createExtractionAttempt(
    request: MediaThumbnailRequest,
    selectionDecision: MediaThumbnailSelectionDecision,
    extractionStartedAt: number,
  ): MediaThumbnailExtractionAttempt {
    const completedFrameCount: number =
      selectionDecision.candidateFrames.filter(
        (candidateFrame: MediaThumbnailCandidateFrame): boolean =>
          candidateFrame.isDecodable,
      ).length;

    return {
      requestedStrategy: request.extractionPolicy.strategy,
      strategyUsed: selectionDecision.strategyUsed,
      qualityIntent: request.extractionPolicy.qualityIntent,
      timeoutMs: request.extractionPolicy.timeoutMs,
      candidateWindowMs: request.extractionPolicy.candidateWindowMs,
      candidateFrameStepMs: request.extractionPolicy.candidateFrameStepMs,
      maxCandidateFrames: request.extractionPolicy.maxCandidateFrames,
      maxAttemptCount: request.extractionPolicy.maxAttemptCount,
      attemptedFrameCount: selectionDecision.attemptedFrameCount,
      completedFrameCount,
      timedOut: selectionDecision.rejectionReasons.includes("timeout"),
      unsupported: false,
      startedAt: extractionStartedAt,
      finishedAt: Date.now(),
    };
  }

  /**
   * @brief Resolve the surfaced selection reason for one extraction result
   *
   * @param selectionDecision - Shared selection decision chosen by the selector
   *
   * @returns Selection reason surfaced by the runtime result
   */
  private resolveSelectionReason(
    selectionDecision: MediaThumbnailSelectionDecision,
  ): MediaThumbnailSelectionReason {
    return selectionDecision.selectionReason;
  }

  /**
   * @brief Analyze the current decoded frame using a small off-screen canvas
   *
   * @param videoElement - Hidden video element holding the current decoded frame
   * @param analysisCanvasElement - Reusable canvas used for luma analysis
   *
   * @returns Simple bounded brightness analysis for shared selection logic
   */
  private analyzeCurrentFrame(
    videoElement: HTMLVideoElement,
    analysisCanvasElement: HTMLCanvasElement,
  ): WebFrameAnalysis {
    const intrinsicWidth: number = Math.max(1, videoElement.videoWidth || 1);
    const intrinsicHeight: number = Math.max(1, videoElement.videoHeight || 1);
    const analysisWidth: number = Math.min(64, intrinsicWidth);
    const analysisHeight: number = Math.max(
      1,
      Math.round((intrinsicHeight / intrinsicWidth) * analysisWidth),
    );
    const canvasContext: CanvasRenderingContext2D | null =
      analysisCanvasElement.getContext("2d");

    if (canvasContext === null) {
      throw new Error("The browser could not create a 2D canvas context.");
    }

    analysisCanvasElement.width = analysisWidth;
    analysisCanvasElement.height = analysisHeight;
    canvasContext.drawImage(videoElement, 0, 0, analysisWidth, analysisHeight);
    const imageData: ImageData = canvasContext.getImageData(
      0,
      0,
      analysisWidth,
      analysisHeight,
    );
    const pixelData: Uint8ClampedArray = imageData.data;
    let totalLuma: number = 0;
    let darkestSampleLuma: number = 255;
    let brightestSampleLuma: number = 0;
    let darkPixelCount: number = 0;
    const pixelCount: number = Math.max(1, pixelData.length / 4);

    for (
      let pixelOffset: number = 0;
      pixelOffset < pixelData.length;
      pixelOffset += 4
    ) {
      const redChannel: number = pixelData[pixelOffset] ?? 0;
      const greenChannel: number = pixelData[pixelOffset + 1] ?? 0;
      const blueChannel: number = pixelData[pixelOffset + 2] ?? 0;
      const sampleLuma: number = Math.round(
        redChannel * 0.2126 + greenChannel * 0.7152 + blueChannel * 0.0722,
      );

      totalLuma += sampleLuma;
      darkestSampleLuma = Math.min(darkestSampleLuma, sampleLuma);
      brightestSampleLuma = Math.max(brightestSampleLuma, sampleLuma);

      if (sampleLuma <= 24) {
        darkPixelCount += 1;
      }
    }

    return {
      averageLuma: totalLuma / pixelCount,
      darkestSampleLuma,
      brightestSampleLuma,
      darkPixelRatio: darkPixelCount / pixelCount,
    };
  }

  /**
   * @brief Determine the captured output size while preserving aspect ratio
   *
   * @param request - Shared request that may constrain output size
   * @param videoElement - Hidden video element holding intrinsic media size
   *
   * @returns Width and height used for canvas capture
   */
  private resolveTargetSize(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
  ): { width: number; height: number } {
    const intrinsicWidth: number = Math.max(1, videoElement.videoWidth || 1);
    const intrinsicHeight: number = Math.max(1, videoElement.videoHeight || 1);
    const targetWidthHint: number | null =
      request.targetWidth ?? request.extractionPolicy.targetWidth;
    const targetHeightHint: number | null =
      request.targetHeight ?? request.extractionPolicy.targetHeight;

    if (targetWidthHint !== null && targetHeightHint !== null) {
      return {
        width: Math.max(1, Math.round(targetWidthHint)),
        height: Math.max(1, Math.round(targetHeightHint)),
      };
    }

    if (targetWidthHint !== null) {
      return {
        width: Math.max(1, Math.round(targetWidthHint)),
        height: Math.max(
          1,
          Math.round((intrinsicHeight / intrinsicWidth) * targetWidthHint),
        ),
      };
    }

    if (targetHeightHint !== null) {
      return {
        width: Math.max(
          1,
          Math.round((intrinsicWidth / intrinsicHeight) * targetHeightHint),
        ),
        height: Math.max(1, Math.round(targetHeightHint)),
      };
    }

    return {
      width: intrinsicWidth,
      height: intrinsicHeight,
    };
  }

  /**
   * @brief Serialize the current canvas content into a reusable image blob
   *
   * @param canvasElement - Canvas containing the captured frame
   * @param qualityHint - Shared quality hint used to tune JPEG serialization
   *
   * @returns JPEG blob ready for VFS-managed persistence
   */
  private async serializeCanvas(
    canvasElement: HTMLCanvasElement,
    qualityHint: MediaThumbnailRequest["qualityHint"],
  ): Promise<Blob> {
    const jpegQuality: number = this.getJpegQuality(qualityHint);
    const encodedBlob: Blob | null = await new Promise<Blob | null>(
      (resolve: (blob: Blob | null) => void): void => {
        canvasElement.toBlob(
          (blob: Blob | null): void => {
            resolve(blob);
          },
          "image/jpeg",
          jpegQuality,
        );
      },
    );

    if (encodedBlob === null) {
      const fallbackDataUrl: string = canvasElement.toDataURL(
        "image/jpeg",
        jpegQuality,
      );

      return this.createBlobFromDataUrl(fallbackDataUrl, "image/jpeg");
    }

    return encodedBlob;
  }

  /**
   * @brief Convert one shared quality hint into a JPEG encoder quality
   *
   * @param qualityHint - Shared thumbnail quality label
   *
   * @returns Browser JPEG quality value
   */
  private getJpegQuality(
    qualityHint: MediaThumbnailRequest["qualityHint"],
  ): number {
    switch (qualityHint) {
      case "premium-attempt":
        return 0.92;
      case "high":
        return 0.86;
      case "medium":
        return 0.72;
      case "low":
        return 0.56;
    }
  }

  /**
   * @brief Convert a data URL fallback into a blob for VFS-managed storage
   *
   * @param dataUrl - Data URL emitted by the canvas fallback path
   * @param contentType - Content type associated with the payload
   *
   * @returns Blob rebuilt from the data URL payload
   */
  private createBlobFromDataUrl(dataUrl: string, contentType: string): Blob {
    const encodedPayload: string = dataUrl.split(",")[1] ?? "";
    const binaryPayload: string = window.atob(encodedPayload);
    const byteNumbers: number[] = Array.from(
      binaryPayload,
      (character: string): number => character.charCodeAt(0),
    );
    const byteArray: Uint8Array = new Uint8Array(byteNumbers);
    const blobBuffer: ArrayBuffer = byteArray.buffer.slice(
      byteArray.byteOffset,
      byteArray.byteOffset + byteArray.byteLength,
    ) as ArrayBuffer;

    return new Blob([blobBuffer], {
      type: contentType,
    });
  }

  /**
   * @brief Reset the hidden extraction path after one request finishes
   */
  private async resetExtractionPath(): Promise<void> {
    await this.destroyShakaPlayer();

    if (this.extractionVideoElement === null) {
      return;
    }

    this.extractionVideoElement.pause();
    this.extractionVideoElement.removeAttribute("src");
    this.extractionVideoElement.load();
    this.extractionVideoElement.currentTime = 0;
    this.extractionVideoElement.poster = "";
  }

  /**
   * @brief Destroy any transient Shaka player used by the hidden extractor
   */
  private async destroyShakaPlayer(): Promise<void> {
    if (this.shakaPlayer === null) {
      return;
    }

    const shakaPlayer: ShakaPlayer = this.shakaPlayer;

    this.shakaPlayer = null;
    await shakaPlayer.destroy();
  }

  /**
   * @brief Wait until a hidden video element reports its first decodable frame
   *
   * @param videoElement - Hidden video element being loaded
   *
   * @returns Promise resolved after `loadeddata` fires
   */
  private waitForLoadedData(videoElement: HTMLVideoElement): Promise<void> {
    return new Promise<void>(
      (resolve: () => void, reject: (error: Error) => void): void => {
        const handleLoadedData = (): void => {
          cleanup();
          resolve();
        };
        const handleError = (): void => {
          cleanup();
          reject(new Error("The browser failed to load thumbnail media data."));
        };
        const cleanup = (): void => {
          videoElement.removeEventListener("loadeddata", handleLoadedData);
          videoElement.removeEventListener("error", handleError);
        };

        videoElement.addEventListener("loadeddata", handleLoadedData, {
          once: true,
        });
        videoElement.addEventListener("error", handleError, {
          once: true,
        });
      },
    );
  }

  /**
   * @brief Wait until the browser reports that a requested seek completed
   *
   * @param videoElement - Hidden video element being seeked
   *
   * @returns Promise resolved after `seeked` fires
   */
  private waitForSeeked(videoElement: HTMLVideoElement): Promise<void> {
    return new Promise<void>(
      (resolve: () => void, reject: (error: Error) => void): void => {
        const handleSeeked = (): void => {
          cleanup();
          resolve();
        };
        const handleError = (): void => {
          cleanup();
          reject(
            new Error("The browser failed while seeking thumbnail media."),
          );
        };
        const cleanup = (): void => {
          videoElement.removeEventListener("seeked", handleSeeked);
          videoElement.removeEventListener("error", handleError);
        };

        videoElement.addEventListener("seeked", handleSeeked, {
          once: true,
        });
        videoElement.addEventListener("error", handleError, {
          once: true,
        });
      },
    );
  }

  /**
   * @brief Wrap an async operation in the request's optional timeout
   *
   * @param promise - Async operation being awaited
   * @param totalTimeoutMs - Optional timeout duration for the whole extraction
   * @param extractionStartedAt - Wall-clock timestamp when extraction began
   *
   * @returns Original promise result when it finishes before the remaining timeout
   */
  private async withRemainingTimeout<TValue>(
    promise: Promise<TValue>,
    totalTimeoutMs: number | null,
    extractionStartedAt: number,
  ): Promise<TValue> {
    if (totalTimeoutMs === null || totalTimeoutMs <= 0) {
      return promise;
    }

    const elapsedMs: number = Date.now() - extractionStartedAt;
    const remainingTimeoutMs: number = totalTimeoutMs - elapsedMs;

    if (remainingTimeoutMs <= 0) {
      throw new Error(
        `Thumbnail extraction timed out after ${totalTimeoutMs}ms.`,
      );
    }

    return await this.withOptionalTimeout(promise, remainingTimeoutMs);
  }

  /**
   * @brief Wrap an async operation in the request's optional timeout
   *
   * @param promise - Async operation being awaited
   * @param timeoutMs - Optional timeout duration
   *
   * @returns Original promise result when it finishes in time
   */
  private async withOptionalTimeout<TValue>(
    promise: Promise<TValue>,
    timeoutMs: number | null,
  ): Promise<TValue> {
    if (timeoutMs === null || timeoutMs <= 0) {
      return promise;
    }

    return await new Promise<TValue>(
      (
        resolve: (value: TValue | PromiseLike<TValue>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const timeoutHandle: number = window.setTimeout((): void => {
          reject(
            new Error(`Thumbnail extraction timed out after ${timeoutMs}ms.`),
          );
        }, timeoutMs);

        promise.then(
          (value: TValue): void => {
            window.clearTimeout(timeoutHandle);
            resolve(value);
          },
          (reason: unknown): void => {
            window.clearTimeout(timeoutHandle);
            reject(reason);
          },
        );
      },
    );
  }

  /**
   * @brief Ask VFS to prewarm the highest-value startup bytes for extraction
   *
   * @param request - Shared thumbnail request being prepared
   */
  private async warmStartupArtifacts(
    request: MediaThumbnailRequest,
  ): Promise<void> {
    if (this.vfsController === null) {
      return;
    }

    await this.vfsController.warmStartupArtifacts({
      source: request.sourceDescriptor,
      variantKey: null,
      useCase: "thumbnail-extract",
      cachePolicy: this.vfsController.getDefaultCachePolicy(),
      allowServiceWorkerLookup: true,
      startupWindowByteLength: 131072,
      hotRangeByteLength: 262144,
    });
  }
}
