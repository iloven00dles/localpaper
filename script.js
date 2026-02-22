const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CELL_SIZE = 10;
const COLS = canvas.width / CELL_SIZE;
const ROWS = canvas.height / CELL_SIZE;

let grid = [];
let trails = [];
let p1, p2;

let gameLoop;
let isGameOver = false;

// Game Modes
let currentMode = 'classic';
let powerUps = []; // Crazy mode power-ups

// Constants for Power-ups
const POWER_UP_TYPES = ['speed', 'slowEnemy'];
const POWER_UP_COLORS = {
    'speed': '#f1c40f', // yellow
    'slowEnemy': '#3498db' // light blue
};
let powerUpTimerId = null;

// Dalelės efektams
let particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color: color
        });
    }
}

function updateDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.life * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

function startGame(mode) {
    currentMode = mode;
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("gameContainer").style.display = "flex";
    document.getElementById("gameCanvas").style.display = "block";

    // Nustatome pavadinimą
    const title = document.getElementById("modeTitle");
    if (mode === 'classic') {
        title.innerText = "Paper.io - Classic Mode";
        title.style.color = "#fff";
        title.style.textShadow = "none";
    } else {
        title.innerText = "Paper.io - Crazy Mode!";
        title.style.color = "#e74c3c";
        title.style.textShadow = "0 0 10px rgba(231, 76, 60, 0.8)";
    }

    resetGame();
}

function showMainMenu() {
    isGameOver = true;
    clearInterval(gameLoop);
    if (powerUpTimerId) clearInterval(powerUpTimerId);

    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("gameContainer").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
}

function initP1() {
    return {
        id: 1,
        x: 15, y: 30,
        dx: 1, dy: 0,
        nextDx: 1, nextDy: 0,
        color: "#ff4757",
        terrColor: "rgba(255, 71, 87, 0.5)",
        trailColor: "rgba(255, 71, 87, 0.8)",
        hasTrail: false,
        trailCells: [],
        dead: false,
        score: 0,
        // Game mode variables
        baseSpeed: 1, // Kiek langelių per ticką
        currentSpeed: 1, // Dabartinis greitis (kiek langelių per ticką juda)
        speedTimer: 0,
        skipTicks: 0 // SlowEnemy valdymui
    };
}

function initP2() {
    return {
        id: 2,
        x: 65, y: 30,
        dx: -1, dy: 0,
        nextDx: -1, nextDy: 0,
        color: "#1e90ff",
        terrColor: "rgba(30, 144, 255, 0.5)",
        trailColor: "rgba(30, 144, 255, 0.8)",
        hasTrail: false,
        trailCells: [],
        dead: false,
        score: 0,
        // Game mode variables
        baseSpeed: 1,
        currentSpeed: 1,
        speedTimer: 0,
        skipTicks: 0
    };
}

function resetGame() {
    isGameOver = false;
    document.getElementById("gameOverScreen").style.display = "none";

    powerUps = [];
    particles = [];
    if (powerUpTimerId) clearInterval(powerUpTimerId);

    grid = Array(COLS).fill(0).map(() => Array(ROWS).fill(0));
    trails = Array(COLS).fill(0).map(() => Array(ROWS).fill(0));

    p1 = initP1();
    p2 = initP2();

    // Sukurti pradinę teritoriją (3x3)
    for (let i = p1.x - 1; i <= p1.x + 1; i++) {
        for (let j = p1.y - 1; j <= p1.y + 1; j++) {
            grid[i][j] = p1.id;
        }
    }
    for (let i = p2.x - 1; i <= p2.x + 1; i++) {
        for (let j = p2.y - 1; j <= p2.y + 1; j++) {
            grid[i][j] = p2.id;
        }
    }

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 50); // Greitesnis loop del animaciju, bet judesim reciau

    // Crazy mod power-ups
    if (currentMode === 'crazy') {
        powerUpTimerId = setInterval(spawnPowerUp, 5000); // Kas 5 sekundes šansas atsirasti power-up
    }

    computeScores();
    draw();
}

