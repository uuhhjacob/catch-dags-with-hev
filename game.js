const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("levelText");
const toast = document.getElementById("toast");

const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const settingsScreen = document.getElementById("settingsScreen");

const bgMusic = document.getElementById("bgMusic");
const catchSound = document.getElementById("catchSound");
const missSound = document.getElementById("missSound");

let highScore = Number(localStorage.getItem("dagsHighScore") || 0);
document.getElementById("menuHighScore").textContent = formatScore(highScore);

const keys = {};
let state = "menu";
let lastTime = 0;
let spawnTimer = 0;
let score = 0;
let combo = 0;
let lives = 3;
let level = 1;
let shake = 0;
let musicOn = true;
let shakeOn = true;
let pixelOn = true;

const player = {
  x: W / 2 - 12,
  y: H - 31,
  w: 24,
  h: 26,
  speed: 230
};

const dags = [];
const particles = [];
const floaters = [];

window.addEventListener("keydown", e => {
  keys[e.key] = true;

  if (["ArrowLeft", "ArrowRight", " ", "Escape"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "Escape" && state === "playing") pauseGame();
  else if (e.key === "Escape" && state === "paused") resumeGame();

  if (e.key === " " && state === "menu") startGame();
  if (e.key === " " && state === "gameover") startGame();
});

window.addEventListener("keyup", e => keys[e.key] = false);

document.getElementById("playBtn").onclick = startGame;
document.getElementById("pauseBtn").onclick = () => state === "playing" ? pauseGame() : resumeGame();
document.getElementById("resumeBtn").onclick = resumeGame;
document.getElementById("restartBtn").onclick = startGame;
document.getElementById("restartBtnPause").onclick = startGame;
document.getElementById("menuBtn").onclick = showMenu;
document.getElementById("settingsBtn").onclick = () => {
  pauseScreen.classList.add("hidden");
  settingsScreen.classList.remove("hidden");
};
document.getElementById("settingsBackBtn").onclick = () => {
  settingsScreen.classList.add("hidden");
  pauseScreen.classList.remove("hidden");
};

document.getElementById("musicBtn").onclick = toggleMusic;
document.getElementById("musicToggle").onchange = e => {
  musicOn = e.target.checked;
  if (musicOn) tryMusic(); else bgMusic.pause();
};
document.getElementById("shakeToggle").onchange = e => shakeOn = e.target.checked;
document.getElementById("pixelToggle").onchange = e => {
  pixelOn = e.target.checked;
  canvas.classList.toggle("no-pixel", !pixelOn);
};

function formatScore(n) {
  return String(Math.max(0, Math.floor(n))).padStart(6, "0");
}

function resetGame() {
  score = 0;
  combo = 0;
  lives = 3;
  level = 1;
  spawnTimer = 0;
  shake = 0;
  player.x = W / 2 - player.w / 2;
  dags.length = 0;
  particles.length = 0;
  floaters.length = 0;
  updateHUD();
}

function startGame() {
  resetGame();
  state = "playing";
  startScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  tryMusic();
}

function pauseGame() {
  if (state !== "playing") return;
  state = "paused";
  pauseScreen.classList.remove("hidden");
}

function resumeGame() {
  if (state !== "paused") return;
  state = "playing";
  pauseScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  tryMusic();
}

function showMenu() {
  state = "menu";
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  document.getElementById("menuHighScore").textContent = formatScore(highScore);
  bgMusic.pause();
}

function tryMusic() {
  if (!musicOn) return;
  bgMusic.volume = 0.32;
  bgMusic.play().catch(() => {});
}

function toggleMusic() {
  musicOn = !musicOn;
  document.getElementById("musicToggle").checked = musicOn;
  if (musicOn) tryMusic();
  else bgMusic.pause();
}

function playSound(audio) {
  if (!musicOn && audio === catchSound) return;
  try {
    audio.currentTime = 0;
    audio.volume = audio === catchSound ? 0.55 : 0.45;
    audio.play().catch(() => {});
  } catch {}
}

function spawnDag() {
  const size = 13 + Math.random() * 5;
  dags.push({
    x: 7 + Math.random() * (W - 14 - size),
    y: -size - 3,
    w: size,
    h: size + 3,
    speed: 45 + level * 7 + Math.random() * 24,
    drift: (Math.random() - .5) * (8 + level * 1.5),
    phase: Math.random() * Math.PI * 2,
    rot: 0
  });
}

function catchDag(dag) {
  const gained = 10 + Math.min(combo, 20) * 2;
  score += gained;
  combo++;

  createBurst(dag.x + dag.w / 2, dag.y + dag.h / 2, 8);
  addFloater("+" + gained, dag.x, dag.y);
  playSound(catchSound);

  if (combo > 1 && combo % 5 === 0) {
    showToast("COMBO x" + combo + "!");
    if (shakeOn) shake = 3;
  }

  if (score > highScore) highScore = score;
  level = Math.min(12, 1 + Math.floor(score / 100));
  updateHUD();
}

function missDag(dag) {
  lives--;
  combo = 0;
  createBurst(dag.x + dag.w / 2, H - 12, 5);
  playSound(missSound);
  showToast("MISSED!");
  if (shakeOn) shake = 5;
  updateHUD();

  if (lives <= 0) endGame();
}

function endGame() {
  state = "gameover";
  bgMusic.pause();

  const isNew = score > Number(localStorage.getItem("dagsHighScore") || 0);
  if (isNew) localStorage.setItem("dagsHighScore", score);

  document.getElementById("finalScore").textContent = formatScore(score);
  document.getElementById("newHigh").classList.toggle("hidden", !isNew);
  gameOverScreen.classList.remove("hidden");
}

function updateHUD() {
  scoreEl.textContent = formatScore(score);
  comboEl.textContent = "x" + combo;
  livesEl.textContent = "♥ ".repeat(Math.max(0, lives)).trim() || "—";
  levelEl.textContent = "LEVEL " + level;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}

function addFloater(text, x, y) {
  floaters.push({ text, x, y, life: .75 });
}

function createBurst(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 55;
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: .35 + Math.random() * .3,
      maxLife: .65,
      size: 1 + Math.random() * 2
    });
  }
}

