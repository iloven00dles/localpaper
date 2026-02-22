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

                // Patikrinam ar šitame langelyje buvo power up
                if (currentMode === 'crazy' || currentMode === 'custom') {
                    for (let i = powerUps.length - 1; i >= 0; i--) {
                        let pu = powerUps[i];
                        if (pu.x === x && pu.y === y) {
                            applyPowerUp(player, other, pu);
                            powerUps.splice(i, 1);
                        }
                    }
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
    if (document.getElementById("h1")) document.getElementById("h1").innerText = p1.hearts;

    p2.score = ((s2 / total) * 100).toFixed(1);
    document.getElementById("s2").innerText = p2.score;
    if (document.getElementById("h2")) document.getElementById("h2").innerText = p2.hearts;
}

function startGame(mode, isCustom = false) {
    if (!isCustom) {
        canvas.width = 800;
        canvas.height = 600;
        COLS = canvas.width / CELL_SIZE;
        ROWS = canvas.height / CELL_SIZE;
        activePowerUpTypes = [...POWER_UP_TYPES];
    }

    currentMode = mode;
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("customMenu").style.display = "none";
    document.getElementById("gameContainer").style.display = "flex";
    document.getElementById("gameCanvas").style.display = "block";

    const title = document.getElementById("modeTitle");
    const name1 = document.getElementById("name1");
    const name2 = document.getElementById("name2");

    if (mode === 'classic') {
        title.innerText = "Paper.io - Classic Mode";
        title.style.color = "#fff";
        title.style.textShadow = "none";
        name1.innerText = "Žaidėjas 1 (WASD):";
        name2.innerText = "Žaidėjas 2 (Rodyklės):";
        activePowerUpTypes = []; // No powerups in classic
    } else if (mode === 'crazy') {
        title.innerText = "Paper.io - Crazy Mode!";
        title.style.color = "#e74c3c";
        title.style.textShadow = "0 0 10px rgba(231, 76, 60, 0.8)";
        name1.innerText = "Žaidėjas 1 (WASD):";
        name2.innerText = "Žaidėjas 2 (Rodyklės):";
        // activePowerUpTypes already set to all if not custom
    } else if (mode === 'custom') {
        title.innerText = "Paper.io - Custom Mode!";
        title.style.color = "#9b59b6";
        title.style.textShadow = "0 0 10px rgba(155, 89, 182, 0.8)";
        name1.innerText = "Žaidėjas 1 (WASD):";
        name2.innerText = "Žaidėjas 2 (Rodyklės):";
    } else if (mode === 'ai') {
        title.innerText = "Paper.io - PvE (Prieš AI)!";
        title.style.color = "#0984e3";
        title.style.textShadow = "0 0 10px rgba(9, 132, 227, 0.8)";
        name1.innerText = "AI Botas (Raudonas):";
        name2.innerText = "Tu (Rodyklės):";
        activePowerUpTypes = []; // No powerups in AI mode
    }

    // Rodyti arba slėpti širdeles
    const showHearts = activePowerUpTypes.includes('heart');
    const displayStyle = showHearts ? "inline" : "none";
    document.getElementById("heartsWrap1").style.display = displayStyle;
    document.getElementById("heartsWrap2").style.display = displayStyle;

    resetGame();
}

function openCustomMenu() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("customMenu").style.display = "block";
}

function closeCustomMenu() {
    document.getElementById("customMenu").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
}

function startCustomGame() {
    const size = document.getElementById("arenaSize").value;
    if (size === 'small') {
        canvas.width = 600;
        canvas.height = 400;
    } else if (size === 'large') {
        canvas.width = 1000;
        canvas.height = 800;
    } else {
        canvas.width = 800;
        canvas.height = 600;
    }
    COLS = canvas.width / CELL_SIZE;
    ROWS = canvas.height / CELL_SIZE;

    activePowerUpTypes = [];
    if (document.getElementById("puSpeed").checked) activePowerUpTypes.push('speed');
    if (document.getElementById("puSlow").checked) activePowerUpTypes.push('slowEnemy');
    if (document.getElementById("puPatch").checked) activePowerUpTypes.push('territoryPatch');
    if (document.getElementById("puHeart").checked) activePowerUpTypes.push('heart');

    if (activePowerUpTypes.length === 0) {
        startGame('classic', true); // No powerups selected
    } else {
        startGame('custom', true);
    }
}

function showMainMenu() {
    isGameOver = true;
    clearInterval(gameLoop);
    if (powerUpTimerId) clearInterval(powerUpTimerId);

    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("gameContainer").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
}

