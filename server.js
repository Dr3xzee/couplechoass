import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname fix for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Socket events
io.on('connection', (socket) => {
  console.log('💞 A couple connected');

  socket.on('accept-switch', () => {
    socket.broadcast.emit('switch-approved');
  });
  
  // Chat
  socket.on('chat', (msg) => {
    socket.broadcast.emit('chat', msg);
  });

  // Drawing
  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  // Voice Signaling
  socket.on('voice-signal', (data) => {
    socket.broadcast.emit('voice-signal', data);
  });

  // Round skip
  socket.on('skip-round', () => {
    socket.broadcast.emit('skip-round');
  });

  socket.on('request-switch', () => {
    console.log('🌀 Switch requested');
    socket.broadcast.emit('request-switch');
  });
  
  socket.on('confirm-switch', () => {
    console.log('✅ Switch confirmed');
    io.emit('confirm-switch');
  });
  

  // 💡 NEW: Word Blitz Events
  socket.on('start-blitz', (word) => {
    socket.broadcast.emit('start-blitz', word);
  });

  socket.on('blitz-finish', () => {
    socket.broadcast.emit('blitz-finish');
  });

  socket.on('disconnect', () => {
    console.log('❌ A partner disconnected');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Couple Chaos is live at http://localhost:${PORT}`);
});
