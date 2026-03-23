// 游戏配置
const LEVELS = [
    { name: "第1关 初入羊村", rows: 4, cols: 6, time: 60, cellSize: 70 },
    { name: "第2关 青青草原", rows: 5, cols: 8, time: 90, cellSize: 60 },
    { name: "第3关 狼堡外围", rows: 6, cols: 8, time: 120, cellSize: 55 },
    { name: "第4关 森林探险", rows: 6, cols: 10, time: 150, cellSize: 50 },
    { name: "第5关 河边对决", rows: 7, cols: 10, time: 180, cellSize: 48 },
    { name: "第6关 山洞迷宫", rows: 7, cols: 12, time: 210, cellSize: 42 },
    { name: "第7关 云端之战", rows: 8, cols: 12, time: 240, cellSize: 40 },
    { name: "第8关 终极挑战", rows: 8, cols: 14, time: 270, cellSize: 38 },
    { name: "第9关 狼堡深处", rows: 9, cols: 14, time: 300, cellSize: 36 },
    { name: "第10关 羊狼和平", rows: 10, cols: 16, time: 360, cellSize: 34 },
];

// 角色定义
const CHARACTERS = [
    { name: "喜羊羊", color: "#87CEEB", hornColor: "#FFD700", feature: "smart" },
    { name: "美羊羊", color: "#FFB6C1", hornColor: "#FFC0CB", feature: "cute" },
    { name: "懒羊羊", color: "#FFFFC8", hornColor: "#FFA500", feature: "lazy" },
    { name: "沸羊羊", color: "#B47850", hornColor: "#8B4513", feature: "strong" },
    { name: "慢羊羊", color: "#FFFACD", hornColor: "#FFD700", feature: "old" },
    { name: "暖羊羊", color: "#FFA07A", hornColor: "#FF8C00", feature: "kind" },
    { name: "灰太狼", color: "#808080", hornColor: "#404040", feature: "wolf" },
    { name: "红太狼", color: "#FF69B4", hornColor: "#FF1493", feature: "queen" },
    { name: "小灰灰", color: "#C8C8C8", hornColor: "#646464", feature: "baby" },
];

// 游戏状态
let gameState = {
    currentLevel: 0,
    maxUnlockedLevel: 1,
    grid: [],
    selected: null,
    score: 0,
    timeLeft: 60,
    gameOver: false,
    victory: false,
    path: [],
    pathTimer: 0,
    timerInterval: null,
    rows: 4,
    cols: 6,
    cellSize: 70
};

// Canvas 设置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 初始化菜单
function initMenu() {
    const levelGrid = document.getElementById('levelGrid');
    levelGrid.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = `第${i + 1}关`;
        
        if (i < gameState.maxUnlockedLevel) {
            btn.classList.add('unlocked');
            if (i === gameState.currentLevel) {
                btn.classList.add('current');
            }
            btn.onclick = () => startLevel(i);
        } else {
            btn.classList.add('locked');
            btn.textContent = '锁定';
        }
        
        levelGrid.appendChild(btn);
    }
}

