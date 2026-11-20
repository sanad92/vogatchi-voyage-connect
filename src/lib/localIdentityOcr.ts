import { createWorker, OEM } from 'tesseract.js';
import workerAsset from 'tesseract.js/dist/worker.min.js?url';
import coreAsset from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import { extractIdentityDraft, IDENTITY_OCR_MODEL_PATH } from './whatsappIdentityDraft';

function localAsset(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('identity_ocr_asset_origin');
  return url.href;
}

export async function recognizeIdentityImage(image: Blob, signal: AbortSignal) {
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(image);
  let canvas: HTMLCanvasElement | undefined;
  try {
    signal.throwIfAborted();
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 24_000_000) {
      throw new Error('identity_ocr_dimensions');
    }
    const ratio = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('identity_ocr_canvas_unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const stop = () => {
    const active = worker;
    worker = undefined;
    if (active) void active.terminate().catch(() => undefined);
  };
  try {
    signal.throwIfAborted();

    let abortRecognition: () => void = () => undefined;
    const abort = new Promise<never>((_, reject) => {
      abortRecognition = () => reject(signal.reason);
      signal.addEventListener('abort', abortRecognition, { once: true });
    });

    try {
      let reportWorkerError: () => void = () => undefined;
      const failed = new Promise<never>((_, reject) => {
        reportWorkerError = () => reject(new Error('identity_ocr_worker_failed'));
      });
      const recognize = async () => {
        worker = await createWorker('eng+ara', OEM.LSTM_ONLY, {
          workerPath: localAsset(workerAsset),
          corePath: localAsset(coreAsset),
          langPath: localAsset(`${import.meta.env.BASE_URL}${IDENTITY_OCR_MODEL_PATH}`),
          workerBlobURL: false,
          cacheMethod: 'none',
          errorHandler: reportWorkerError,
        });
        if (signal.aborted) {
          stop();
          signal.throwIfAborted();
        }
        return worker.recognize(canvas);
      };
      const result = await Promise.race([recognize(), abort, failed]);
      return extractIdentityDraft(result.data.text);
    } finally {
      signal.removeEventListener('abort', abortRecognition);
      stop();
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
