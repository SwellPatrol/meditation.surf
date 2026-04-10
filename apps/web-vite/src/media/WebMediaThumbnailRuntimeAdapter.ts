/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  MediaThumbnailExtractionResult,
  MediaThumbnailRequest,
  MediaThumbnailRuntimeAdapter,
  MediaThumbnailRuntimeCapabilities,
} from "@meditation-surf/core";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

/**
 * @brief Real web thumbnail extraction adapter backed by hidden media elements
 *
 * The implementation intentionally stays practical for this phase: one hidden
 * extraction path, strong first-frame support, optional time-hint seeking, and
 * raw image payloads that the shared VFS layer can persist and lease.
 */
export class WebMediaThumbnailRuntimeAdapter implements MediaThumbnailRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "web-vite-thumbnail";

  private static readonly CAPABILITIES: MediaThumbnailRuntimeCapabilities = {
    canExtractFirstFrame: true,
    canExtractNonBlackFrame: false,
    canExtractFromHiddenMedia: true,
    canCacheObjectUrls: false,
    canPrioritizeFocusedItem: true,
  };

  public readonly runtimeId: string;

  private extractionCanvasElement: HTMLCanvasElement | null;
  private extractionRootElement: HTMLDivElement | null;
  private extractionVideoElement: HTMLVideoElement | null;
  private shakaPlayer: ShakaPlayer | null;

  /**
   * @brief Create the reusable web thumbnail extraction adapter
   */
  public constructor() {
    this.runtimeId = WebMediaThumbnailRuntimeAdapter.RUNTIME_ID;
    this.extractionCanvasElement = null;
    this.extractionRootElement = null;
    this.extractionVideoElement = null;
    this.shakaPlayer = null;
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
    const canvasElement: HTMLCanvasElement =
      this.ensureExtractionCanvasElement();

    try {
      await this.loadRequestSource(request, videoElement);
      await this.applyTimeHintIfNeeded(request, videoElement);

      return await this.captureCurrentFrame(
        request,
        videoElement,
        canvasElement,
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
   * @brief Load the request source through native playback or Shaka
   *
   * @param request - Shared request being loaded
   * @param videoElement - Hidden video element used for decoding
   */
  private async loadRequestSource(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
  ): Promise<void> {
    const sourceDescriptor = request.sourceDescriptor;
    const playbackMimeType: string =
      sourceDescriptor.mimeType ?? "application/x-mpegURL";
    const canUseNativePlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";
    const loadPromise: Promise<void> = this.waitForLoadedData(videoElement);
    const timeoutMs: number | null = request.extractionPolicy.timeoutMs;

    videoElement.poster = sourceDescriptor.posterUrl ?? "";

    if (canUseNativePlayback) {
      videoElement.src = sourceDescriptor.url;
      videoElement.load();
      await this.withOptionalTimeout(loadPromise, timeoutMs);
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
    await this.withOptionalTimeout(
      shakaPlayer.load(sourceDescriptor.url),
      timeoutMs,
    );
    await this.withOptionalTimeout(loadPromise, timeoutMs);
  }

  /**
   * @brief Seek the hidden extractor to one requested time hint when present
   *
   * @param request - Shared request that may carry a time hint
   * @param videoElement - Hidden video element used for decoding
   */
  private async applyTimeHintIfNeeded(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
  ): Promise<void> {
    const targetTimeMs: number | null =
      request.extractionPolicy.strategy === "time-hint"
        ? request.timeHintMs
        : null;

    if (targetTimeMs === null || targetTimeMs <= 0) {
      return;
    }

    const targetTimeSeconds: number = Math.max(0, targetTimeMs / 1000);
    const seekPromise: Promise<void> = this.waitForSeeked(videoElement);

    videoElement.currentTime = targetTimeSeconds;
    await this.withOptionalTimeout(
      seekPromise,
      request.extractionPolicy.timeoutMs,
    );
  }

  /**
   * @brief Draw the decoded frame into the reusable canvas and serialize it
   *
   * @param request - Shared thumbnail request
   * @param videoElement - Hidden video element currently holding the frame
   * @param canvasElement - Reusable canvas used for serialization
   *
   * @returns Serialized thumbnail result
   */
  private async captureCurrentFrame(
    request: MediaThumbnailRequest,
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
  ): Promise<MediaThumbnailExtractionResult> {
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

    return {
      sourceId: request.sourceId,
      imagePayload,
      imageContentType: imagePayload.type || "image/jpeg",
      width: targetSize.width,
      height: targetSize.height,
      frameTimeMs: Math.round(videoElement.currentTime * 1000),
      extractedAt: Date.now(),
      wasApproximate: false,
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
}
