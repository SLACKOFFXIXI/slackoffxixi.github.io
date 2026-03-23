import pygame
import random
import sys
import os
from typing import List, Tuple, Optional

# 初始化 Pygame
pygame.init()

# 游戏常量
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 800

# 颜色定义
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
DARK_GRAY = (100, 100, 100)
GREEN = (100, 200, 100)
LIGHT_GREEN = (150, 255, 150)
RED = (255, 100, 100)
YELLOW = (255, 255, 150)
BLUE = (100, 150, 255)
ORANGE = (255, 180, 100)
PURPLE = (180, 100, 200)

# 图片文件夹路径
IMAGES_DIR = "images"

# 加载图片文件列表
def load_image_files():
    """加载images文件夹中的所有图片文件"""
    image_files = []
    if os.path.exists(IMAGES_DIR):
        for filename in os.listdir(IMAGES_DIR):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
                image_files.append(os.path.join(IMAGES_DIR, filename))
    return image_files

# 加载并缩放图片
def load_and_scale_image(image_path, size):
    """加载图片并缩放到指定大小"""
    try:
        image = pygame.image.load(image_path)
        return pygame.transform.smoothscale(image, (size, size))
    except Exception as e:
        print(f"加载图片失败 {image_path}: {e}")
        return None

# 关卡配置：行数、列数、时间限制(秒)
LEVELS = [
    {"name": "第1关 初入羊村", "rows": 4, "cols": 6, "time": 60, "cell_size": 80},
    {"name": "第2关 青青草原", "rows": 5, "cols": 8, "time": 90, "cell_size": 70},
    {"name": "第3关 狼堡外围", "rows": 6, "cols": 8, "time": 120, "cell_size": 65},
    {"name": "第4关 森林探险", "rows": 6, "cols": 10, "time": 150, "cell_size": 60},
    {"name": "第5关 河边对决", "rows": 7, "cols": 10, "time": 180, "cell_size": 55},
    {"name": "第6关 山洞迷宫", "rows": 7, "cols": 12, "time": 210, "cell_size": 50},
    {"name": "第7关 云端之战", "rows": 8, "cols": 12, "time": 240, "cell_size": 50},
    {"name": "第8关 终极挑战", "rows": 8, "cols": 14, "time": 270, "cell_size": 45},
    {"name": "第9关 狼堡深处", "rows": 9, "cols": 14, "time": 300, "cell_size": 45},
    {"name": "第10关 羊狼和平", "rows": 10, "cols": 16, "time": 360, "cell_size": 40},
]


