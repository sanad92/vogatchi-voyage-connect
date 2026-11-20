import { createWorker, OEM, PSM } from 'tesseract.js';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import corePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import modelPath from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url';
import { readPassportMrz } from './passportMrz';

export async function createPassportReader() {
  const langPath = new URL('.', new URL(modelPath, window.location.href)).href;
  // All assets are served by this app. The image is processed in the worker.
  const worker = await createWorker('eng', OEM.LSTM_ONLY, { workerPath, corePath, langPath, workerBlobURL: false });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
  } catch (error) {
    await worker.terminate();
    throw error;
  }

  return {
    async read(image: Blob) {
      const bitmap = await createImageBitmap(image);
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        const scale = Math.min(1800 / bitmap.width, 1800 / bitmap.height);
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        if (!canvas.width || !canvas.height) return null;
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const bottom = Math.floor(canvas.height * 0.58);
        const region = { left: 0, top: bottom, width: canvas.width, height: canvas.height - bottom };
        const cropped = readPassportMrz((await worker.recognize(canvas, { rectangle: region })).data.text);
        return cropped ?? readPassportMrz((await worker.recognize(canvas)).data.text);
      } finally {
        bitmap.close();
      }
    },
    terminate: () => worker.terminate(),
  };
}
