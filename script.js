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
        score: 0
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
        score: 0
    };
}

function resetGame() {
    isGameOver = false;
    document.getElementById("gameOverScreen").style.display = "none";
    
    grid = Array(COLS).fill(0).map(() => Array(ROWS).fill(0));
    trails = Array(COLS).fill(0).map(() => Array(ROWS).fill(0));
    
    p1 = initP1();
    p2 = initP2();

    // Sukurti pradinę teritoriją (3x3)
    for(let i = p1.x - 1; i <= p1.x + 1; i++) {
        for(let j = p1.y - 1; j <= p1.y + 1; j++) {
            grid[i][j] = p1.id;
        }
    }
    for(let i = p2.x - 1; i <= p2.x + 1; i++) {
        for(let j = p2.y - 1; j <= p2.y + 1; j++) {
            grid[i][j] = p2.id;
        }
    }

    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
    computeScores();
    draw();
}

window.addEventListener("keydown", (e) => {
    // Žaidėjas 1: WASD
    if (e.key === "w" && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = -1; }
    if (e.key === "s" && p1.dy === 0) { p1.nextDx = 0; p1.nextDy = 1; }
    if (e.key === "a" && p1.dx === 0) { p1.nextDx = -1; p1.nextDy = 0; }
    if (e.key === "d" && p1.dx === 0) { p1.nextDx = 1; p1.nextDy = 0; }

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
    for(let x = 0; x < COLS; x++) {
        if(grid[x][0] !== player.id) { queue.push([x, 0]); visited[x][0] = true; }
        if(grid[x][ROWS-1] !== player.id) { queue.push([x, ROWS-1]); visited[x][ROWS-1] = true; }
    }
    for(let y = 0; y < ROWS; y++) {
        if(grid[0][y] !== player.id && !visited[0][y]) { queue.push([0, y]); visited[0][y] = true; }
        if(grid[COLS-1][y] !== player.id && !visited[COLS-1][y]) { queue.push([COLS-1, y]); visited[COLS-1][y] = true; }
    }

    let head = 0;
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    
    while(head < queue.length) {
        let [cx, cy] = queue[head++];
        for(let d of dirs) {
            let nx = cx + d[0];
            let ny = cy + d[1];
            // Jei langelis tuščias arba priešininko teritorija, pridedame prie aplankytų
            if(nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !visited[nx][ny] && grid[nx][ny] !== player.id) {
                visited[nx][ny] = true;
                queue.push([nx, ny]);
            }
        }
    }

    // Visi neaplankyti langeliai priklauso žaidėjui, nes juos gaubia jo teritorija
    for(let x=0; x<COLS; x++) {
        for(let y=0; y<ROWS; y++) {
            if(!visited[x][y] && grid[x][y] !== player.id) {
                // Jeigu užpildome erdvę, ir ten yra priešas, jis miršta
                let other = player.id === 1 ? p2 : p1;
                if (!other.dead && other.x === x && other.y === y) {
                    other.dead = true;
                }
                grid[x][y] = player.id;
            }
        }
    }
}

function checkCollisions(p, other) {
    if (p.dead) return;
    
    // Atsitrenkimas į sienas
    if (p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS) {
        p.dead = true;
        return;
    }

    // Atsitrenkimas į uodegas
    let cellTrail = trails[p.x][p.y];
    if (cellTrail === p.id) {
        p.dead = true; // Į savo
    } else if (cellTrail === other.id) {
        other.dead = true; // Į priešininko
    }
}

function processPlayer(p) {
    if(p.dead) return;
    p.dx = p.nextDx;
    p.dy = p.nextDy;
    p.x += p.dx;
    p.y += p.dy;
}

function computeScores() {
    let s1 = 0, s2 = 0;
    for(let x=0; x<COLS; x++) {
        for(let y=0; y<ROWS; y++) {
            if(grid[x][y] === 1) s1++;
            if(grid[x][y] === 2) s2++;
        }
    }
    let total = COLS * ROWS;
    p1.score = ((s1 / total) * 100).toFixed(1);
    document.getElementById("s1").innerText = p1.score;
    p2.score = ((s2 / total) * 100).toFixed(1);
    document.getElementById("s2").innerText = p2.score;
}

function handleTerritoryAndTrail(p) {
    if(p.dead) return;

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
    for(let [tx, ty] of p.trailCells) {
        trails[tx][ty] = 0;
    }
    p.trailCells = [];
    for(let x=0; x<COLS; x++) {
        for(let y=0; y<ROWS; y++) {
            if(grid[x][y] === p.id) grid[x][y] = 0;
        }
    }
    computeScores();
}

function update() {
    if(isGameOver) return;

    processPlayer(p1);
    processPlayer(p2);

    // Jei atsitrenkia kaktomuša
    if (p1.x === p2.x && p1.y === p2.y && !p1.dead && !p2.dead) {
        p1.dead = true;
        p2.dead = true;
    }

    checkCollisions(p1, p2);
    checkCollisions(p2, p1);

    handleTerritoryAndTrail(p1);
    handleTerritoryAndTrail(p2);

    // Dar kartą po flood fill, gal kas buvo uždarytas
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
    clearInterval(gameLoop);
    document.getElementById("winnerText").innerText = text;
    document.getElementById("gameOverScreen").style.display = "block";
    
    if (p1.dead && !p2.dead) dieAndClear(p1);
    else if (p2.dead && !p1.dead) dieAndClear(p2);
    else if (p1.dead && p2.dead) {
        dieAndClear(p1);
        dieAndClear(p2);
    }
    
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let x = 0; x < COLS; x++) {
        for(let y = 0; y < ROWS; y++) {
            // Draw Territory
            if (grid[x][y] === 1) {
                ctx.fillStyle = p1.terrColor;
                ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else if (grid[x][y] === 2) {
                ctx.fillStyle = p2.terrColor;
                ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }

            // Draw Trails
            if (trails[x][y] === 1) {
                ctx.fillStyle = p1.trailColor;
                ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else if (trails[x][y] === 2) {
                ctx.fillStyle = p2.trailColor;
                ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // Draw Heads
    if(!p1.dead) {
        ctx.fillStyle = p1.color;
        ctx.fillRect(p1.x*CELL_SIZE, p1.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if(!p2.dead) {
        ctx.fillStyle = p2.color;
        ctx.fillRect(p2.x*CELL_SIZE, p2.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
}

resetGame();
