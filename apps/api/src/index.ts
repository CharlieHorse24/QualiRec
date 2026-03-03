import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import sessionRoutes from './routes/sessions';
import crmRoutes from './routes/crm';
import summaryRoutes from './routes/summary';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import integrationRoutes from './routes/integrations';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('session:join', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('session:leave', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
  });

  socket.on('session:answer', (data) => {
    // Broadcast answer update to all clients in the session room
    socket.to(`session:${data.sessionId}`).emit('session:updated', data);
  });

  socket.on('session:notes', (data) => {
    socket.to(`session:${data.sessionId}`).emit('session:updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`QualiRec API server running on port ${PORT}`);
});
