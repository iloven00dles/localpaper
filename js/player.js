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
        skipTicks: 0,
        hearts: 0
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
        skipTicks: 0,
        hearts: 0
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
        if (p.hearts > 0) {
            p.hearts--;
            trails[p.x][p.y] = 0; // "Pravalo" tą prasilenktą plytelę
            createExplosion(p.x, p.y, '#e84393'); // Parodome širdelės praradimo efektą (rožinė)
        } else {
            p.dead = true; // Į savo uodegą
            createExplosion(p.x, p.y, p.color);
        }
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

// AI būsenos kintamieji (state machine)
let aiState = 'expand';    // 'expand', 'return', 'attack', 'hunt'
let aiPlanSteps = 0;
let aiPlanDir = null;
let aiLoopPhase = 0;
let aiLoopSize = 8;
let aiLoopSideSize = 6;

function aiPickNewLoop(bot) {
    aiLoopSize = 6 + Math.floor(Math.random() * 10);
    aiLoopSideSize = 4 + Math.floor(Math.random() * 6);
    aiLoopPhase = 0;

    const testDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let bestDir = null;
    let bestEmpty = -1;

    for (let td of testDirs) {
        if (td[0] === -bot.dx && td[0] !== 0) continue;
        if (td[1] === -bot.dy && td[1] !== 0) continue;

        let emptyCount = 0;
        for (let step = 1; step <= 15; step++) {
            let tx = bot.x + td[0] * step;
            let ty = bot.y + td[1] * step;
            if (tx < 1 || tx >= COLS - 1 || ty < 1 || ty >= ROWS - 1) break;
            if (grid[tx][ty] !== bot.id) emptyCount++;
        }
        if (emptyCount > bestEmpty) {
            bestEmpty = emptyCount;
            bestDir = td;
        }
    }

    if (bestDir) {
        aiPlanDir = bestDir;
        aiPlanSteps = aiLoopSize;
    } else {
        aiPlanDir = [bot.dx, bot.dy];
        aiPlanSteps = 5;
    }
}

function aiFindDirToHome(bot) {
    const maxSearch = 800;
    let visited = {};
    let queue = [[bot.x, bot.y, null]];
    visited[bot.x + ',' + bot.y] = true;
    let head = 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (head < queue.length && head < maxSearch) {
        let [cx, cy, firstDir] = queue[head++];
        for (let d of dirs) {
            let nx = cx + d[0];
            let ny = cy + d[1];
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            let key = nx + ',' + ny;
            if (visited[key]) continue;
            visited[key] = true;
            if (trails[nx][ny] === bot.id) continue;
            let newFirstDir = firstDir || d;
            if (grid[nx][ny] === bot.id) return newFirstDir;
            queue.push([nx, ny, newFirstDir]);
        }
    }
    return null;
}

// BFS: randa trumpiausią kelią link tikslo (tx, ty), vengia savo uodegos
function aiFindDirToTarget(bot, tx, ty) {
    const maxSearch = 1200;
    let visited = {};
    let queue = [[bot.x, bot.y, null]];
    visited[bot.x + ',' + bot.y] = true;
    let head = 0;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (head < queue.length && head < maxSearch) {
        let [cx, cy, firstDir] = queue[head++];
        for (let d of dirs) {
            let nx = cx + d[0];
            let ny = cy + d[1];
            if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) continue;
            let key = nx + ',' + ny;
            if (visited[key]) continue;
            visited[key] = true;
            if (trails[nx][ny] === bot.id) continue; // vengiam savo uodegos
            let newFirstDir = firstDir || d;
            if (nx === tx && ny === ty) return newFirstDir;
            queue.push([nx, ny, newFirstDir]);
        }
    }
    return null;
}

function aiGetPerpendicularDir(dir) {
    if (dir[0] === 0) {
        return Math.random() < 0.5 ? [1, 0] : [-1, 0];
    } else {
        return Math.random() < 0.5 ? [0, 1] : [0, -1];
    }
}

function aiIsDirSafe(bot, d) {
    let nx = bot.x + d[0];
    let ny = bot.y + d[1];
    if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) return false;
    if (trails[nx][ny] === bot.id) return false;
    return true;
}

