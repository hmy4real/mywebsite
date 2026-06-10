const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const lengthEl = document.querySelector("#length");
const tempoEl = document.querySelector("#tempo");
const overlay = document.querySelector("#overlay");
const statusLabel = document.querySelector("#statusLabel");
const statusTitle = document.querySelector("#statusTitle");
const primaryAction = document.querySelector("#primaryAction");
const restartButton = document.querySelector("#restart");
const pauseButton = document.querySelector("#pause");
const speedButtons = [...document.querySelectorAll("[data-speed]")];

const grid = 24;
const cell = canvas.width / grid;
const modes = {
  easy: { label: "Calm", step: 130, ramp: 1.2 },
  normal: { label: "Swift", step: 105, ramp: 1.55 },
  hard: { label: "Wild", step: 82, ramp: 2.05 },
};

let mode = "easy";
let snake;
let apple;
let direction;
let queuedDirection;
let score;
let best = Number(localStorage.getItem("velvet-snake-best") || 0);
let running = false;
let paused = false;
let gameOver = false;
let accumulator = 0;
let lastFrame = 0;
let stepMs = modes[mode].step;
let previousSnake;
let touchStart = null;

bestEl.textContent = best;

function reset() {
  snake = [
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
  ];
  previousSnake = snake.map((part) => ({ ...part }));
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  score = 0;
  stepMs = modes[mode].step;
  running = false;
  paused = false;
  gameOver = false;
  apple = placeApple();
  updateHud();
  showOverlay("Ready", "Glide through the garden", "Start");
  draw(1);
}

function start() {
  if (gameOver) reset();
  running = true;
  paused = false;
  gameOver = false;
  accumulator = 0;
  lastFrame = performance.now();
  hideOverlay();
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    showOverlay("Paused", "Still as moonlight", "Resume");
  } else {
    hideOverlay();
    lastFrame = performance.now();
    requestAnimationFrame(loop);
  }
}

function loop(time) {
  if (!running || paused) return;

  const delta = Math.min(time - lastFrame, 90);
  lastFrame = time;
  accumulator += delta;

  while (accumulator >= stepMs) {
    previousSnake = snake.map((part) => ({ ...part }));
    update();
    accumulator -= stepMs;
  }

  draw(accumulator / stepMs);
  requestAnimationFrame(loop);
}

function update() {
  direction = queuedDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= grid ||
    head.y >= grid ||
    snake.some((part) => part.x === head.x && part.y === head.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === apple.x && head.y === apple.y) {
    score += 10;
    stepMs = Math.max(54, stepMs - modes[mode].ramp);
    apple = placeApple();
    pulseBoard();
  } else {
    snake.pop();
  }

  updateHud();
}

function endGame() {
  running = false;
  gameOver = true;
  if (score > best) {
    best = score;
    localStorage.setItem("velvet-snake-best", String(best));
  }
  updateHud();
  draw(1);
  showOverlay("Game over", score ? `You gathered ${score} glow` : "A quick warm-up", "Play again");
}

function setDirection(next) {
  if (next.x + direction.x === 0 && next.y + direction.y === 0) return;
  queuedDirection = next;
  if (!running && !gameOver) start();
}

function placeApple() {
  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * grid),
      y: Math.floor(Math.random() * grid),
    };
  } while (snake.some((part) => part.x === candidate.x && part.y === candidate.y));
  return candidate;
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  lengthEl.textContent = snake.length;
  tempoEl.textContent = modes[mode].label;
}

function showOverlay(label, title, action) {
  statusLabel.textContent = label;
  statusTitle.textContent = title;
  primaryAction.textContent = action;
  overlay.classList.add("is-visible");
}

function hideOverlay() {
  overlay.classList.remove("is-visible");
}

function draw(progress) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawApple();
  drawSnake(Math.max(0, Math.min(1, progress)));
}

function drawBoard() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0a1516");
  gradient.addColorStop(0.55, "#0b1018");
  gradient.addColorStop(1, "#151018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  ctx.lineWidth = 1;
  for (let i = 1; i < grid; i += 1) {
    const position = i * cell;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function drawApple() {
  const cx = apple.x * cell + cell / 2;
  const cy = apple.y * cell + cell / 2;
  const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, cell * 1.1);
  glow.addColorStop(0, "rgba(255, 207, 90, 0.95)");
  glow.addColorStop(0.4, "rgba(251, 111, 146, 0.38)");
  glow.addColorStop(1, "rgba(251, 111, 146, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffcf5a";
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.31, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake(progress) {
  for (let i = snake.length - 1; i >= 0; i -= 1) {
    const current = snake[i];
    const previous = previousSnake[i] || previousSnake[previousSnake.length - 1] || current;
    const x = lerp(previous.x, current.x, progress) * cell;
    const y = lerp(previous.y, current.y, progress) * cell;
    const inset = i === 0 ? 3 : 4.5;
    const radius = i === 0 ? 13 : 10;
    const hue = i / Math.max(1, snake.length - 1);

    ctx.fillStyle = blendColor(hue);
    roundRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, radius);
    ctx.fill();

    if (i === 0) {
      ctx.shadowColor = "rgba(38, 242, 168, 0.85)";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function blendColor(amount) {
  const green = [38, 242, 168];
  const blue = [76, 167, 255];
  const rose = [251, 111, 146];
  const target = amount > 0.55 ? rose : blue;
  const mix = amount > 0.55 ? (amount - 0.55) / 0.45 : amount / 0.55;
  const r = Math.round(lerp(green[0], target[0], mix));
  const g = Math.round(lerp(green[1], target[1], mix));
  const b = Math.round(lerp(green[2], target[2], mix));
  return `rgb(${r}, ${g}, ${b})`;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function pulseBoard() {
  canvas.animate(
    [
      { filter: "brightness(1)" },
      { filter: "brightness(1.24)" },
      { filter: "brightness(1)" },
    ],
    { duration: 220, easing: "ease-out" },
  );
}

document.addEventListener("keydown", (event) => {
  const keys = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (keys[event.code]) {
    event.preventDefault();
    setDirection(keys[event.code]);
  }
});

canvas.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection({ x: dx > 0 ? 1 : -1, y: 0 });
  } else {
    setDirection({ x: 0, y: dy > 0 ? 1 : -1 });
  }
});

primaryAction.addEventListener("click", start);
restartButton.addEventListener("click", () => {
  reset();
  start();
});
pauseButton.addEventListener("click", togglePause);

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.speed;
    speedButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    reset();
  });
});

reset();
