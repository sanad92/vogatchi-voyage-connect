import { AnnotationMode, getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export async function* readPdfImages(file: Blob, signal: AbortSignal) {
  signal.throwIfAborted();
  const data = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();
  const task = getDocument({ data, enableXfa: false, stopAtErrors: true, maxImageSize: 24_000_000 });
  const stop = () => { void task.destroy().catch(() => undefined); };
  signal.addEventListener('abort', stop, { once: true });

  try {
    const pdf = await task.promise;
    for (let number = 1; number <= Math.min(pdf.numPages, 3); number++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(number);
      const original = page.getViewport({ scale: 1 });
      const dimension = Math.max(original.width, original.height);
      if (!Number.isFinite(dimension) || dimension <= 0) throw new Error('invalid_pdf_dimensions');
      const viewport = page.getViewport({ scale: 2000 / dimension });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      try {
        await page.render({ canvas, viewport, annotationMode: AnnotationMode.DISABLE }).promise;
        const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          result => result ? resolve(result) : reject(new Error('pdf_page_unavailable')), 'image/png',
        ));
        signal.throwIfAborted();
        yield image;
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    signal.removeEventListener('abort', stop);
    await task.destroy().catch(() => undefined);
  }
}