function updateAI(bot, enemy) {
    if (bot.dead) return;

    let moveMod = bot.skipTicks > 0 ? 4 : 2;
    if (bot.currentSpeed > 1) moveMod = 1;
    if (gameTick % moveMod !== 0) return;

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let trailLen = bot.trailCells ? bot.trailCells.length : 0;
    let isHome = grid[bot.x] && grid[bot.x][bot.y] === bot.id;

    // --- Priešo uodegos paieška ---
    let nearestEnemyTrail = null;
    let minDistEnemyTrail = Infinity;
    for (let x = Math.max(0, bot.x - 35); x < Math.min(COLS, bot.x + 35); x++) {
        for (let y = Math.max(0, bot.y - 35); y < Math.min(ROWS, bot.y + 35); y++) {
            if (trails[x][y] === enemy.id) {
                let dist = Math.abs(bot.x - x) + Math.abs(bot.y - y);
                if (dist < minDistEnemyTrail) {
                    minDistEnemyTrail = dist;
                    nearestEnemyTrail = { x, y };
                }
            }
        }
    }

    // --- Priešo atstumas ---
    let distToEnemy = Math.abs(bot.x - enemy.x) + Math.abs(bot.y - enemy.y);
    let enemyHasTrail = enemy.trailCells && enemy.trailCells.length > 0;

    // --- Būsenos perėjimai ---

    // 1. Priešas turi uodegą IR jis netoli → ATTACK (agresyviai persekiojam)
    if (enemyHasTrail && nearestEnemyTrail && minDistEnemyTrail < 20 && trailLen < 8) {
        aiState = 'attack';
    }
    // 2. Priešas netoli ir mes namie → HUNT (einam link priešo, kad jis užeitų ant mūsų)
    else if (!enemyHasTrail && distToEnemy < 18 && trailLen === 0 && isHome) {
        aiState = 'hunt';
    }
    // 3. Uodega per ilga → RETURN
    else if (trailLen > 12) {
        aiState = 'return';
    }
    // 4. Esame namie, nėra uodegos → EXPAND
    else if (isHome && trailLen === 0 && aiState !== 'hunt') {
        aiState = 'expand';
        aiPickNewLoop(bot);
    }
    // 5. Expand baigtas → sukame
    else if (aiState === 'expand' && aiPlanSteps <= 0) {
        aiLoopPhase++;
        if (aiLoopPhase >= 4) {
            aiState = 'return';
        } else {
            if (aiLoopPhase === 1 || aiLoopPhase === 3) {
                let perp = aiGetPerpendicularDir(aiPlanDir);
                if (!aiIsDirSafe(bot, perp)) perp = [-perp[0], -perp[1]];
                aiPlanDir = perp;
                aiPlanSteps = aiLoopSideSize;
            } else if (aiLoopPhase === 2) {
                aiPlanDir = [-aiPlanDir[0], -aiPlanDir[1]];
                aiPlanSteps = aiLoopSize;
            }
        }
    }

    // --- Krypties pasirinkimas ---
    let chosenDir = null;

    if (aiState === 'attack' && nearestEnemyTrail) {
        // BFS link artimiausio priešo trail langelio
        let bfsDir = aiFindDirToTarget(bot, nearestEnemyTrail.x, nearestEnemyTrail.y);
        if (bfsDir && aiIsDirSafe(bot, bfsDir)) {
            chosenDir = bfsDir;
        } else {
            // Fallback: greedy
            let bestDir = null;
            let bestDist = Infinity;
            for (let d of dirs) {
                if (d[0] === -bot.dx && d[0] !== 0) continue;
                if (d[1] === -bot.dy && d[1] !== 0) continue;
                if (!aiIsDirSafe(bot, d)) continue;
                let nx = bot.x + d[0];
                let ny = bot.y + d[1];
                if (trails[nx][ny] === enemy.id) { chosenDir = d; break; }
                let dist = Math.abs(nx - nearestEnemyTrail.x) + Math.abs(ny - nearestEnemyTrail.y);
                if (dist < bestDist) { bestDist = dist; bestDir = d; }
            }
            if (!chosenDir) chosenDir = bestDir;
        }
        // Jei priešo uodegos nebėra arba per toli → keičiam būseną
        if (!nearestEnemyTrail || minDistEnemyTrail > 25 || !enemyHasTrail) {
            aiState = trailLen > 3 ? 'return' : 'expand';
            if (aiState === 'expand') aiPickNewLoop(bot);
        }

    } else if (aiState === 'hunt') {
        // Einam link priešo paties (kad jis atsilenktų į mus arba atsidurtų nepatogioj padėty)
        if (!enemy.dead) {
            let bfsDir = aiFindDirToTarget(bot, enemy.x, enemy.y);
            if (bfsDir && aiIsDirSafe(bot, bfsDir)) {
                chosenDir = bfsDir;
            }
        }
        // Jei priešas išėjo toli arba mes praradome namų bazę → išeiname iš hunt
        if (distToEnemy > 22 || enemyHasTrail || !isHome) {
            if (enemyHasTrail && nearestEnemyTrail) {
                aiState = 'attack';
            } else if (trailLen > 3) {
                aiState = 'return';
            } else {
                aiState = 'expand';
                aiPickNewLoop(bot);
            }
        }

    } else if (aiState === 'return') {
        let homeDir = aiFindDirToHome(bot);
        if (homeDir && aiIsDirSafe(bot, homeDir)) {
            chosenDir = homeDir;
        }
        if (isHome && trailLen === 0) {
            aiState = 'expand';
            aiPickNewLoop(bot);
        }

    } else if (aiState === 'expand') {
        if (aiPlanDir && aiPlanSteps > 0) {
            if (aiIsDirSafe(bot, aiPlanDir)) {
                chosenDir = aiPlanDir;
                aiPlanSteps--;
            } else {
                aiPlanSteps = 0;
            }
        }
    }

    // --- Fallback ---
    if (!chosenDir) {
        let safeDirs = [];
        for (let d of dirs) {
            if (d[0] === -bot.dx && d[0] !== 0) continue;
            if (d[1] === -bot.dy && d[1] !== 0) continue;
            if (aiIsDirSafe(bot, d)) safeDirs.push(d);
        }
        if (safeDirs.length > 0) {
            if (trailLen > 0) {
                let bestDir = null;
                let bestDist = Infinity;
                for (let d of safeDirs) {
                    let nx = bot.x + d[0];
                    let ny = bot.y + d[1];
                    if (grid[nx][ny] === bot.id) { chosenDir = d; break; }
                    for (let step = 1; step <= 10; step++) {
                        let sx = bot.x + d[0] * step;
                        let sy = bot.y + d[1] * step;
                        if (sx < 0 || sx >= COLS || sy < 0 || sy >= ROWS) break;
                        if (grid[sx][sy] === bot.id) {
                            if (step < bestDist) { bestDist = step; bestDir = d; }
                            break;
                        }
                    }
                }
                if (!chosenDir) chosenDir = bestDir || safeDirs[Math.floor(Math.random() * safeDirs.length)];
            } else {
                chosenDir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
            }
        }
    }

    // --- Taikome kryptį ---
    if (chosenDir) {
        bot.nextDx = chosenDir[0];
        bot.nextDy = chosenDir[1];
    }
}
