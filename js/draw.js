function draw() {
    ctx.fillStyle = "rgba(47, 53, 66, 1.0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
            if (grid[x][y] === 1) {
                ctx.fillStyle = p1.terrColor;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else if (grid[x][y] === 2) {
                ctx.fillStyle = p2.terrColor;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }

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

    if (!p1.dead) {
        ctx.fillStyle = p1.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p1.color;
        ctx.fillRect(p1.x * CELL_SIZE, p1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.shadowBlur = 0;

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

    updateDrawParticles();
}
