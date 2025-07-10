window.onload = () => {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  // Initialize socket
  const socket = io();

  // Drawing settings
  const drawColor = '#ff69b4';
  const brushSize = 3;

  // Start/stop drawing
  canvas.addEventListener('mousedown', () => drawing = true);
  canvas.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('mouseout', () => drawing = false);

  // Local draw + emit to server
  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const x = e.offsetX;
    const y = e.offsetY;

    drawDot(x, y, drawColor);
    socket.emit('draw', { x, y, color: drawColor });
  });

  // Draw function
  function drawDot(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Listen for partner’s strokes
  socket.on('draw', ({ x, y, color }) => {
    drawDot(x, y, color);
  });
};