function spawnPowerUp() {
    // Max 3 power ups ant ekrano
    if (powerUps.length >= 3) return;

    // 50% šansas
    if (Math.random() > 0.5) return;

    let tryCount = 0;
    let maxTries = 100;
    while (tryCount < maxTries) {
        let px = Math.floor(Math.random() * (COLS - 4)) + 2;
        let py = Math.floor(Math.random() * (ROWS - 4)) + 2;

        // Tikrinam, ar neužkrenta ant žaidėjų ar uodegų
        if (grid[px][py] === 0 && trails[px][py] === 0) {
            let type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
            powerUps.push({
                x: px,
                y: py,
                type: type,
                color: POWER_UP_COLORS[type],
                active: true,
                animOffset: Math.random() * Math.PI * 2
            });
            break;
        }
        tryCount++;
    }
}

function applyPowerUp(player, other, powerUp) {
    createExplosion(powerUp.x, powerUp.y, powerUp.color);
    if (powerUp.type === 'speed') {
        player.currentSpeed = 2; // Dvigubas greitis
        player.speedTimer = 100; // 50 tickų ~ 5 sekundės (dabar tick 50ms)
    } else if (powerUp.type === 'slowEnemy') {
        other.skipTicks = 60; // Priešas praleidžia kas antrą ticką tam tikrą laiką
    }
}

function updatePowerUps(p) {
    if (p.speedTimer > 0) {
        p.speedTimer--;
        if (p.speedTimer <= 0) p.currentSpeed = p.baseSpeed;
    }
}

window.addEventListener("keydown", (e) => {
    // Užkirsti kelią default veiksmams rodyklėms (pvz., scrollinimui)
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    // Žaidėjas 1: WASD
    if ((e.key === "w" || e.key === "W") && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = -1; }
    if ((e.key === "s" || e.key === "S") && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = 1; }
    if ((e.key === "a" || e.key === "A") && p1.dx === 0) { p1.nextDx = -1; p1.nextDy = 0; }
    if ((e.key === "d" || e.key === "D") && p1.dx === 0) { p1.nextDx = 1; p1.nextDy = 0; }

    // Žaidėjas 2: Rodyklės
    if (e.key === "ArrowUp" && p2.dy === 0) { p2.nextDx = 0; p2.nextDy = -1; }
    if (e.key === "ArrowDown" && p2.dy === 0) { p2.nextDx = 0; p2.nextDy = 1; }
    if (e.key === "ArrowLeft" && p2.dx === 0) { p2.nextDx = -1; p2.nextDy = 0; }
    if (e.key === "ArrowRight" && p2.dx === 0) { p2.nextDx = 1; p2.nextDy = 0; }
});

function floodFill(player) {
    let visited = Array(COLS).fill(0).map(() => Array(ROWS).fill(false));
    let queue = [];

    // Tikriname nuo kraštų
    for (let x = 0; x < COLS; x++) {
        if (grid[x][0] !== player.id) { queue.push([x, 0]); visited[x][0] = true; }
        if (grid[x][ROWS - 1] !== player.id) { queue.push([x, ROWS - 1]); visited[x][ROWS - 1] = true; }
    }
    for (let y = 0; y < ROWS; y++) {
        if (grid[0][y] !== player.id && !visited[0][y]) { queue.push([0, y]); visited[0][y] = true; }
        if (grid[COLS - 1][y] !== player.id && !visited[COLS - 1][y]) { queue.push([COLS - 1, y]); visited[COLS - 1][y] = true; }
    }

    let head = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (head < queue.length) {
        let [cx, cy] = queue[head++];
        for (let d of dirs) {
            let nx = cx + d[0];
            let ny = cy + d[1];
            // Jei langelis tuščias arba priešininko teritorija, pridedame prie aplankytų
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !visited[nx][ny] && grid[nx][ny] !== player.id) {
                visited[nx][ny] = true;
                queue.push([nx, ny]);
            }
        }
    }

    // Visi neaplankyti langeliai priklauso žaidėjui, nes juos gaubia jo teritorija
    let filledSpaces = 0;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (!visited[x][y] && grid[x][y] !== player.id) {
                // Jeigu užpildome erdvę, ir ten yra priešas, jis miršta
                let other = player.id === 1 ? p2 : p1;
                if (!other.dead && other.x === x && other.y === y) {
                    other.dead = true;
                }
                grid[x][y] = player.id;

                // Teritorijos uzpildymo animacija (kas kelinta kad neuzlagintu)
                if (Math.random() > 0.8) {
                    createExplosion(x, y, player.color);
                }
                filledSpaces++;
            }
        }
    }
}

