function initP1() {
    return {
        id: 1,
        x: Math.floor(COLS * 0.2), y: Math.floor(ROWS / 2),
        dx: 1, dy: 0,
        nextDx: 1, nextDy: 0,
        color: "#ff4757",
        terrColor: "rgba(255, 71, 87, 0.5)",
        trailColor: "rgba(255, 71, 87, 0.8)",
        hasTrail: false,
        trailCells: [],
        dead: false,
        score: 0,
        baseSpeed: 1,
        currentSpeed: 1,
        speedTimer: 0,
        skipTicks: 0
    };
}

function initP2() {
    return {
        id: 2,
        x: Math.floor(COLS * 0.8), y: Math.floor(ROWS / 2),
        dx: -1, dy: 0,
        nextDx: -1, nextDy: 0,
        color: "#1e90ff",
        terrColor: "rgba(30, 144, 255, 0.5)",
        trailColor: "rgba(30, 144, 255, 0.8)",
        hasTrail: false,
        trailCells: [],
        dead: false,
        score: 0,
        baseSpeed: 1,
        currentSpeed: 1,
        speedTimer: 0,
        skipTicks: 0
    };
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
    if (currentMode === 'crazy' || currentMode === 'custom') {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            let pu = powerUps[i];
            if (p.x === pu.x && p.y === pu.y) {
                applyPowerUp(p, otherP, pu);
                powerUps.splice(i, 1);
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