// 开始关卡
function startLevel(levelIdx) {
    gameState.currentLevel = levelIdx;
    const config = LEVELS[levelIdx];
    gameState.rows = config.rows;
    gameState.cols = config.cols;
    gameState.timeLeft = config.time;
    gameState.cellSize = config.cellSize;
    gameState.score = 0;
    gameState.gameOver = false;
    gameState.victory = false;
    gameState.selected = null;
    gameState.path = [];
    gameState.pathTimer = 0;
    
    // 初始化棋盘
    initGrid();
    
    // 设置 Canvas 大小
    canvas.width = gameState.cols * gameState.cellSize + 20;
    canvas.height = gameState.rows * gameState.cellSize + 20;
    
    // 更新界面
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('levelName').textContent = config.name;
    document.getElementById('score').textContent = '0';
    document.getElementById('time').textContent = gameState.timeLeft;
    
    // 清除之前的定时器
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // 启动计时器
    gameState.timerInterval = setInterval(updateTimer, 1000);
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

// 初始化棋盘
function initGrid() {
    const totalCells = gameState.rows * gameState.cols;
    const pairs = totalCells / 2;
    
    let tiles = [];
    for (let i = 0; i < pairs; i++) {
        const tileType = i % CHARACTERS.length;
        tiles.push(tileType, tileType);
    }
    
    // 打乱
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // 填充棋盘
    gameState.grid = [];
    let idx = 0;
    for (let row = 0; row < gameState.rows; row++) {
        const rowData = [];
        for (let col = 0; col < gameState.cols; col++) {
            rowData.push(tiles[idx++]);
        }
        gameState.grid.push(rowData);
    }
}

// 更新计时器
function updateTimer() {
    if (gameState.gameOver || gameState.victory) return;
    
    gameState.timeLeft--;
    document.getElementById('time').textContent = gameState.timeLeft;
    
    if (gameState.timeLeft <= 0) {
        gameOver();
    }
}

// 游戏主循环
function gameLoop() {
    if (gameState.gameOver || gameState.victory) return;
    
    draw();
    
    // 更新路径显示
    if (gameState.pathTimer > 0) {
        gameState.pathTimer--;
        if (gameState.pathTimer === 0) {
            gameState.path = [];
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const offsetX = 10;
    const offsetY = 10;
    
    // 绘制路径
    if (gameState.path.length >= 2 && gameState.pathTimer > 0) {
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < gameState.path.length; i++) {
            const [row, col] = gameState.path[i];
            const x = offsetX + col * gameState.cellSize + gameState.cellSize / 2;
            const y = offsetY + row * gameState.cellSize + gameState.cellSize / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // 绘制方块
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.grid[row][col] !== -1) {
                const selected = gameState.selected && 
                    gameState.selected[0] === row && 
                    gameState.selected[1] === col;
                drawTile(row, col, gameState.grid[row][col], selected, offsetX, offsetY);
            }
        }
    }
}

// 绘制单个方块
function drawTile(row, col, tileType, selected, offsetX, offsetY) {
    const char = CHARACTERS[tileType];
    const x = offsetX + col * gameState.cellSize;
    const y = offsetY + row * gameState.cellSize;
    const size = gameState.cellSize - 4;
    
    // 选中效果
    if (selected) {
        ctx.fillStyle = '#FFFF96';
        ctx.fillRect(x - 3, y - 3, size + 6, size + 6);
    }
    
    // 外框
    ctx.fillStyle = '#646464';
    ctx.fillRect(x, y, size, size);
    
    // 背景
    ctx.fillStyle = char.color;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 3;
    
    // 脸部颜色
    let faceColor = char.color;
    if (char.feature === 'wolf') faceColor = '#646464';
    else if (char.feature === 'baby') faceColor = '#DCDCDC';
    
    // 绘制脸（圆形）
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = faceColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制角
    ctx.fillStyle = char.hornColor;
    ctx.beginPath();
    ctx.ellipse(centerX - radius + 5, centerY - radius, 4, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + radius - 5, centerY - radius, 4, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // 根据特征绘制
    switch (char.feature) {
        case 'cute': // 美羊羊 - 蝴蝶结
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.ellipse(centerX - 6, centerY - radius - 5, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX + 6, centerY - radius - 5, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, centerY - radius - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'lazy': // 懒羊羊 - 便便发型
            ctx.fillStyle = '#FFC864';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - radius - 8, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - radius - 12, 5, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'old': // 慢羊羊 - 眼镜和草
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(centerX - 6, centerY - 2, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX + 6, centerY - 2, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 1, centerY - 2);
            ctx.lineTo(centerX + 1, centerY - 2);
            ctx.stroke();
            // 草
            ctx.strokeStyle = '#32CD32';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius);
            ctx.lineTo(centerX, centerY - radius - 8);
            ctx.stroke();
            break;
        case 'strong': // 沸羊羊 - 粗眉毛
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX - 10, centerY - 8);
            ctx.lineTo(centerX - 2, centerY - 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX + 2, centerY - 6);
            ctx.lineTo(centerX + 10, centerY - 8);
            ctx.stroke();
            break;
        case 'wolf': // 灰太狼 - 伤疤
            ctx.strokeStyle = '#502828';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + 3, centerY - 5);
            ctx.lineTo(centerX + 10, centerY + 2);
            ctx.stroke();
            break;
        case 'queen': // 红太狼 - 皇冠
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(centerX - 8, centerY - radius + 5);
            ctx.lineTo(centerX - 4, centerY - radius - 5);
            ctx.lineTo(centerX, centerY - radius + 5);
            ctx.lineTo(centerX + 4, centerY - radius - 5);
            ctx.lineTo(centerX + 8, centerY - radius + 5);
            ctx.closePath();
            ctx.fill();
            break;
    }
    
    // 眼睛
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(centerX - 5, centerY, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + 5, centerY, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = (char.feature === 'wolf' || char.feature === 'baby') ? '#FFFFFF' : '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 5, centerY + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子和嘴巴
    ctx.fillStyle = '#FF9696';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 8, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
}

// 处理点击事件
canvas.addEventListener('click', (e) => {
    if (gameState.gameOver || gameState.victory) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const offsetX = 10;
    const offsetY = 10;
    
    const col = Math.floor((x - offsetX) / gameState.cellSize);
    const row = Math.floor((y - offsetY) / gameState.cellSize);
    
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;
    if (gameState.grid[row][col] === -1) return;
    
    if (!gameState.selected) {
        gameState.selected = [row, col];
    } else {
        const [sr, sc] = gameState.selected;
        
        if (sr === row && sc === col) {
            gameState.selected = null;
            return;
        }
        
        const path = findPath([sr, sc], [row, col]);
        if (path) {
            // 消除
            gameState.grid[sr][sc] = -1;
            gameState.grid[row][col] = -1;
            gameState.score += 10;
            document.getElementById('score').textContent = gameState.score;
            gameState.path = path;
            gameState.pathTimer = 15;
            
            // 检查胜利
            if (checkWin()) {
                victory();
            }
        }
        
        gameState.selected = null;
    }
});

// 检查是否在棋盘内
function inGrid(r, c) {
    return r >= 0 && r < gameState.rows && c >= 0 && c < gameState.cols;
}

// 直接连接检查
function canConnectDirect(start, end) {
    const [r1, c1] = start;
    const [r2, c2] = end;
    
    if (r1 === r2) {
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
            if (inGrid(r1, c) && gameState.grid[r1][c] !== -1) return false;
        }
        return true;
    }
    
    if (c1 === c2) {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            if (inGrid(r, c1) && gameState.grid[r][c1] !== -1) return false;
        }
        return true;
    }
    
    return false;
}