function checkCollisions(p, other) {
    if (p.dead) return;

    // Atsitrenkimas į sienas
    if (p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS) {
        p.dead = true;
        createExplosion(p.x, p.y, p.color);
        return;
    }

    // Atsitrenkimas į uodegas
    let cellTrail = trails[p.x][p.y];
    if (cellTrail === p.id) {
        p.dead = true; // Į savo
        createExplosion(p.x, p.y, p.color);
    } else if (cellTrail === other.id) {
        other.dead = true; // Į priešininko
        createExplosion(other.x, other.y, other.color);
    }
}

// Tick valdomas per time step, nes padareme 50ms (kad butu greitesnes animacijos)
// Tai zaidejai judanti 1 block / 100ms dabar turi judeti 1 block per kas antra cikla
let gameTick = 0;

function processPlayer(p, otherP) {
    if (p.dead) return;

    // Jei slow debuff, judam dar rečiau (kas ketvirtą, nes default kas antrą)
    let moveMod = p.skipTicks > 0 ? 4 : 2;
    // Speed debuff judam kiekviena (1)
    if (p.currentSpeed > 1) moveMod = 1;

    if (p.skipTicks > 0) p.skipTicks--;

    if (gameTick % moveMod !== 0) return; // Praleidžiame judėjimą, jei ne laikas

    p.dx = p.nextDx;
    p.dy = p.nextDy;

    // Kadangi greitį valdome moveMod'u, currentSpeed visada dabar šitam kontekste 1 zingsnis per leidziama cikla
    p.x += p.dx;
    p.y += p.dy;

    // Pirma patikriname kolizijas prieš padedant uodegą
    checkCollisions(p, otherP);
    if (p.dead) return;

    // Atnaujinam trails po kiekvieno step
    handleTerritoryAndTrail(p);

    // Check power-up collection
    if (currentMode === 'crazy') {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            let pu = powerUps[i];
            if (p.x === pu.x && p.y === pu.y) {
                applyPowerUp(p, otherP, pu);
                powerUps.splice(i, 1);
            }
        }
    }
}

function computeScores() {
    let s1 = 0, s2 = 0;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (grid[x][y] === 1) s1++;
            if (grid[x][y] === 2) s2++;
        }
    }
    let total = COLS * ROWS;
    p1.score = ((s1 / total) * 100).toFixed(1);
    document.getElementById("s1").innerText = p1.score;
    p2.score = ((s2 / total) * 100).toFixed(1);
    document.getElementById("s2").innerText = p2.score;
}

function handleTerritoryAndTrail(p) {
    if (p.dead) return;

    if (p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS) {
        if (grid[p.x][p.y] !== p.id) {
            // Palieka uodegą
            p.hasTrail = true;
            p.trailCells.push([p.x, p.y]);
            trails[p.x][p.y] = p.id;
        } else {
            // Sugrįžo į teritoriją
            if (p.hasTrail) {
                for (let [tx, ty] of p.trailCells) {
                    grid[tx][ty] = p.id;
                    trails[tx][ty] = 0;
                }
                p.trailCells = [];
                p.hasTrail = false;

                floodFill(p);
                computeScores();
            }
        }
    }
}

function dieAndClear(p) {
    p.dead = true;
    for (let [tx, ty] of p.trailCells) {
        trails[tx][ty] = 0;
        createExplosion(tx, ty, p.trailColor);
    }
    p.trailCells = [];
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (grid[x][y] === p.id) {
                grid[x][y] = 0;
                if (Math.random() > 0.95) createExplosion(x, y, p.terrColor);
            }
        }
    }
    computeScores();
}

