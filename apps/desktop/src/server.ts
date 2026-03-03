import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'crypto';

import { createAuthRoutes } from './routes/auth';
import { createTemplateRoutes } from './routes/templates';
import { createSessionRoutes } from './routes/sessions';
import { createCrmRoutes } from './routes/crm';
import { createSummaryRoutes } from './routes/summary';
import { createAdminRoutes } from './routes/admin';
import { createIntegrationRoutes } from './routes/integrations';
import { errorHandler } from './middleware/errorHandler';

let httpServer: Server | null = null;

// Generate secrets on first launch
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
}

export async function startServer(): Promise<number> {
  const app = express();
  httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', createAuthRoutes());
  app.use('/api/templates', createTemplateRoutes());
  app.use('/api/sessions', createSessionRoutes());
  app.use('/api/crm', createCrmRoutes());
  app.use('/api/summary', createSummaryRoutes());
  app.use('/api/admin', createAdminRoutes());
  app.use('/api/integrations', createIntegrationRoutes());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'desktop', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  // Serve the built frontend
  const webDir = path.join(__dirname, 'web');
  app.use(express.static(webDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  // Socket.io
  io.on('connection', (socket) => {
    socket.on('session:join', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });
    socket.on('session:leave', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });
    socket.on('session:answer', (data) => {
      socket.to(`session:${data.sessionId}`).emit('session:updated', data);
    });
    socket.on('session:notes', (data) => {
      socket.to(`session:${data.sessionId}`).emit('session:updated', data);
    });
  });

  return new Promise((resolve, reject) => {
    const port = 3001;
    httpServer!.listen(port, '127.0.0.1', () => {
      resolve(port);
    });
    httpServer!.on('error', reject);
  });
}

export function stopServer(): void {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}
