/**
 * game.js
 * Основной файл игры, отвечающий за игровой цикл,
 * взаимодействие с пользователем и связь всех компонентов.
 */

// Основной класс игры
class Game {
    constructor() {
        // Размеры игрового поля
        this.width = 1080;
        this.height = 1920;
        
        // Позиция верхней линии (граница проигрыша)
        this.topLine = 300;
        
        // Получаем холсты из DOM
        this.gameCanvas = document.getElementById('game-canvas');
        this.bgCanvas = document.getElementById('background-canvas');
        
        // Создаем экземпляры компонентов игры
        this.physics = new Physics(this.width, this.height, this.topLine, this);
        this.renderer = new Renderer(this.gameCanvas, this.bgCanvas, this.width, this.height, this.topLine);
        this.ui = new UI(this, this.renderer);
        this.ads = new Ads(this);
        
        // Игровые переменные
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.lastTime = 0;
        this.spawnCooldown = 0;
        
        // Бонусы
        this.bonus1Cooldown = 0; // Дезинтеграция
        this.bonus2Cooldown = 0; // Бомба
        this.activatedBonus = null; // Активированный бонус (для бомбы нужен второй клик)
        
        // Инициализация обработчиков событий
        this.initEventListeners();
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Клик/тап для спавна объектов и взаимодействия с UI
        this.gameCanvas.addEventListener('click', (e) => {
            if (this.gameOver || this.paused || this.ads.isAdShowing()) return;
            
            // Получаем координаты клика с учетом масштабирования
            const rect = this.gameCanvas.getBoundingClientRect();
            const scaleX = this.gameCanvas.width / rect.width;
            const scaleY = this.gameCanvas.height / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            console.log('Клик по координатам:', x, y);
            
            // Проверяем, попал ли клик на элементы UI
            const clickedUI = this.ui.handleClick(x, y);
            console.log('Клик по UI:', clickedUI);
            
            if (!clickedUI) {
                // Если у нас активирован бонус "Бомба", используем его
                if (this.activatedBonus === 'bomb') {
                    this.useBomb(x, y);
                    this.activatedBonus = null;
                    console.log('Использована бомба в координатах:', x, y);
                } else {
                    // Иначе спавним объект, если не на кулдауне
                    if (this.spawnCooldown <= 0) {
                        // Спавним объект наверху в позиции клика по X
                        const obj = this.spawnObject(x);
                        console.log('Создан объект:', obj);
                        
                        // Устанавливаем кулдаун спавна (200 мс)
                        this.spawnCooldown = 200;
                    } else {
                        console.log('Спавн на кулдауне:', this.spawnCooldown);
                    }
                }
            }
        });
        
        // Обрабатываем нажатия клавиш (пауза и др.)
        document.addEventListener('keydown', (e) => {
            // Пауза по клавише P или Escape
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });
    }

    // Инициализация игры
    async init() {
        // Загружаем настройки
        this.ui.loadSettings();
        
        // Настраиваем размеры холстов
        this.setupCanvas();
        
        // Инициализируем рекламу
        await this.ads.init();
        
        // Показываем вступительную рекламу
        await this.ads.showInitialAd();
        
        // Создаем первый объект для демонстрации
        this.spawnObject(this.width / 2);
        
        // Запускаем игровой цикл
        this.gameLoop(0);
        
        console.log('Игра инициализирована');
    }
    
