import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'vite';

async function test() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const mod = await server.ssrLoadModule(join(__dirname, 'components/MarketInsightsView.tsx'));
    console.log("Successfully loaded module:", Object.keys(mod));
  } catch (e) {
    console.error("Error loading module:", e);
  } finally {
    await server.close();
  }
}

test();
