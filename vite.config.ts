import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

import fs from 'fs';
import path from 'path';

// Custom plugin to handle local API saving and reading
const localApiPlugin = () => ({
  name: 'local-api-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      // Strip query params for route matching (cache-busting params etc.)
      const urlPath = (req.url || '').split('?')[0];

      if (req.method === 'GET' && urlPath.startsWith('/api/standards/')) {
        try {
          let targetFile = '';
          if (urlPath === '/api/standards/customized') {
            targetFile = 'customized-engineered-standards.json';
          } else if (urlPath === '/api/standards/global') {
            targetFile = 'global-engineered-standards.json';
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          const filePath = path.resolve(__dirname, 'src/data', targetFile);
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            const sample = parsed.cards?.[0]?.activities?.[0];
            console.log(`[API] GET ${urlPath} → ${targetFile} | Sample: ${sample?.name} = ${sample?.defaultSeconds}`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.end(raw);
          } else {
            console.log(`[API] GET ${urlPath} → FILE NOT FOUND: ${filePath}`);
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'File not found' }));
          }
        } catch (e) {
          console.error(`[API] GET ${urlPath} ERROR:`, e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read', details: String(e) }));
        }
        return;
      }

      if (req.method === 'POST' && urlPath.startsWith('/api/standards/')) {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            let targetFile = '';

            if (urlPath === '/api/standards/customized') {
              targetFile = 'customized-engineered-standards.json';
            } else if (urlPath === '/api/standards/global') {
              targetFile = 'global-engineered-standards.json';
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Not found' }));
              return;
            }

            const filePath = path.resolve(__dirname, 'src/data', targetFile);
            const sample = data.cards?.[0]?.activities?.[0];
            console.log(`[API] POST ${urlPath} → ${targetFile} | Sample: ${sample?.name} = ${sample?.defaultSeconds}`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, file: targetFile }));
          } catch (e) {
            console.error(`[API] POST ${urlPath} ERROR:`, e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save', details: String(e) }));
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    localApiPlugin(),
  ],
  server: {
    host: true, // Listen on all local IPs
    port: 4000,
    strictPort: true, // Fail if port 4000 is already in use
  },
})
