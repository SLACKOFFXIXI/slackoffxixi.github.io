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

// 图片配置 - 动态加载 images/1 文件夹中的图片
// 支持的图片格式
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

// 预定义可能的图片文件名格式
let IMAGE_FILES = [];
let loadedImages = {};

// 动态扫描并加载图片（并行加载优化）
async function scanAndLoadImages() {
    IMAGE_FILES = [];
    loadedImages = {};
    
    // 生成所有可能的图片路径
    const possibleImages = [];
    for (let i = 0; i <= 50; i++) {
        for (const ext of IMAGE_EXTENSIONS) {
            const filename = i === 0 ? `未命名${ext}` : `未命名 ${i}${ext}`;
            const encodedFilename = encodeURIComponent(filename);
            possibleImages.push(`images/1/${encodedFilename}`);
        }
    }
    
    console.log('开始并行加载图片...');
    const startTime = Date.now();
    
    // 并行加载所有图片（最多同时加载10张）
    const batchSize = 10;
    for (let i = 0; i < possibleImages.length; i += batchSize) {
        const batch = possibleImages.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(src => loadImage(src)));
        
        results.forEach((img, idx) => {
            if (img) {
                const index = IMAGE_FILES.length;
                IMAGE_FILES.push(batch[idx]);
                loadedImages[index] = img;
            }
        });
        
        // 每加载一批就更新进度
        console.log(`已加载 ${IMAGE_FILES.length} 张图片...`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`成功加载 ${IMAGE_FILES.length} 张图片，耗时 ${duration}ms`);
    return IMAGE_FILES.length > 0;
}

// 加载单张图片
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// 打乱数组（Fisher-Yates 算法）
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 显示加载提示
function showLoading(message) {
    const menuScreen = document.getElementById('menuScreen');
    if (menuScreen) {
        const existingLoading = menuScreen.querySelector('.loading-message');
        if (existingLoading) {
            existingLoading.textContent = message;
        } else {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-message';
            loadingDiv.style.cssText = 'color: #666; font-size: 18px; margin: 20px 0; padding: 20px;';
            loadingDiv.textContent = message;
            menuScreen.insertBefore(loadingDiv, menuScreen.firstChild);
        }
    }
}

// 隐藏加载提示
function hideLoading() {
    const loadingDiv = document.querySelector('.loading-message');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 页面加载时扫描图片
window.addEventListener('load', async () => {
    showLoading('正在加载图片资源...');
    await scanAndLoadImages();
    hideLoading();
    // 重新初始化菜单
    initMenu();
});

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

// 检测是否是微信浏览器
function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
}

// 计算自适应的格子大小
function calculateCellSize() {
    const config = LEVELS[gameState.currentLevel];
    
    // 获取可视区域大小（兼容微信浏览器）
    const screenWidth = Math.min(window.innerWidth, window.screen.availWidth || window.innerWidth);
    const screenHeight = Math.min(window.innerHeight, window.screen.availHeight || window.innerHeight);
    
    // 微信浏览器需要额外预留空间
    const isWX = isWeChat();
    const margin = isWX ? 20 : 40;
    const uiHeight = isWX ? 100 : 120; // 顶部信息栏高度
    
    // 计算可用空间
    const availableWidth = screenWidth - margin;
    const availableHeight = screenHeight - uiHeight - margin;
    
    // 根据棋盘大小和可用空间计算最佳格子大小
    const cellSizeByWidth = Math.floor(availableWidth / config.cols);
    const cellSizeByHeight = Math.floor(availableHeight / config.rows);
    
    // 取较小值，确保棋盘能完整显示
    let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
    
    // 微信浏览器中限制最大格子大小，避免超出屏幕
    const maxCellSize = isWX ? 60 : 80;
    cellSize = Math.max(30, Math.min(cellSize, maxCellSize));
    
    return cellSize;
}