class LianLianKanGame:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("摸鱼连连看 - 喜羊羊与灰太狼")
        self.clock = pygame.time.Clock()
        # 尝试使用支持中文的字体
        available_fonts = pygame.font.get_fonts()
        
        # 优先查找的中文字体
        chinese_fonts = [
            "hiraginosansgb",  # macOS 冬青黑体
            "stheiti", "stheitilight", "stheitimedium",  # macOS 华文黑体
            "pingfang",  # macOS 苹方
            "heiti",  # 黑体
            "simhei", "microsoftyahei", "simsun",  # Windows
            "notosanscjk", "wenquanyimicrohei",  # Linux
        ]
        
        font_name = None
        for cf in chinese_fonts:
            for available in available_fonts:
                if cf in available.lower():
                    font_name = available
                    break
            if font_name:
                break
        
        if font_name is None:
            font_name = pygame.font.get_default_font()
        
        print(f"Using font: {font_name}")
        
        self.font = pygame.font.SysFont(font_name, 24)
        self.big_font = pygame.font.SysFont(font_name, 48)
        self.title_font = pygame.font.SysFont(font_name, 72)
        self.small_font = pygame.font.SysFont(font_name, 18)
        
        # 加载图片
        self.image_files = load_image_files()
        self.tile_images = {}  # 缓存不同大小的图片
        
        # 游戏状态
        self.grid: List[List[int]] = []
        self.selected: Optional[Tuple[int, int]] = None
        self.score = 0
        self.time_left = 60
        self.game_over = False
        self.victory = False
        self.path: List[Tuple[int, int]] = []
        self.path_timer = 0
        
        # 关卡系统
        self.current_level = 0
        self.max_unlocked_level = 1
        self.game_state = "MENU"
        
        # 当前关卡配置
        self.grid_rows = 4
        self.grid_cols = 6
        self.cell_size = 80
        
        # 通关提示
        self.show_victory = False
        self.victory_timer = 0
    
    def get_tile_image(self, tile_type, size):
        """获取指定类型和大小的图片"""
        cache_key = (tile_type, size)
        if cache_key not in self.tile_images:
            if self.image_files:
                # 使用实际图片，循环使用
                image_path = self.image_files[tile_type % len(self.image_files)]
                image = load_and_scale_image(image_path, size - 8)  # 留一些边距
                self.tile_images[cache_key] = image
            else:
                self.tile_images[cache_key] = None
        return self.tile_images[cache_key]
    
    def init_level(self, level_idx: int):
        """初始化指定关卡"""
        self.current_level = level_idx
        level_config = LEVELS[level_idx]
        
        self.grid_rows = level_config["rows"]
        self.grid_cols = level_config["cols"]
        self.time_left = level_config["time"]
        self.cell_size = level_config["cell_size"]
        
        total_cells = self.grid_rows * self.grid_cols
        pairs = total_cells // 2
        
        tiles = []
        for i in range(pairs):
            tile_type = i % len(CHARACTERS)
            tiles.extend([tile_type, tile_type])
        
        random.shuffle(tiles)
        
        self.grid = []
        idx = 0
        for row in range(self.grid_rows):
            row_data = []
            for col in range(self.grid_cols):
                row_data.append(tiles[idx])
                idx += 1
            self.grid.append(row_data)
        
        self.selected = None
        self.score = 0
        self.game_over = False
        self.victory = False
        self.path = []
        self.path_timer = 0
        self.show_victory = False
        self.victory_timer = 0
    
    def get_board_offset(self) -> Tuple[int, int]:
        """计算棋盘居中偏移量"""
        board_width = self.grid_cols * self.cell_size
        board_height = self.grid_rows * self.cell_size
        offset_x = (SCREEN_WIDTH - board_width) // 2
        offset_y = (SCREEN_HEIGHT - board_height) // 2 + 20
        return offset_x, offset_y
    
    def get_cell_rect(self, row: int, col: int) -> pygame.Rect:
        """获取单元格的矩形区域"""
        offset_x, offset_y = self.get_board_offset()
        x = offset_x + col * self.cell_size
        y = offset_y + row * self.cell_size
        return pygame.Rect(x, y, self.cell_size - 4, self.cell_size - 4)
    
    def get_cell_at_pos(self, pos: Tuple[int, int]) -> Optional[Tuple[int, int]]:
        """根据鼠标位置获取单元格坐标"""
        x, y = pos
        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                rect = self.get_cell_rect(row, col)
                if rect.collidepoint(x, y):
                    return (row, col)
        return None
    
    def draw_tile(self, row: int, col: int, tile_type: int, selected: bool = False):
        """绘制一个角色头像"""
        rect = self.get_cell_rect(row, col)
        
        if selected:
            pygame.draw.rect(self.screen, YELLOW, rect.inflate(6, 6), border_radius=10)
        
        pygame.draw.rect(self.screen, DARK_GRAY, rect, border_radius=8)
        inner_rect = rect.inflate(-4, -4)
        
        # 尝试加载图片
        image = self.get_tile_image(tile_type, self.cell_size)
        
        if image:
            # 使用真实图片
            image_rect = image.get_rect(center=inner_rect.center)
            self.screen.blit(image, image_rect)
        else:
            # 备用：绘制简单的彩色方块
            colors = [BLUE, GREEN, RED, ORANGE, PURPLE, (255, 100, 100), (100, 255, 100), (100, 100, 255)]
            color = colors[tile_type % len(colors)]
            pygame.draw.rect(self.screen, color, inner_rect, border_radius=6)
            # 绘制类型编号
            text = self.small_font.render(str(tile_type + 1), True, WHITE)
            text_rect = text.get_rect(center=inner_rect.center)
            self.screen.blit(text, text_rect)
    
    def draw_path_line(self):
        """绘制连接路径"""
        if len(self.path) < 2 or self.path_timer <= 0:
            return
        
        points = []
        for row, col in self.path:
            rect = self.get_cell_rect(row, col)
            center = rect.center
            points.append(center)
        
        if len(points) >= 2:
            pygame.draw.lines(self.screen, RED, False, points, 4)
    
    def in_grid(self, r: int, c: int) -> bool:
        """检查坐标是否在棋盘内"""
        return 0 <= r < self.grid_rows and 0 <= c < self.grid_cols
    
    def can_connect_direct(self, start: Tuple[int, int], end: Tuple[int, int]) -> bool:
        """检查是否可以直接水平或垂直连接"""
        r1, c1 = start
        r2, c2 = end
        
        if r1 == r2:
            min_c, max_c = min(c1, c2), max(c1, c2)
            for c in range(min_c + 1, max_c):
                if self.in_grid(r1, c) and self.grid[r1][c] != -1:
                    return False
            return True
        
        if c1 == c2:
            min_r, max_r = min(r1, r2), max(r1, r2)
            for r in range(min_r + 1, max_r):
                if self.in_grid(r, c1) and self.grid[r][c1] != -1:
                    return False
            return True
        
        return False
    
    def can_connect_one_corner(self, start: Tuple[int, int], end: Tuple[int, int]) -> Optional[Tuple[int, int]]:
        """检查是否可以通过一个拐角连接"""
        r1, c1 = start
        r2, c2 = end
        
        corners = [(r1, c2), (r2, c1)]
        
        for corner in corners:
            cr, cc = corner
            corner_valid = not self.in_grid(cr, cc) or self.grid[cr][cc] == -1 or corner == end
            if corner_valid:
                if self.can_connect_direct(start, corner) and self.can_connect_direct(corner, end):
                    return corner
        
        return None
    
    def can_connect_two_corners(self, start: Tuple[int, int], end: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """检查是否可以通过两个拐角连接"""
        r1, c1 = start
        r2, c2 = end
        
        for r in range(-1, self.grid_rows + 1):
            for c in range(-1, self.grid_cols + 1):
                if self.in_grid(r, c) and self.grid[r][c] != -1:
                    continue
                
                mid1 = (r, c)
                if not self.can_connect_direct(start, mid1):
                    continue
                
                corner = self.can_connect_one_corner(mid1, end)
                if corner:
                    return [mid1, corner]
        
        return None
    
    def find_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """查找两个点之间的连接路径"""
        if start == end:
            return None
        
        r1, c1 = start
        r2, c2 = end
        if self.grid[r1][c1] != self.grid[r2][c2]:
            return None
        
        if self.can_connect_direct(start, end):
            return [start, end]
        
        corner = self.can_connect_one_corner(start, end)
        if corner:
            return [start, corner, end]
        
        corners = self.can_connect_two_corners(start, end)
        if corners:
            return [start] + corners + [end]
        
        return None
    
    def check_win(self) -> bool:
        """检查是否获胜"""
        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                if self.grid[row][col] != -1:
                    return False
        return True
    
    def handle_click(self, pos: Tuple[int, int]):
        """处理鼠标点击"""
        if self.game_over or self.show_victory:
            return
        
        cell = self.get_cell_at_pos(pos)
        if cell is None:
            return
        
        row, col = cell
        if self.grid[row][col] == -1:
            return
        
        if self.selected is None:
            self.selected = cell
        else:
            if self.selected == cell:
                self.selected = None
                return
            
            path = self.find_path(self.selected, cell)
            if path:
                sr, sc = self.selected
                er, ec = cell
                self.grid[sr][sc] = -1
                self.grid[er][ec] = -1
                self.score += 10
                self.path = path
                self.path_timer = 15
                
                if self.check_win():
                    self.victory = True
                    self.show_victory = True
                    self.victory_timer = 180
                    if self.current_level + 1 >= self.max_unlocked_level:
                        self.max_unlocked_level = min(10, self.current_level + 2)
            
            self.selected = None
    
    def draw_menu(self):
        """绘制主菜单"""
        self.screen.fill((240, 248, 255))
        
        # 标题
        title = self.title_font.render("摸鱼连连看", True, BLUE)
        self.screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 80))
        
        subtitle = self.big_font.render("喜羊羊与灰太狼", True, ORANGE)
        self.screen.blit(subtitle, (SCREEN_WIDTH // 2 - subtitle.get_width() // 2, 170))
        
        # 绘制关卡按钮
        button_width = 160
        button_height = 60
        cols = 5
        start_x = (SCREEN_WIDTH - cols * (button_width + 20)) // 2 + 10
        start_y = 300
        
        self.level_buttons = []
        
        for i in range(10):
            row = i // cols
            col = i % cols
            x = start_x + col * (button_width + 20)
            y = start_y + row * (button_height + 20)
            
            button_rect = pygame.Rect(x, y, button_width, button_height)
            self.level_buttons.append(button_rect)
            
            # 判断关卡是否解锁
            unlocked = i < self.max_unlocked_level
            
            if unlocked:
                color = GREEN if i == self.current_level else LIGHT_GREEN
                pygame.draw.rect(self.screen, color, button_rect, border_radius=10)
                pygame.draw.rect(self.screen, DARK_GRAY, button_rect, 2, border_radius=10)
                
                level_text = self.font.render(f"第{i+1}关", True, BLACK)
                self.screen.blit(level_text, (x + button_width//2 - level_text.get_width()//2, y + 15))
            else:
                pygame.draw.rect(self.screen, GRAY, button_rect, border_radius=10)
                pygame.draw.rect(self.screen, DARK_GRAY, button_rect, 2, border_radius=10)
                lock_text = self.font.render("锁定", True, DARK_GRAY)
                self.screen.blit(lock_text, (x + button_width//2 - lock_text.get_width()//2, y + 18))
        
        # 退出按钮
        exit_rect = pygame.Rect(SCREEN_WIDTH // 2 - 60, SCREEN_HEIGHT - 150, 120, 40)
        pygame.draw.rect(self.screen, RED, exit_rect, border_radius=8)
        pygame.draw.rect(self.screen, DARK_GRAY, exit_rect, 2, border_radius=8)
        exit_text = self.font.render("退出游戏", True, WHITE)
        self.screen.blit(exit_text, (exit_rect.centerx - exit_text.get_width()//2, exit_rect.centery - exit_text.get_height()//2))
        self.exit_button = exit_rect
        
        # 说明文字
        hint = self.small_font.render("点击关卡开始游戏，按 ESC 退出", True, DARK_GRAY)
        self.screen.blit(hint, (SCREEN_WIDTH // 2 - hint.get_width() // 2, SCREEN_HEIGHT - 80))
    
    def draw_game(self):
        """绘制游戏画面"""
        self.screen.fill(WHITE)
        
        # 关卡名称
        level_name = LEVELS[self.current_level]["name"]
        title = self.big_font.render(level_name, True, BLUE)
        self.screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 10))
        
        # 分数和时间
        score_text = self.font.render(f"分数: {self.score}", True, BLACK)
        self.screen.blit(score_text, (20, 60))
        
        minutes = self.time_left // 60
        seconds = self.time_left % 60
        time_color = RED if self.time_left <= 30 else BLACK
        time_text = self.font.render(f"时间: {minutes:02d}:{seconds:02d}", True, time_color)
        self.screen.blit(time_text, (SCREEN_WIDTH - 150, 60))
        
        # 返回按钮
        back_rect = pygame.Rect(20, 10, 80, 35)
        pygame.draw.rect(self.screen, GRAY, back_rect, border_radius=5)
        back_text = self.font.render("返回", True, BLACK)
        self.screen.blit(back_text, (35, 15))
        self.back_button = back_rect
        
        # 棋盘背景
        offset_x, offset_y = self.get_board_offset()
        board_rect = pygame.Rect(
            offset_x - 5,
            offset_y - 5,
            self.grid_cols * self.cell_size + 10,
            self.grid_rows * self.cell_size + 10
        )
        pygame.draw.rect(self.screen, GRAY, board_rect, border_radius=10)
        
        # 绘制路径
        self.draw_path_line()
        
        # 绘制方块
        for row in range(self.grid_rows):
            for col in range(self.grid_cols):
                if self.grid[row][col] != -1:
                    selected = (self.selected == (row, col))
                    self.draw_tile(row, col, self.grid[row][col], selected)
        
        # 通关提示
        if self.show_victory:
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            overlay.set_alpha(200)
            overlay.fill(WHITE)
            self.screen.blit(overlay, (0, 0))
            
            victory_text = self.title_font.render("恭喜过关！", True, GREEN)
            self.screen.blit(victory_text, (SCREEN_WIDTH // 2 - victory_text.get_width() // 2, 250))
            
            if self.current_level < 9:
                next_text = self.font.render("点击继续下一关", True, BLUE)
                self.screen.blit(next_text, (SCREEN_WIDTH // 2 - next_text.get_width() // 2, 350))
            else:
                all_clear = self.big_font.render("全部通关！", True, ORANGE)
                self.screen.blit(all_clear, (SCREEN_WIDTH // 2 - all_clear.get_width() // 2, 350))
        
        # 游戏结束画面
        if self.game_over and not self.show_victory:
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            overlay.set_alpha(200)
            overlay.fill(WHITE)
            self.screen.blit(overlay, (0, 0))
            
            text = self.big_font.render("时间到！游戏结束", True, RED)
            self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, SCREEN_HEIGHT // 2 - 50))
            
            restart_text = self.font.render("按 R 重试本关", True, BLACK)
            self.screen.blit(restart_text, (SCREEN_WIDTH // 2 - restart_text.get_width() // 2, SCREEN_HEIGHT // 2 + 20))
    
    def handle_menu_click(self, pos: Tuple[int, int]):
        """处理菜单点击"""
        # 检查退出按钮
        if hasattr(self, 'exit_button') and self.exit_button.collidepoint(pos):
            pygame.quit()
            sys.exit()
        
        # 检查关卡按钮
        for i, button in enumerate(self.level_buttons):
            if button.collidepoint(pos) and i < self.max_unlocked_level:
                self.init_level(i)
                self.game_state = "PLAYING"
                return
    
    def run(self):
        """游戏主循环"""
        running = True
        frame_count = 0
        
        while running:
            frame_count += 1
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    if event.button == 1:
                        if self.game_state == "MENU":
                            self.handle_menu_click(event.pos)
                        elif self.game_state == "PLAYING":
                            if hasattr(self, 'back_button') and self.back_button.collidepoint(event.pos):
                                self.game_state = "MENU"
                            elif self.show_victory:
                                if self.current_level < 9:
                                    self.init_level(self.current_level + 1)
                                else:
                                    self.game_state = "MENU"
                            else:
                                self.handle_click(event.pos)
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        if self.game_state == "PLAYING":
                            self.game_state = "MENU"
                        else:
                            running = False
                    elif event.key == pygame.K_r and self.game_state == "PLAYING":
                        if self.game_over:
                            self.init_level(self.current_level)
            
            # 更新路径显示
            if self.path_timer > 0:
                self.path_timer -= 1
                if self.path_timer == 0:
                    self.path = []
            
            # 更新通关提示
            if self.show_victory:
                self.victory_timer -= 1
                if self.victory_timer <= 0:
                    self.show_victory = False
                    if self.current_level < 9:
                        self.init_level(self.current_level + 1)
                    else:
                        self.game_state = "MENU"
            
            # 更新倒计时
            if self.game_state == "PLAYING" and not self.game_over and not self.show_victory:
                if frame_count % 60 == 0:
                    self.time_left -= 1
                    if self.time_left <= 0:
                        self.game_over = True
            
            # 绘制
            if self.game_state == "MENU":
                self.draw_menu()
            else:
                self.draw_game()
            
            pygame.display.flip()
            self.clock.tick(60)
        
        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    game = LianLianKanGame()
    game.run()