// 一个拐角连接检查
function canConnectOneCorner(start, end) {
    const [r1, c1] = start;
    const [r2, c2] = end;
    
    const corners = [[r1, c2], [r2, c1]];
    
    for (const [cr, cc] of corners) {
        const cornerValid = !inGrid(cr, cc) || gameState.grid[cr][cc] === -1 || 
            (cr === end[0] && cc === end[1]);
        if (cornerValid) {
            if (canConnectDirect(start, [cr, cc]) && canConnectDirect([cr, cc], end)) {
                return [cr, cc];
            }
        }
    }
    
    return null;
}

// 两个拐角连接检查
function canConnectTwoCorners(start, end) {
    for (let r = -1; r <= gameState.rows; r++) {
        for (let c = -1; c <= gameState.cols; c++) {
            if (inGrid(r, c) && gameState.grid[r][c] !== -1) continue;
            
            if (!canConnectDirect(start, [r, c])) continue;
            
            const corner = canConnectOneCorner([r, c], end);
            if (corner) {
                return [[r, c], corner];
            }
        }
    }
    return null;
}

// 查找路径
function findPath(start, end) {
    if (start[0] === end[0] && start[1] === end[1]) return null;
    
    const [r1, c1] = start;
    const [r2, c2] = end;
    if (gameState.grid[r1][c1] !== gameState.grid[r2][c2]) return null;
    
    if (canConnectDirect(start, end)) return [start, end];
    
    const corner = canConnectOneCorner(start, end);
    if (corner) return [start, corner, end];
    
    const corners = canConnectTwoCorners(start, end);
    if (corners) return [start, ...corners, end];
    
    return null;
}

// 检查是否获胜
function checkWin() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.grid[row][col] !== -1) return false;
        }
    }
    return true;
}

// 通关
function victory() {
    gameState.victory = true;
    clearInterval(gameState.timerInterval);
    
    // 解锁下一关
    if (gameState.currentLevel + 1 >= gameState.maxUnlockedLevel) {
        gameState.maxUnlockedLevel = Math.min(10, gameState.currentLevel + 2);
    }
    
    document.getElementById('victoryScreen').classList.add('active');
}

// 游戏结束
function gameOver() {
    gameState.gameOver = true;
    clearInterval(gameState.timerInterval);
    document.getElementById('gameOverScreen').classList.add('active');
}

// 下一关
function nextLevel() {
    document.getElementById('victoryScreen').classList.remove('active');
    if (gameState.currentLevel < 9) {
        startLevel(gameState.currentLevel + 1);
    } else {
        backToMenu();
    }
}

// 重试本关
function retryLevel() {
    document.getElementById('gameOverScreen').classList.remove('active');
    startLevel(gameState.currentLevel);
}

// 返回菜单
function backToMenu() {
    clearInterval(gameState.timerInterval);
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('victoryScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('menuScreen').style.display = 'block';
    initMenu();
}

// 退出游戏
function exitGame() {
    if (confirm('确定要退出游戏吗？')) {
        window.close();
    }
}

// 初始化
initMenu();
