import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createWorker, OEM } from 'tesseract.js';
import { extractIdentityDraft, IDENTITY_OCR_MODEL_PATH } from '../src/lib/whatsappIdentityDraft.ts';

const langPath = fileURLToPath(new URL(`../dist/${IDENTITY_OCR_MODEL_PATH}`, import.meta.url));
const examples = {
  english: { name: 'Demo Traveler', nationality: 'Egyptian' },
  arabic: { name: 'مسافر تجريبي', nationality: 'مصري' },
};

const worker = await createWorker('eng+ara', OEM.LSTM_ONLY, { langPath, cacheMethod: 'none' });
try {
  for (const [language, expected] of Object.entries(examples)) {
    const image = fileURLToPath(new URL(`./fixtures/whatsapp-identity-review/${language}.png`, import.meta.url));
    const { data } = await worker.recognize(image);
    assert.deepEqual(extractIdentityDraft(data.text), expected, `${language} image should yield both review fields`);
  }
} finally {
  await worker.terminate();
}

console.log('Recognized synthetic Arabic and English images with the packaged OCR models.');
