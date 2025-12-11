const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const vidasEl = document.getElementById('vidas');
const puntosEl = document.getElementById('puntos');
const lockOverlay = document.getElementById('lockOverlay');
const mainMenu = document.getElementById('mainMenu');
const modeInfo = document.getElementById('modeInfo');
const loggedIn = document.body.dataset.loggedIn === 'true';

const W = canvas.width;
const H = canvas.height;

// Estado del teclado
const keys = {
  left: false,
  right: false,
  shoot: false
};

document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'Space') {
    keys.shoot = true;
    e.preventDefault();
  }
  // Reiniciar al morir
  if (e.code === 'Enter' && gameOver) {
    resetGame();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'Space') keys.shoot = false;
});

// Jugador
const player = {
  x: W / 2,
  y: H - 60,
  w: 40,
  h: 40,
  speed: 5,
  cooldown: 0
};

// Balas del jugador
const bullets = [];
// Enemigos
const enemies = [];
// Balas enemigas (si querés luego les agregamos)
const enemyBullets = [];

let vidas = 3;
let puntos = 0;
let spawnTimer = 0;
let gameOver = false;
let gameStarted = false;
let previewMode = false;

function resetGame() {
  vidas = 3;
  puntos = 0;
  player.x = W / 2;
  bullets.length = 0;
  enemies.length = 0;
  enemyBullets.length = 0;
  spawnTimer = 0;
  gameOver = false;
  msg.textContent = '';
  updateHud();
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function updateHud() {
  vidasEl.textContent = vidas;
  puntosEl.textContent = puntos;
}

function shoot() {
  if (player.cooldown <= 0) {
    bullets.push({
      x: player.x,
      y: player.y - player.h / 2,
      w: 4,
      h: 10,
      speed: 8
    });
    player.cooldown = 12; // frames de espera entre disparos
  }
}

function spawnEnemy() {
  const w = 32;
  const h = 32;
  const x = Math.random() * (W - w) + w / 2;
  const y = -h;
  const speed = 1.5 + Math.random() * 1.5;
  enemies.push({
    x,
    y,
    w,
    h,
    speed
  });
}

function rectsCollide(a, b) {
  return (
    a.x - a.w / 2 < b.x + b.w / 2 &&
    a.x + a.w / 2 > b.x - b.w / 2 &&
    a.y - a.h / 2 < b.y + b.h / 2 &&
    a.y + a.h / 2 > b.y - b.h / 2
  );
}

function update(dt) {
  if (gameOver) return;

  // Movimiento del jugador
  if (keys.left) player.x -= player.speed;
  if (keys.right) player.x += player.speed;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

  // Disparo
  if (keys.shoot) {
    shoot();
  }

  // Cooldown de disparo
  if (player.cooldown > 0) {
    player.cooldown -= 1;
  }

  // Actualizar balas del jugador
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;
    if (b.y + b.h / 2 < 0) {
      bullets.splice(i, 1);
    }
  }

  // Spawnear enemigos
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    // cada vez que spawneamos, reducimos un poco el tiempo -> más dificultad
    spawnTimer = Math.max(300, 1000 - puntos * 2);
  }

  // Actualizar enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.speed;

    // Colisión con jugador
    if (rectsCollide(
      { x: player.x, y: player.y, w: player.w, h: player.h },
      { x: e.x, y: e.y, w: e.w, h: e.h }
    )) {
      enemies.splice(i, 1);
      hitPlayer();
      continue;
    }

    // Si se va de pantalla
    if (e.y - e.h / 2 > H) {
      enemies.splice(i, 1);
    }
  }

  // Colisiones balas-enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (rectsCollide(
        { x: b.x, y: b.y, w: b.w, h: b.h },
        { x: e.x, y: e.y, w: e.w, h: e.h }
      )) {
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        puntos += 10;
        updateHud();
        break;
      }
    }
  }
}

function hitPlayer() {
  vidas -= 1;
  updateHud();
  if (vidas <= 0) {
    gameOver = true;
    msg.innerHTML = 'GAME OVER<br>Presioná ENTER pa reiniciar';
  } else {
    // Recolocamos al jugador
    player.x = W / 2;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Fondo simple con estrellas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#444';
  for (let i = 0; i < 60; i++) {
    const x = (i * 37) % W;
    const y = (i * 91 + Date.now() * 0.05) % H;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dibujar jugador (triángulo)
  ctx.fillStyle = '#0f0';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.h / 2);
  ctx.lineTo(player.x - player.w / 2, player.y + player.h / 2);
  ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);
  ctx.closePath();
  ctx.fill();

  // Balas del jugador
  ctx.fillStyle = '#ff0';
  for (const b of bullets) {
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  }

  // Enemigos (cuadrados rojos)
  ctx.fillStyle = '#f00';
  for (const e of enemies) {
    ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
  }
}

let lastTime = performance.now();

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt);
  draw();

  if (!gameOver) {
    requestAnimationFrame(loop);
  }
}

function startGame(allowPreview = false) {
  if (!loggedIn && !allowPreview) {
    msg.innerHTML = 'Iniciá sesión o registrate para empezar a jugar.';
    lockOverlay?.classList.add('visible');
    return;
  }

  // Permite reiniciar si veníamos de un modo previa y ahora se inicia el juego real
  const shouldRestart = !gameStarted || gameOver || previewMode !== (allowPreview && !loggedIn);

  previewMode = allowPreview && !loggedIn;
  gameStarted = true;

  if (previewMode) {
    msg.innerHTML = 'Demo rápida: iniciá sesión para desbloquear los modos.';
  } else {
    msg.textContent = '';
  }

  lockOverlay?.classList.remove('visible');

  if (shouldRestart) {
    resetGame();
  }
}

function showMenu() {
  mainMenu?.classList.add('visible');
  msg.textContent = loggedIn
    ? 'Elegí un modo para iniciar tu partida.'
    : 'Iniciá sesión o registrate para desbloquear los modos de juego.';
}

function hideMenu() {
  mainMenu?.classList.remove('visible');
}

function handleModeSelection(mode) {
  switch (mode) {
    case 'historia':
      modeInfo.textContent = loggedIn
        ? 'Modo Historia: enfrentate a oleadas cada vez más difíciles.'
        : 'Modo Historia (demo): iniciá sesión para guardar tu progreso.';
      hideMenu();
      startGame(!loggedIn);
      break;
    case 'colonias':
      modeInfo.textContent = 'Colonias estará disponible pronto. ¡Mantente atento!';
      break;
    case 'tienda':
      if (!loggedIn) {
        modeInfo.textContent = 'Necesitás iniciar sesión para ingresar a la Tienda.';
        return;
      }
      modeInfo.textContent = 'La Tienda abrirá en una próxima actualización.';
      break;
    case 'configuracion':
      if (!loggedIn) {
        modeInfo.textContent = 'Iniciá sesión para acceder a Configuración.';
        return;
      }
      modeInfo.textContent = 'Configuración: ajustes próximamente.';
      break;
    default:
      modeInfo.textContent = '';
  }
}

mainMenu?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const mode = target.dataset.mode;
  if (!mode || target.disabled) return;
  handleModeSelection(mode);
});

showMenu();