// 开始关卡
function startLevel(levelIdx) {
    gameState.currentLevel = levelIdx;
    const config = LEVELS[levelIdx];
    gameState.rows = config.rows;
    gameState.cols = config.cols;
    gameState.timeLeft = config.time;
    gameState.cellSize = calculateCellSize();
    gameState.score = 0;
    gameState.gameOver = false;
    gameState.victory = false;
    gameState.selected = null;
    gameState.path = [];
    gameState.pathTimer = 0;
    
    // 初始化棋盘
    initGrid();
    
    // 设置 Canvas 大小
    resizeCanvas();
    
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

// 调整 Canvas 大小
function resizeCanvas() {
    const offsetX = 10;
    const offsetY = 10;
    const isWX = isWeChat();
    
    canvas.width = gameState.cols * gameState.cellSize + offsetX * 2;
    canvas.height = gameState.rows * gameState.cellSize + offsetY * 2;
    
    // 确保 Canvas 不超过屏幕宽度
    const margin = isWX ? 10 : 40;
    const maxWidth = Math.min(window.innerWidth, window.screen.availWidth || window.innerWidth) - margin;
    
    if (canvas.width > maxWidth) {
        const scale = maxWidth / canvas.width;
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (canvas.height * scale) + 'px';
    } else {
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    }
    
    // 微信浏览器中禁用页面滚动和缩放
    if (isWX) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
    }
}

// 监听屏幕旋转和大小变化
window.addEventListener('resize', () => {
    if (gameState.gameState === 'PLAYING' && !gameState.gameOver && !gameState.victory) {
        gameState.cellSize = calculateCellSize();
        resizeCanvas();
    }
});

// 初始化棋盘
function initGrid() {
    const totalCells = gameState.rows * gameState.cols;
    const pairs = totalCells / 2;
    
    // 如果没有图片，使用默认数字
    if (IMAGE_FILES.length === 0) {
        console.warn('没有加载到图片，使用默认数字');
    }
    
    // 随机选择图片索引并打乱
    let availableIndices = [];
    for (let i = 0; i < pairs; i++) {
        const imageIndex = i % Math.max(IMAGE_FILES.length, 1);
        availableIndices.push(imageIndex, imageIndex);
    }
    
    // 打乱图片索引
    availableIndices = shuffleArray(availableIndices);
    
    // 打乱并确保有可解路径
    let attempts = 0;
    let validGrid = false;
    
    while (!validGrid && attempts < 100) {
        // 再次打乱
        availableIndices = shuffleArray(availableIndices);
        
        // 填充棋盘
        gameState.grid = [];
        let idx = 0;
        for (let row = 0; row < gameState.rows; row++) {
            const rowData = [];
            for (let col = 0; col < gameState.cols; col++) {
                rowData.push(availableIndices[idx++]);
            }
            gameState.grid.push(rowData);
        }
        
        // 检查是否有至少一对可连接的方块
        if (hasValidPair()) {
            validGrid = true;
        }
        attempts++;
    }
}

