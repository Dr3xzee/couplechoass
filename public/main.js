const socket = io();

// DOM Elements
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const chatBox = document.getElementById('chat-box');
const chatToggle = document.getElementById('chat-toggle');
const chatNotify = document.getElementById('chat-notify');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const muteBtn = document.getElementById('mute-btn');
const saveBtn = document.getElementById('save-btn');
const skipBtn = document.getElementById('skip-round');
const switchBtn = document.getElementById('switch-game');
const roundText = document.getElementById('round-info');
const scoreText = document.getElementById('scores');
const wordBlitz = document.getElementById('word-blitz');
const blitzWord = document.getElementById('blitz-word');
const blitzInput = document.getElementById('blitz-input');
const blitzStatus = document.getElementById('blitz-status');
const startBlitzBtn = document.getElementById('start-blitz');
const popup = document.getElementById('switch-popup');
const acceptBtn = document.getElementById('accept-switch');
const declineBtn = document.getElementById('decline-switch');

let drawing = false;
let localStream;
let peer;
let activeGame = 'draw';
let currentWord = '';
let typingStarted = false;
let yourScore = 0;
let partnerScore = 0;
let round = 1;
const maxRounds = 5;
let isMuted = false;

// 🎮 Round Logic
function updateRound() {
  roundText.textContent = `❤️ Round ${round}/${maxRounds}`;
  scoreText.textContent = `You: ${yourScore} ❤️ Partner: ${partnerScore}`;
}

function nextRound() {
  round++;
  if (round > maxRounds) return showFinalResults();
  updateRound();
}

function showFinalResults() {
  document.body.innerHTML = `
    <div class="final-screen">
      <h1>${yourScore > partnerScore ? 'You win! 🏆' : partnerScore > yourScore ? 'Partner wins! 👑' : 'Draw! 💞'}</h1>
      <p>You: ${yourScore} ❤️ Partner: ${partnerScore}</p>
      <button onclick="location.reload()">Play Again 🔁</button>
    </div>
  `;
}

// 🎨 Drawing (Fixed for accurate coordinates + mobile)
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

// Mouse
canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseleave', () => drawing = false);
canvas.addEventListener('mousemove', (e) => {
  if (!drawing || activeGame !== 'draw') return;
  const { x, y } = getCanvasPos(e);
  drawDot(x, y, '#ff69b4');
  socket.emit('draw', { x, y });
});

// Touch (Mobile)
canvas.addEventListener('touchstart', (e) => {
  drawing = true;
  const { x, y } = getCanvasPos(e);
  drawDot(x, y, '#ff69b4');
  socket.emit('draw', { x, y });
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!drawing || activeGame !== 'draw') return;
  e.preventDefault(); // prevent scroll
  const { x, y } = getCanvasPos(e);
  drawDot(x, y, '#ff69b4');
  socket.emit('draw', { x, y });
}, { passive: false });

canvas.addEventListener('touchend', () => drawing = false);
canvas.addEventListener('touchcancel', () => drawing = false);


function drawDot(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

socket.on('draw', ({ x, y }) => {
  if (activeGame === 'draw') drawDot(x, y, '#ff69b4');
});

// 🗣️ Voice Chat
navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  localStream = stream;
  document.getElementById('you').classList.add('speaking');

  peer = new SimplePeer({
    initiator: location.hash === '#1',
    trickle: false,
    stream: stream,
  });

  peer.on('signal', (data) => socket.emit('voice-signal', data));
  socket.on('voice-signal', (data) => peer.signal(data));

  peer.on('stream', (remote) => {
    const partnerAudio = new Audio();
    partnerAudio.srcObject = remote;
    partnerAudio.play();
    document.getElementById('partner').classList.add('speaking');
  });

  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    muteBtn.textContent = isMuted ? 'Unmute Mic 🔇' : 'Mute Mic 🎤';
    document.getElementById('you').classList.toggle('speaking', !isMuted);
  });
});

// 💬 Chat
chatToggle.addEventListener('click', () => {
  chatBox.classList.toggle('hidden');
  chatNotify.style.display = 'none';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    const msg = chatInput.value;
    appendMessage('You 🫵', msg);
    socket.emit('chat', msg);
    chatInput.value = '';
  }
});

socket.on('chat', (msg) => {
  appendMessage('Partner ❤️', msg);
  if (chatBox.classList.contains('hidden')) {
    chatNotify.style.display = 'block';
  }
});

function appendMessage(sender, msg) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${msg}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// 🔁 Round Events
saveBtn.addEventListener('click', () => {
  yourScore += Math.floor(Math.random() * 5) + 1;
  socket.emit('add-score');
  nextRound();
});

socket.on('add-score', () => {
  partnerScore += Math.floor(Math.random() * 5) + 1;
  updateRound();
});

skipBtn.addEventListener('click', () => {
  socket.emit('skip-round');
  nextRound();
});

socket.on('skip-round', () => {
  alert('Partner skipped the round!');
  nextRound();
});

// 🔄 Switch Game Logic
switchBtn.addEventListener('click', () => {
  socket.emit('request-switch');
  blitzStatus.textContent = 'Waiting for partner...';
});

socket.on('request-switch', () => {
  popup.classList.remove('hidden');
  setTimeout(() => {
    popup.classList.add('hidden');
  }, 15000); // hide after 15s if no response
});

acceptBtn.addEventListener('click', () => {
  popup.classList.add('hidden');
  socket.emit('accept-switch');
});

declineBtn.addEventListener('click', () => {
  popup.classList.add('hidden');
});

socket.on('request-switch', () => {
  popup.classList.remove('hidden');

  setTimeout(() => {
    popup.classList.add('hidden');
  }, 15000); // hide after 15s if no response
});


// When partner receives request


// Notify requester to switch too
socket.on('switch-approved', () => {
  showBlitz(); // This ensures both players switch games
});


function showBlitz() {
  activeGame = 'blitz';
  canvas.style.display = 'none';
  wordBlitz.style.display = 'flex';
}

function backToDraw() {
  activeGame = 'draw';
  wordBlitz.style.display = 'none';
  canvas.style.display = 'block'; // use block if it was hidden
  canvas.width = 400; // reset canvas pixel width
  canvas.height = 400; // reset canvas pixel height
  blitzInput.value = '';
  typingStarted = false;
}




// 🧠 Word Blitz Game
startBlitzBtn.addEventListener('click', () => {
  currentWord = generateWord();
  blitzWord.textContent = currentWord;
  blitzInput.value = '';
  blitzStatus.textContent = 'GO! ⏱️';
  typingStarted = true;
});

blitzInput.addEventListener('input', () => {
  if (!typingStarted || blitzInput.value.trim() !== currentWord) return;
  typingStarted = false;
  yourScore += 5;
  socket.emit('blitz-win');
  blitzStatus.textContent = 'You won! 🏆';
  setTimeout(() => {
    if (round < maxRounds) nextRound();
    backToDraw();
  }, 2000);
});

socket.on('blitz-win', () => {
  typingStarted = false;
  partnerScore += 5;
  blitzStatus.textContent = 'You lost 💔';
  setTimeout(() => {
    if (round < maxRounds) nextRound();
    backToDraw();
  }, 2000);
});

function generateWord() {
  const list = ['heartbeat', 'cuddle', 'together', 'forever', 'sunshine'];
  return list[Math.floor(Math.random() * list.length)];
}

// ✅ Init
document.addEventListener('DOMContentLoaded', () => {
  updateRound();
});