function update() {
    if (isGameOver) return;

    gameTick++;

    updatePowerUps(p1);
    updatePowerUps(p2);

    processPlayer(p1, p2);
    processPlayer(p2, p1);

    // Jei atsitrenkia kaktomuša
    if (p1.x === p2.x && p1.y === p2.y && !p1.dead && !p2.dead) {
        p1.dead = true;
        p2.dead = true;
        createExplosion(p1.x, p1.y, '#ffffff');
    }

    // Nes processPlayer viduje jau iškviečia handleTerritoryAndTrail dėl greičio, čia nereikia dubliuoti,
    // Bet užtikrinam floodFill pabaigos sąlygas

    if (!isGameOver) {
        if (p1.dead && p2.dead) endGame("Lygiosios!");
        else if (p1.dead) endGame("Žaidėjas 2 Laimėjo!");
        else if (p2.dead) endGame("Žaidėjas 1 Laimėjo!");
    }

    draw();
}

function endGame(text) {
    if (isGameOver) return;
    isGameOver = true;
    // Leisti padaryti explosion, bet po 2 secondary rodysim game over ekrana
    if (p1.dead && !p2.dead) dieAndClear(p1);
    else if (p2.dead && !p1.dead) dieAndClear(p2);
    else if (p1.dead && p2.dead) {
        dieAndClear(p1);
        dieAndClear(p2);
    }
    draw();

    setTimeout(() => {
        clearInterval(gameLoop);
        if (powerUpTimerId) clearInterval(powerUpTimerId);
        document.getElementById("winnerText").innerText = text;
        document.getElementById("gameOverScreen").style.display = "block";
    }, 1500); // 1.5 seconds wait for particles
}

function draw() {
    // Naudojame gražų užtamsinimą kad liktų senų daiktų siluetai judant powerupams 
    ctx.fillStyle = "rgba(47, 53, 66, 1.0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Light lines)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= COLS; i++) {
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
    }
    for (let j = 0; j <= ROWS; j++) {
        ctx.moveTo(0, j * CELL_SIZE);
        ctx.lineTo(canvas.width, j * CELL_SIZE);
    }
    ctx.stroke();

    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            // Draw Territory
            if (grid[x][y] === 1) {
                ctx.fillStyle = p1.terrColor;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else if (grid[x][y] === 2) {
                ctx.fillStyle = p2.terrColor;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }

            // Draw Trails with glow effect
            if (trails[x][y] === 1) {
                ctx.fillStyle = p1.trailColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p1.color;
                ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                ctx.shadowBlur = 0;
            } else if (trails[x][y] === 2) {
                ctx.fillStyle = p2.trailColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p2.color;
                ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                ctx.shadowBlur = 0;
            }
        }
    }

    // Draw Power-ups
    const time = Date.now() / 200;
    for (let pu of powerUps) {
        ctx.fillStyle = pu.color;

        ctx.beginPath();
        let cx = pu.x * CELL_SIZE + CELL_SIZE / 2;
        let cy = pu.y * CELL_SIZE + CELL_SIZE / 2;

        let bounce = Math.sin(time + pu.animOffset) * 2;

        ctx.arc(cx, cy + bounce, CELL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = pu.color;

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw Heads
    if (!p1.dead) {
        ctx.fillStyle = p1.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p1.color;
        ctx.fillRect(p1.x * CELL_SIZE, p1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.shadowBlur = 0;

        // Akiu animacija (kaip paper.io stilistika)
        ctx.fillStyle = "white";
        ctx.fillRect(p1.x * CELL_SIZE + 2, p1.y * CELL_SIZE + 2, 2, 2);
        ctx.fillRect(p1.x * CELL_SIZE + 6, p1.y * CELL_SIZE + 2, 2, 2);
    }
    if (!p2.dead) {
        ctx.fillStyle = p2.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p2.color;
        ctx.fillRect(p2.x * CELL_SIZE, p2.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "white";
        ctx.fillRect(p2.x * CELL_SIZE + 2, p2.y * CELL_SIZE + 2, 2, 2);
        ctx.fillRect(p2.x * CELL_SIZE + 6, p2.y * CELL_SIZE + 2, 2, 2);
    }

    // Draw Particles overlay
    updateDrawParticles();
}

// Nebeieškom pradžioj, laukiam paspaudimo meniu
// resetGame();