    // Настройка холстов и масштабирования
    setupCanvas() {
        // Устанавливаем размеры холстов
        this.gameCanvas.width = this.width;
        this.gameCanvas.height = this.height;
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        
        // Сохраняем соотношение сторон при ресайзе
        const updateCanvasSize = () => {
            const container = document.getElementById('game-container');
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            const scale = Math.min(
                containerWidth / this.width,
                containerHeight / this.height
            );
            
            this.gameCanvas.style.width = `${this.width * scale}px`;
            this.gameCanvas.style.height = `${this.height * scale}px`;
            this.bgCanvas.style.width = `${this.width * scale}px`;
            this.bgCanvas.style.height = `${this.height * scale}px`;
            
            console.log(`Масштабирование холста: ${scale}, размеры: ${this.width}x${this.height}`);
        };
        
        // Обновляем размер при загрузке и ресайзе
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    // Игровой цикл
    gameLoop(timestamp) {
        // Рассчитываем deltaTime с момента последнего кадра
        const deltaTime = this.lastTime ? timestamp - this.lastTime : 0;
        this.lastTime = timestamp;
        
        // Если игра на паузе, просто перерисовываем текущее состояние
        if (!this.paused && !this.ads.isAdShowing()) {
            // Уменьшаем счетчики кулдаунов
            if (this.spawnCooldown > 0) {
                this.spawnCooldown -= deltaTime;
            }
            
            if (this.bonus1Cooldown > 0) {
                this.bonus1Cooldown -= deltaTime;
                if (this.bonus1Cooldown < 0) this.bonus1Cooldown = 0;
            }
            
            if (this.bonus2Cooldown > 0) {
                this.bonus2Cooldown -= deltaTime;
                if (this.bonus2Cooldown < 0) this.bonus2Cooldown = 0;
            }
            
            // Обновляем физику объектов
            this.physics.update(deltaTime);
            
            // Проверяем условие проигрыша
            if (this.physics.checkGameOver() && !this.gameOver) {
                this.handleGameOver();
            }
            
            // Проверяем, не нужно ли показать периодическую рекламу
            this.ads.checkPeriodicAd();
        }
        
        // Рендерим текущее состояние игры
        this.renderer.render(
            this.physics.objects,
            this.score,
            this.bonus1Cooldown,
            this.bonus2Cooldown,
            deltaTime
        );
        
        // Запрашиваем следующий кадр
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Спавн нового объекта
    spawnObject(x) {
        // Ограничиваем координату X пределами игрового поля
        const safeX = Math.max(150, Math.min(this.width - 150, x));
        
        // Спавним объект в верхней части экрана (y = 0) по указанной X-координате
        const obj = this.physics.createObject(safeX, 50);
        
        // Даем случайную начальную скорость по X для разнообразия
        obj.vx = (Math.random() - 0.5) * 2;
        
        console.log('Создан объект на координатах:', safeX, 50, 'с уровнем:', obj.level);
        
        return obj;
    }

    // Обработка проигрыша
    async handleGameOver() {
        this.gameOver = true;
        console.log('Игра окончена. Счет:', this.score);
        
        // Показываем рекламу для продолжения
        const continueGame = await this.ads.showContinueAd();
        
        if (continueGame) {
            // Если игрок посмотрел рекламу, удаляем 50% объектов
            this.removeHalfObjects();
            this.gameOver = false;
        } else {
            // Иначе перезапускаем игру
            this.restart();
        }
    }

    // Удаление половины объектов (при продолжении игры после просмотра рекламы)
    removeHalfObjects() {
        // Сортируем объекты по Y (сверху вниз)
        const sortedObjects = [...this.physics.objects].sort((a, b) => a.y - b.y);
        
        // Удаляем половину верхних объектов
        const removeCount = Math.ceil(sortedObjects.length / 2);
        for (let i = 0; i < removeCount; i++) {
            sortedObjects[i].toRemove = true;
        }
    }

    // Перезапуск игры
    restart() {
        // Сбрасываем игровые переменные
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.spawnCooldown = 0;
        this.bonus1Cooldown = 0;
        this.bonus2Cooldown = 0;
        this.activatedBonus = null;
        
        // Очищаем массив объектов
        this.physics.objects = [];
    }

    // Включение/выключение паузы
    togglePause() {
        this.paused = !this.paused;
        
        // Если игра приостановлена, показываем настройки
        if (this.paused) {
            this.ui.showSettings();
        } else {
            this.ui.hideSettings();
        }
    }

    // Постановка игры на паузу (для рекламы и т.д.)
    pause() {
        this.paused = true;
    }

    // Возобновление игры после паузы
    resume() {
        this.paused = false;
        this.lastTime = 0; // Сбрасываем время для deltaTime
    }

    // Активация бонуса
    activateBonus(type) {
        // Проверяем, есть ли кулдаун на бонусы
        if (this.bonus1Cooldown > 0 || this.bonus2Cooldown > 0) {
            console.log('Бонусы на перезарядке');
            return;
        }
        
        // Показываем рекламу для активации бонуса
        this.ads.showBonusAd(type).then(success => {
            if (success) {
                if (type === 'disintegration') {
                    this.useDisintegration();
                } else if (type === 'bomb') {
                    // Для бомбы запоминаем, что бонус активирован,
                    // и ждем следующий клик для определения места взрыва
                    this.activatedBonus = 'bomb';
                }
                
                // Устанавливаем общий кулдаун для обоих бонусов (60 секунд)
                this.bonus1Cooldown = 60000;
                this.bonus2Cooldown = 60000;
            }
        });
    }

    // Использование бонуса "Дезинтеграция"
    useDisintegration() {
        // Выбираем случайный уровень объектов для удаления
        const levels = this.physics.objects.map(obj => obj.level);
        const uniqueLevels = [...new Set(levels)];
        
        if (uniqueLevels.length === 0) return;
        
        const levelToRemove = uniqueLevels[Math.floor(Math.random() * uniqueLevels.length)];
        
        // Находим все объекты выбранного уровня
        const objectsToRemove = this.physics.objects.filter(obj => obj.level === levelToRemove);
        
        // Анимируем дезинтеграцию объектов
        this.renderer.animateDisintegration(objectsToRemove);
        
        // Удаляем объекты
        const removedCount = this.physics.removeObjectsByLevel(levelToRemove);
        
        // Начисляем очки за удаленные объекты
        this.score += removedCount * levelToRemove * 5;
        
        console.log(`Дезинтеграция: удалено ${removedCount} объектов уровня ${levelToRemove}`);
    }

    // Использование бонуса "Бомба"
    useBomb(x, y) {
        // Радиус взрыва - 20% ширины экрана
        const radius = this.width * 0.2;
        
        // Анимируем взрыв
        this.renderer.animateBomb(x, y, radius);
        
        // Удаляем объекты в радиусе
        const removedCount = this.physics.removeObjectsInRadius(x, y, radius);
        
        // Начисляем очки за удаленные объекты
        // (Здесь можно реализовать более сложную логику начисления очков)
        this.score += removedCount * 10;
        
        console.log(`Бомба: удалено ${removedCount} объектов`);
    }

    // Обновление счета (вызывается при слиянии объектов)
    updateScore(points) {
        this.score += points;
    }
}

// Ждем загрузки страницы и запускаем игру
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});