function update(dt) {
  if (state !== "playing") return;

  let dir = 0;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dir--;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) dir++;

  player.x += dir * player.speed * dt;
  player.x = Math.max(3, Math.min(W - player.w - 3, player.x));

  const spawnInterval = Math.max(.28, .82 - level * .045);
  spawnTimer += dt;

  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnDag();
    if (level >= 6 && Math.random() < .12) spawnDag();
  }

  for (let i = dags.length - 1; i >= 0; i--) {
    const d = dags[i];
    d.y += d.speed * dt;
    d.x += Math.sin(performance.now() / 500 + d.phase) * d.drift * dt;

    if (d.x < 2) d.x = 2;
    if (d.x + d.w > W - 2) d.x = W - d.w - 2;

    if (collides(player, d)) {
      catchDag(d);
      dags.splice(i, 1);
    } else if (d.y > H + 10) {
      missDag(d);
      dags.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 65 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y -= 22 * dt;
    f.life -= dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }

  shake *= Math.pow(.03, dt);
}

function collides(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function drawBackground(t) {
  ctx.fillStyle = "#080b18";
  ctx.fillRect(0, 0, W, H);

  // moon
  ctx.fillStyle = "#ffeaa0";
  ctx.fillRect(257, 17, 10, 10);
  ctx.fillStyle = "#080b18";
  ctx.fillRect(261, 16, 8, 8);

  // stars
  const stars = [[20,18],[48,31],[83,14],[117,25],[151,10],[190,29],[221,13],[287,39]];
  ctx.fillStyle = "#777fb8";
  for (const [x,y] of stars) {
    if (Math.floor(t / 600 + x) % 4 !== 0) ctx.fillRect(x, y, 1, 1);
  }

  // distant skyline
  ctx.fillStyle = "#111630";
  const buildings = [
    [0,74,29,62],[31,89,22,47],[55,68,35,68],[92,83,20,53],
    [115,59,29,77],[146,77,17,59],[165,69,34,67],[201,86,25,50],
    [228,63,29,73],[259,81,18,55],[279,70,41,66]
  ];
  for (const b of buildings) {
    ctx.fillRect(...b);
  }

  // windows
  ctx.fillStyle = "#242a50";
  for (let x = 8; x < W; x += 15) {
    for (let y = 80; y < 128; y += 11) {
      if ((x + y) % 3 !== 0) ctx.fillRect(x, y, 3, 3);
    }
  }

  // ground
  ctx.fillStyle = "#151936";
  ctx.fillRect(0, 133, W, 47);
  ctx.fillStyle = "#242b50";
  ctx.fillRect(0, 133, W, 3);

  // road stripes
  ctx.fillStyle = "#343a5e";
  for (let x = -((t / 8) % 28); x < W; x += 28) {
    ctx.fillRect(x, 165, 13, 2);
  }

  // decorative neon signs
  ctx.fillStyle = "#ff4f9a";
  ctx.fillRect(18, 107, 17, 2);
  ctx.fillStyle = "#55e6ff";
  ctx.fillRect(244, 112, 25, 2);
}

function drawPlayer() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);

  // shadow
  ctx.fillStyle = "#080a14";
  ctx.fillRect(x - 3, y + player.h + 2, player.w + 6, 2);

  // Hev Abi: intentionally chunky generic pixel-art character
  ctx.fillStyle = "#d7a47d";
  ctx.fillRect(x + 7, y, 10, 8);       // head
  ctx.fillStyle = "#15151d";
  ctx.fillRect(x + 5, y - 1, 14, 4);    // hair
  ctx.fillRect(x + 7, y + 7, 2, 2);
  ctx.fillRect(x + 15, y + 7, 2, 2);

  ctx.fillStyle = "#55e6ff";
  ctx.fillRect(x + 4, y + 9, 16, 10);   // shirt

  ctx.fillStyle = "#e7e9ff";
  ctx.fillRect(x + 1, y + 10, 4, 3);    // left arm
  ctx.fillRect(x + 19, y + 10, 4, 3);   // right arm

  ctx.fillStyle = "#4d4b67";
  ctx.fillRect(x + 5, y + 19, 6, 7);    // leg
  ctx.fillRect(x + 14, y + 19, 6, 7);

  ctx.fillStyle = "#f5f2ff";
  ctx.fillRect(x + 4, y + 25, 7, 2);
  ctx.fillRect(x + 14, y + 25, 7, 2);
}

