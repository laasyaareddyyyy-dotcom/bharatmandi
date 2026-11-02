import path from 'path';
import express from 'express';
import { app } from './src/server/app';

const PORT = 3000;

/**
 * Setup Vite dev server middleware or serve production static assets
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mandi Ledger server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the HTTP listener if executed directly, never inside Vercel or AWS Lambda
if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NOW_REGION && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export { app };
export default app;
