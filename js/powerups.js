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

        if (grid[px][py] === 0 && trails[px][py] === 0) {
            if (activePowerUpTypes.length === 0) return;
            let type = activePowerUpTypes[Math.floor(Math.random() * activePowerUpTypes.length)];
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
        player.currentSpeed = 2;
        player.speedTimer = 100;
    } else if (powerUp.type === 'slowEnemy') {
        other.skipTicks = 60;
    } else if (powerUp.type === 'territoryPatch') {
        let radius = 2;
        for (let i = powerUp.x - radius; i <= powerUp.x + radius; i++) {
            for (let j = powerUp.y - radius; j <= powerUp.y + radius; j++) {
                if (i >= 0 && i < COLS && j >= 0 && j < ROWS) {
                    if (grid[i][j] !== player.id) {
                        grid[i][j] = player.id;
                        trails[i][j] = 0;

                        if (!other.dead && other.x === i && other.y === j) {
                            other.dead = true;
                        }

                        if (Math.random() > 0.6) {
                            createExplosion(i, j, player.terrColor);
                        }
                    }
                }
            }
        }
        floodFill(player);
        computeScores();
    }
}

function updatePowerUps(p) {
    if (p.speedTimer > 0) {
        p.speedTimer--;
        if (p.speedTimer <= 0) p.currentSpeed = p.baseSpeed;
    }
}
