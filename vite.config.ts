import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { IDENTITY_OCR_MODEL_PATH } from "./src/lib/whatsappIdentityDraft";

const require = createRequire(import.meta.url);
const identityModelFiles = new Map(['eng', 'ara'].map(language => {
  const file = `${language}.traineddata.gz`;
  return [file, require.resolve(`@tesseract.js-data/${language}/4.0.0_best_int/${file}`)];
}));
const identityOcrModels: Plugin = {
  name: 'safar-identity-ocr-models',
  configureServer(server) {
    server.middlewares.use(`/${IDENTITY_OCR_MODEL_PATH}`, (request, response, next) => {
      const filename = request.url?.split('?')[0]?.slice(1) ?? '';
      const model = identityModelFiles.get(filename);
      if (!model || request.method !== 'GET') return next();
      response.setHeader('Content-Type', 'application/gzip');
      response.end(readFileSync(model));
    });
  },
  generateBundle() {
    for (const [filename, model] of identityModelFiles) {
      this.emitFile({ type: 'asset', fileName: `${IDENTITY_OCR_MODEL_PATH}/${filename}`, source: readFileSync(model) });
    }
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    identityOcrModels,
    mcpPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