function resetGame() {
    isGameOver = false;
    document.getElementById("gameOverScreen").style.display = "none";

    powerUps = [];
    particles = [];
    if (powerUpTimerId) clearInterval(powerUpTimerId);

    // Reset AI state
    aiState = 'expand';
    aiPlanSteps = 0;
    aiPlanDir = null;
    aiLoopPhase = 0;

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

    // Crazy mod ir custom power-ups
    if (currentMode === 'crazy' || currentMode === 'custom') {
        powerUpTimerId = setInterval(spawnPowerUp, 5000); // Kas 5 sekundes šansas atsirasti power-up
    }

    computeScores();
    draw();
}

function update() {
    if (isGameOver) return;

    gameTick++;

    updatePowerUps(p1);
    updatePowerUps(p2);

    let oldP1 = { x: p1.x, y: p1.y };
    let oldP2 = { x: p2.x, y: p2.y };
    let bothAliveStart = !p1.dead && !p2.dead;

    if (currentMode === 'ai') {
        updateAI(p1, p2);
    }

    processPlayer(p1, p2);
    processPlayer(p2, p1);

    // Kaktomuša (susidūrimas į tą patį langelį arba susikeitimas vietomis)
    if (bothAliveStart) {
        let headOn = (p1.x === p2.x && p1.y === p2.y);
        let swapped = (p1.x === oldP2.x && p1.y === oldP2.y && p2.x === oldP1.x && p2.y === oldP1.y);

        if (headOn || swapped) {
            p1.dead = true;
            p2.dead = true;
            createExplosion(p1.x, p1.y, '#ffffff');
        }
    }

    if (!isGameOver) {
        let textTie = "Lygiosios!";
        let textP1 = currentMode === 'ai' ? "AI Botas Laimėjo!" : "Raudonas (Žaidėjas 1) Laimėjo!";
        let textP2 = currentMode === 'ai' ? "Tu Laimėjai!" : "Mėlynas (Žaidėjas 2) Laimėjo!";

        if (p1.dead && p2.dead) endGame(textTie);
        else if (p1.dead) endGame(textP2);
        else if (p2.dead) endGame(textP1);
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

        const winnerText = document.getElementById("winnerText");
        winnerText.innerText = text;

        if (p1.dead && !p2.dead) {
            winnerText.style.color = p2.color;
            winnerText.style.textShadow = `0 0 15px ${p2.color}`;
        } else if (p2.dead && !p1.dead) {
            winnerText.style.color = p1.color;
            winnerText.style.textShadow = `0 0 15px ${p1.color}`;
        } else {
            winnerText.style.color = "#fff";
            winnerText.style.textShadow = "none";
        }

        let goScreen = document.getElementById("gameOverScreen");
        let oldScore = document.getElementById("goScores");
        if (oldScore) oldScore.remove();

        let scoreText = document.createElement("div");
        scoreText.id = "goScores";
        let p1Name = currentMode === 'ai' ? "AI Botas (Raudonas)" : "Raudonas (WASD)";
        let p2Name = currentMode === 'ai' ? "Tu (Rodyklės)" : "Mėlynas (Rodyklės)";

        scoreText.innerHTML = `
            <div style="font-size: 1.5rem; margin-bottom: 5px; color:${p1.color}; font-weight:bold; text-shadow: 0 0 5px rgba(255,71,87,0.5);">${p1Name}: ${p1.score}%</div>
            <div style="font-size: 1.5rem; margin-bottom: 20px; color:${p2.color}; font-weight:bold; text-shadow: 0 0 5px rgba(30,144,255,0.5);">${p2Name}: ${p2.score}%</div>
        `;
        goScreen.insertBefore(scoreText, document.querySelector(".game-over-buttons"));

        goScreen.style.display = "block";
    }, 1500);
}

window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (currentMode !== 'ai') {
        if ((e.key === "w" || e.key === "W") && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = -1; }
        if ((e.key === "s" || e.key === "S") && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = 1; }
        if ((e.key === "a" || e.key === "A") && p1.dx === 0) { p1.nextDx = -1; p1.nextDy = 0; }
        if ((e.key === "d" || e.key === "D") && p1.dx === 0) { p1.nextDx = 1; p1.nextDy = 0; }
    }

    if (e.key === "ArrowUp" && p2.dy === 0) { p2.nextDx = 0; p2.nextDy = -1; }
    if (e.key === "ArrowDown" && p2.dy === 0) { p2.nextDx = 0; p2.nextDy = 1; }
    if (e.key === "ArrowLeft" && p2.dx === 0) { p2.nextDx = -1; p2.nextDy = 0; }
    if (e.key === "ArrowRight" && p2.dx === 0) { p2.nextDx = 1; p2.nextDy = 0; }
});
