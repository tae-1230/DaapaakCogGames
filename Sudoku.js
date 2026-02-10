import { saveGameSession } from "./stats.js";


let board = [];
let solution = [];
let fixedCells = [];
let selectedCell = null;
let errors = 0;
let startTime = null;
let timerInterval = null;
let isPaused = false;
let elapsedTime = 0;
let gameStarted = false;

/**
 * Generates Sudoku Board + Solution
 * @return {number[][]} A 9x9 array representing a valid complete Sudoku board
*/
function generateSolution() {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    fillGrid(grid);
    return grid;
}

/**
 * Fills Sukdoku Board
 * @param {number[][]} 
 * @return {boolean} true if the grid was successfully filled
*/
function fillGrid(grid) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                shuffle(numbers);
                for (let num of numbers) {
                    if (isValidPlacement(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillGrid(grid)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

/**
 * Shuffling (Fisher-Yates algorithm)
 * @param {Array} array
*/
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * @param {number[][]} grid - grid to check
 * @param {number} row - row index
 * @param {number} col - column index
 * @param {number} num - which number
 * @return {boolean} - if valid
*/
function isValidPlacement(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num) return false;
    }
    for (let i = 0; i < 9; i++) {
        if (grid[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[boxRow + i][boxCol + j] === num) return false;
        }
    }
    return true;
}

/**
 * @param {string} difficulty 
 * @return {void}
*/
function createPuzzle(difficulty) {
    solution = generateSolution();
    board = solution.map(row => [...row]);
    
    const cellsToKeep = {
        'easy': 40,
        'medium': 30,
        'hard': 25
    }[difficulty];

    const cells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cells.push([i, j]);
        }
    }
    shuffle(cells);

    const cellsToRemove = 81 - cellsToKeep;
    for (let i = 0; i < cellsToRemove; i++) {
        const [row, col] = cells[i];
        board[row][col] = 0;
    }

    fixedCells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== 0) {
                fixedCells.push(`${i}-${j}`);
            }
        }
    }
}

/**
 * Apply Styling and div assignments to each cell
*/
function renderBoard() {
    const grid = document.getElementById('sudoku-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            if (fixedCells.includes(`${i}-${j}`)) {
                cell.classList.add('fixed');
                cell.textContent = board[i][j];
            } else {
                cell.classList.add('editable');
                if (board[i][j] !== 0) {
                    cell.textContent = board[i][j];
                }
                cell.addEventListener('click', () => selectCell(i, j));
            }
            
            grid.appendChild(cell);
        }
    }
}

/**
 * Selects a cell for editing
 * @param {number} row - row index
 * @param {number} col - column index
*/
function selectCell(row, col) {
    if (!gameStarted || isPaused) return;
    if (fixedCells.includes(`${row}-${col}`)) return;
    
    document.querySelectorAll('.sudoku-cell').forEach(c => c.classList.remove('selected'));
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('selected');
    selectedCell = { row, col };
}

function placeNumber(num) {
    if (!gameStarted || isPaused) return;
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    if (fixedCells.includes(`${row}-${col}`)) return;
    
    board[row][col] = num;
    
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = num || '';
    cell.classList.remove('error', 'correct');
    
    if (num !== 0) {
        if (num === solution[row][col]) {
            cell.classList.add('correct');
            setTimeout(() => cell.classList.remove('correct'), 500);
        } else {
            cell.classList.add('error');
            errors++;
            document.getElementById('error-count').textContent = errors;
            setTimeout(() => cell.classList.remove('error'), 500);
        }
    }
    
    checkWin();
}

/**
 * Check if correctly solved
*/
function checkWin() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== solution[i][j]) return;
        }
    }
    
    stopTimer();
    showVictoryModal();
}

/**
 * Starts the game timer
*/
function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        const seconds = elapsedTime / 1000;
        document.getElementById('time-display').textContent = seconds.toFixed(1) + 's';
    }, 100);
}

/**
 * Stop Timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Pause Timer
 */
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Resume Timer
 */
function resumeTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        const seconds = elapsedTime / 1000;
        document.getElementById('time-display').textContent = seconds.toFixed(1) + 's';
    }, 100);
}

/**
 * Display when player won
 * Show stats of the game
 */
function showVictoryModal() {
    const elapsed = elapsedTime / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    
    document.getElementById('final-time').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('final-errors').textContent = errors;
    document.getElementById('victory-modal').classList.remove('hidden');

    saveGameSession("sudoku", {
        game: "sudoku",
        timestamp_iso: new Date().toISOString(),
        metrics: {
            time_s: elapsedTime / 1000,
            errors: errors
        }
    });
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}

/**
 * Starts brand new game
 * Updates UI to unstarted date
 */
function startNewGame() {
    closeModal();
    stopTimer();
    
    const difficulty = document.getElementById('difficulty').value;
    createPuzzle(difficulty);
    renderBoard();
    
    errors = 0;
    elapsedTime = 0;
    selectedCell = null;
    gameStarted = false;
    isPaused = false;
    
    document.getElementById('error-count').textContent = '0';
    document.getElementById('time-display').textContent = '0.0s';
    document.getElementById('start-btn').disabled = false;
    document.getElementById('start-btn').textContent = 'Start';
    document.getElementById('pause-btn').disabled = true;
}

/**
 * Resets the current puzzle to its initial state
 */
function resetGame() {
    stopTimer();
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (!fixedCells.includes(`${i}-${j}`)) {
                board[i][j] = 0;
            }
        }
    }
    
    renderBoard();
    errors = 0;
    elapsedTime = 0;
    selectedCell = null;
    gameStarted = false;
    isPaused = false;
    
    document.getElementById('error-count').textContent = '0';
    document.getElementById('time-display').textContent = '0.0s';
    document.getElementById('start-btn').disabled = false;
    document.getElementById('start-btn').textContent = 'Start';
    document.getElementById('pause-btn').disabled = true;
}

/**
 * Difference between starting game and creating a new one
 */
function toggleStartPause() {
    if (!gameStarted) {
        gameStarted = true;
        isPaused = false;
        startTimer();
        document.getElementById('start-btn').textContent = 'New Game';
        document.getElementById('pause-btn').disabled = false;
    } else {
        startNewGame();
    }
}
/**
 * Pause & Resume function
 */
function togglePause() {
    if (isPaused) {
        isPaused = false;
        resumeTimer();
        document.getElementById('pause-btn').textContent = 'Pause';
    } else {
        isPaused = true;
        pauseTimer();
        document.getElementById('pause-btn').textContent = 'Resume';
    }
}

document.getElementById('start-btn').addEventListener('click', toggleStartPause);
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('reset-btn').addEventListener('click', resetGame);

document.querySelectorAll('.number-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
        placeNumber(parseInt(btn.dataset.num));
    });
});

document.getElementById('clear-btn').addEventListener('click', () => {
    placeNumber(0);
});

document.addEventListener('keydown', (e) => {
    if (!gameStarted || isPaused) return;
    
    if (e.key >= '1' && e.key <= '9') {
        placeNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        placeNumber(0);
    }
});

startNewGame();
