import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiHandler } from './server/api';
import { createProviderFromEnv, loadEnvFile } from './server/config';

/** Mounts the product API on the Vite dev and preview servers, so `npm run dev` is one process. */
function productApi(): Plugin {
  const mount = (server: ViteDevServer | PreviewServer) => {
    loadEnvFile();
    const setup = createProviderFromEnv();
    console.log(setup.provider ? `[hue] product provider: ${setup.provider.info().label}` : `[hue] serving sample products — ${setup.reason}`);
    const api = createApiHandler(setup);
    server.middlewares.use((req, res, next) => void api(req, res, next));
  };
  return { name: 'hue-product-api', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({ plugins: [react(), productApi()] });