function drawDag(d) {
  const x = Math.round(d.x);
  const y = Math.round(d.y);

  // Generic pixel-art "Uncle Dags" placeholder sprite.
  // Replace this function or use an image asset later if desired.
  ctx.fillStyle = "#c98761";
  ctx.fillRect(x + 4, y + 2, 7, 7);       // head

  ctx.fillStyle = "#19151b";
  ctx.fillRect(x + 3, y + 1, 9, 3);       // hair
  ctx.fillRect(x + 2, y + 4, 3, 3);

  ctx.fillStyle = "#e9e3d8";
  ctx.fillRect(x + 3, y + 9, 9, 7);       // shirt

  ctx.fillStyle = "#d7b07b";
  ctx.fillRect(x + 1, y + 10, 3, 4);
  ctx.fillRect(x + 11, y + 10, 3, 4);

  ctx.fillStyle = "#49384a";
  ctx.fillRect(x + 4, y + 16, 3, 3);
  ctx.fillRect(x + 9, y + 16, 3, 3);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = "#ffe66d";
    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.font = '6px "Press Start 2P"';
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / .75);
    ctx.fillStyle = "#ffe66d";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function draw(t) {
  ctx.save();

  if (shakeOn && shake > .1) {
    ctx.translate(
      Math.round((Math.random() - .5) * shake),
      Math.round((Math.random() - .5) * shake)
    );
  }

  drawBackground(t);

  for (const d of dags) drawDag(d);
  drawPlayer();
  drawParticles();
  drawFloaters();

  ctx.restore();
}

function loop(t) {
  const dt = Math.min(.033, (t - lastTime) / 1000 || 0);
  lastTime = t;
  update(dt);
  draw(t);
  requestAnimationFrame(loop);
}

updateHUD();
requestAnimationFrame(loop);