// 检查棋盘上是否存在至少一对可连接的方块
function hasValidPair() {
    const positions = [];
    
    // 收集所有方块的位置
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.grid[row][col] !== -1) {
                positions.push([row, col, gameState.grid[row][col]]);
            }
        }
    }
    
    // 检查每一对相同类型的方块是否可以连接
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const [r1, c1, type1] = positions[i];
            const [r2, c2, type2] = positions[j];
            
            if (type1 === type2) {
                const path = findPath([r1, c1], [r2, c2]);
                if (path) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 重新洗牌剩余方块
function shuffleRemainingTiles() {
    // 收集所有剩余方块
    const remaining = [];
    const positions = [];
    
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.grid[row][col] !== -1) {
                remaining.push(gameState.grid[row][col]);
                positions.push([row, col]);
            }
        }
    }
    
    console.log('洗牌前剩余方块数:', remaining.length, '位置:', positions);
    
    // 如果只剩2个方块，把它们移到相邻位置确保可以直接连接
    if (remaining.length === 2) {
        const [r1, c1] = positions[0];
        const [r2, c2] = positions[1];
        
        console.log('两个方块当前位置:', [r1, c1], [r2, c2]);
        
        // 清空当前位置
        gameState.grid[r1][c1] = -1;
        gameState.grid[r2][c2] = -1;
        
        // 找到第一个空位放置第一个方块
        for (let row = 0; row < gameState.rows; row++) {
            for (let col = 0; col < gameState.cols - 1; col++) {
                if (gameState.grid[row][col] === -1 && gameState.grid[row][col + 1] === -1) {
                    gameState.grid[row][col] = remaining[0];
                    gameState.grid[row][col + 1] = remaining[1];
                    console.log('两个方块已移到水平相邻位置:', [row, col], [row, col + 1]);
                    return;
                }
            }
        }
        
        // 如果没找到水平相邻的空位，尝试垂直相邻
        for (let row = 0; row < gameState.rows - 1; row++) {
            for (let col = 0; col < gameState.cols; col++) {
                if (gameState.grid[row][col] === -1 && gameState.grid[row + 1][col] === -1) {
                    gameState.grid[row][col] = remaining[0];
                    gameState.grid[row + 1][col] = remaining[1];
                    console.log('两个方块已移到垂直相邻位置:', [row, col], [row + 1, col]);
                    return;
                }
            }
        }
        
        // 如果都没找到，恢复原位置
        console.log('警告：未找到相邻空位，恢复原位置');
        gameState.grid[r1][c1] = remaining[0];
        gameState.grid[r2][c2] = remaining[1];
        return;
    }
    
    // 打乱
    for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    
    // 重新放置
    for (let i = 0; i < positions.length; i++) {
        const [row, col] = positions[i];
        gameState.grid[row][col] = remaining[i];
    }
    
    // 如果洗牌后仍然没有可连接的，再次洗牌（最多10次避免死循环）
    if (!hasValidPair() && remaining.length > 2) {
        setTimeout(() => shuffleRemainingTiles(), 50);
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
    
    // 内框背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    
    // 获取对应的图片
    const imageIndex = tileType % IMAGE_FILES.length;
    const img = loadedImages[imageIndex];
    
    if (img && img.complete) {
        // 计算图片绘制区域（保持比例，居中显示）
        const padding = 4;
        const drawSize = size - padding * 2;
        const aspectRatio = img.width / img.height;
        
        let drawWidth, drawHeight;
        if (aspectRatio > 1) {
            drawWidth = drawSize;
            drawHeight = drawSize / aspectRatio;
        } else {
            drawWidth = drawSize * aspectRatio;
            drawHeight = drawSize;
        }
        
        const drawX = x + (size - drawWidth) / 2;
        const drawY = y + (size - drawHeight) / 2;
        
        // 绘制圆角图片
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 4);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    } else {
        // 图片未加载完成时显示备用颜色块
        const colors = ['#87CEEB', '#FFB6C1', '#90EE90', '#FFA07A', '#DDA0DD', '#F0E68C'];
        ctx.fillStyle = colors[imageIndex % colors.length];
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        
        // 显示编号
        ctx.fillStyle = '#333';
        ctx.font = `${Math.floor(size / 2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(imageIndex + 1, x + size / 2, y + size / 2);
    }
}

// 处理点击事件
canvas.addEventListener('click', (e) => {
    if (gameState.gameOver || gameState.victory) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const offsetX = 10;
    const offsetY = 10;
    
    const col = Math.floor((x - offsetX) / gameState.cellSize);
    const row = Math.floor((y - offsetY) / gameState.cellSize);
    
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;
    if (gameState.grid[row][col] === -1) return;
    
    if (!gameState.selected) {
        gameState.selected = [row, col];
        console.log('选中第一个方块:', row, col, '类型:', gameState.grid[row][col]);
    } else {
        const [sr, sc] = gameState.selected;
        
        if (sr === row && sc === col) {
            gameState.selected = null;
            return;
        }
        
        // 检查类型是否相同
        if (gameState.grid[sr][sc] !== gameState.grid[row][col]) {
            console.log('类型不同，无法消除');
            gameState.selected = null;
            return;
        }
        
        console.log('查找路径:', [sr, sc], '到', [row, col]);
        // 查找路径
        const path = findPath([sr, sc], [row, col]);
        console.log('路径结果:', path);
        
        if (path) {
            console.log('消除成功');
            // 消除
            gameState.grid[sr][sc] = -1;
            gameState.grid[row][col] = -1;
            gameState.score += 10;
            document.getElementById('score').textContent = gameState.score;
            gameState.path = path;
            gameState.pathTimer = 15;
            
            // 检查胜利
            if (checkWin()) {
                console.log('游戏胜利！');
                victory();
            } else {
                // 检查是否还有可连接的方块对，如果没有则重新洗牌
                console.log('检查是否有可连接的对...');
                if (!hasValidPair()) {
                    console.log('没有可连接的对，开始洗牌');
                    shuffleRemainingTiles();
                }
            }
        } else {
            console.log('无法连接，不能消除');
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
    
    // 如果起点或终点在棋盘外，允许直接连接（用于边界外路径）
    const startInGrid = inGrid(r1, c1);
    const endInGrid = inGrid(r2, c2);
    
    if (r1 === r2) {
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
            // 如果该位置在棋盘内且有方块，则不能连接
            if (inGrid(r1, c) && gameState.grid[r1][c] !== -1) return false;
        }
        return true;
    }
    
    if (c1 === c2) {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            // 如果该位置在棋盘内且有方块，则不能连接
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
    
    // 尝试两个拐角点：(r1, c2) 和 (r2, c1)
    const corners = [[r1, c2], [r2, c1]];
    
    for (const [cr, cc] of corners) {
        // 拐角点有效条件：在棋盘外，或在棋盘内且为空，或就是终点本身
        const cornerInGrid = inGrid(cr, cc);
        const cornerIsEmpty = !cornerInGrid || gameState.grid[cr][cc] === -1;
        const cornerIsEnd = (cr === r2 && cc === c2);
        
        if (cornerIsEmpty || cornerIsEnd) {
            // 检查 start -> corner -> end 是否都能直接连接
            const canStartToCorner = canConnectDirect(start, [cr, cc]);
            const canCornerToEnd = canConnectDirect([cr, cc], end);
            
            if (canStartToCorner && canCornerToEnd) {
                return [cr, cc];
            }
        }
    }
    
    return null;
}

// 两个拐角连接检查
function canConnectTwoCorners(start, end) {
    const [r1, c1] = start;
    const [r2, c2] = end;
    
    // 搜索所有可能的中间点（包括棋盘外一圈）
    for (let r = -1; r <= gameState.rows; r++) {
        for (let c = -1; c <= gameState.cols; c++) {
            // 跳过在棋盘内且被占用的点
            if (inGrid(r, c) && gameState.grid[r][c] !== -1) continue;
            
            // 检查 start 到中间点是否可以直接连接
            if (!canConnectDirect(start, [r, c])) continue;
            
            // 检查中间点到 end 是否可以通过一个拐角连接
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
    
    // 隐藏游戏界面和游戏容器，显示胜利界面
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('victoryScreen').classList.add('active');
    console.log('胜利界面已显示');
}

// 游戏结束
function gameOver() {
    gameState.gameOver = true;
    clearInterval(gameState.timerInterval);
    
    // 隐藏游戏界面和游戏容器，显示结束界面
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('active');
}

// 下一关
function nextLevel() {
    document.getElementById('victoryScreen').classList.remove('active');
    document.getElementById('gameContainer').style.display = 'flex';
    if (gameState.currentLevel < 9) {
        startLevel(gameState.currentLevel + 1);
    } else {
        backToMenu();
    }
}

// 重试本关
function retryLevel() {
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('gameContainer').style.display = 'flex';
    startLevel(gameState.currentLevel);
}

// 返回菜单
function backToMenu() {
    clearInterval(gameState.timerInterval);
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('victoryScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('gameContainer').style.display = 'flex';
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
