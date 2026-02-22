const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CELL_SIZE = 10;
let COLS = canvas.width / CELL_SIZE;
let ROWS = canvas.height / CELL_SIZE;

let grid = [];
let trails = [];
let p1, p2;

let gameLoop;
let isGameOver = false;

// Game Modes
let currentMode = 'classic';
let powerUps = []; // Crazy mode power-ups

// Constants for Power-ups
const POWER_UP_TYPES = ['speed', 'slowEnemy', 'territoryPatch'];
const POWER_UP_COLORS = {
    'speed': '#f1c40f', // yellow
    'slowEnemy': '#3498db', // light blue
    'territoryPatch': '#2ecc71' // green
};
let activePowerUpTypes = [...POWER_UP_TYPES];
let powerUpTimerId = null;

// Dalelės efektams
let particles = [];
let gameTick = 0;
