/**
 * game.js - Основная логика игры Matrix Drop
 * Отвечает за инициализацию игры, игровой цикл, управление состоянием
 */

// Константы и настройки
const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;
const LINE_Y = 300; // Верхняя линия (граница проигрыша)
const BOTTOM_Y = 1720; // Нижняя граница игрового поля (над панелью бонусов)

// Глобальные переменные
let canvas, ctx;
let lastFrameTime = 0;
let animationFrameId = null;

// Состояние игры
const gameState = {
    score: 0,
    objects: [],
    isGameOver: false,
    colorScheme: 'classic', // classic, cyberpunk, chaos
    bonusCooldown: 0,
    activeBonus: null
};

/**
 * Инициализация игры
 * Настраивает canvas, добавляет обработчики событий и запускает игровой цикл
 */
function initGame() {
    // Настройка canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Адаптация к размеру экрана
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Обработчики событий для игрового поля
    canvas.addEventListener('click', handleClick);
    
    // Инициализация пользовательского интерфейса
    UI.init();
    
    // Инициализация заглушек для рекламы и бонусов
    Ads.init();
    
    // Запуск игрового цикла
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Изменение размера canvas для адаптации к размеру экрана
 * Сохраняет пропорции 1080×1920
 */
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Вычисляем масштаб, сохраняя пропорции
    const scale = Math.min(
        containerWidth / GAME_WIDTH,
        containerHeight / GAME_HEIGHT
    );
    
    // Применяем масштаб
    const scaledWidth = GAME_WIDTH * scale;
    const scaledHeight = GAME_HEIGHT * scale;
    
    // Позиционируем canvas по центру
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
    canvas.style.left = `${(containerWidth - scaledWidth) / 2}px`;
    canvas.style.top = `${(containerHeight - scaledHeight) / 2}px`;
}

/**
 * Обработка клика/тапа
 * Создает новый объект, если игра активна
 */
function handleClick(event) {
    if (gameState.isGameOver) return;
    
    // Преобразование координат клика с учетом масштабирования
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    // Проверяем, что клик был выше верхней линии (Y < LINE_Y)
    if (clickY < LINE_Y) {
        // Создаем новый объект на верхней границе с случайным X
        createObject(clickX, 0);
    }
}

/**
 * Создание нового игрового объекта
 */
function createObject(x, y, level = 1) {
    const newObject = Physics.createObject(x, y, level);
    gameState.objects.push(newObject);
}

/**
 * Основной игровой цикл
 * Вызывается на каждом кадре анимации
 */
function gameLoop(timestamp) {
    // Расчет дельты времени между кадрами
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Обновление состояния игры
    update(deltaTime);
    
    // Отрисовка
    render();
    
    // Запрос следующего кадра, если игра не окончена
    if (!gameState.isGameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

/**
 * Обновление состояния игры
 * Обновляет физику, проверяет условия проигрыша и обновляет бонусы
 */
function update(deltaTime) {
    // Обновление физики объектов
    Physics.updateObjects(gameState.objects, deltaTime);
    
    // Проверка на слияния объектов
    const mergeResults = Physics.checkMerges(gameState.objects);
    
    // Добавление очков за слияния
    if (mergeResults.merges > 0) {
        gameState.score += mergeResults.points;
        UI.updateScore(gameState.score);
    }
    
    // Проверка на проигрыш
    checkGameOver();
    
    // Обновление кулдауна бонусов
    if (gameState.bonusCooldown > 0) {
        gameState.bonusCooldown -= deltaTime / 1000; // Перевод в секунды
        if (gameState.bonusCooldown <= 0) {
            gameState.bonusCooldown = 0;
        }
        UI.updateBonuses(gameState.bonusCooldown);
    }
}

/**
 * Проверка условий завершения игры
 * Игра завершается, если какой-либо объект пересекает верхнюю линию снизу и остается там
 */
function checkGameOver() {
    // Проверяем все объекты
    for (const obj of gameState.objects) {
        // Проверяем, что объект пересекает верхнюю линию снизу (y - radius < LINE_Y)
        // и его скорость настолько мала, что он останется выше линии
        if (obj.y - obj.radius < LINE_Y && Math.abs(obj.velocityY) < 0.5) {
            gameOver();
            break;
        }
    }
}

/**
 * Завершение игры
 * Останавливает игровой цикл и показывает сообщение о проигрыше
 */
function gameOver() {
    gameState.isGameOver = true;
    
    // Показать сообщение или экран проигрыша
    console.log("Игра завершена! Счет:", gameState.score);
    
    // Здесь можно добавить показ рекламы для продолжения игры
    // Ads.showAd(() => {
    //     resetGame();
    // });
}

/**
 * Сброс игры для нового раунда
 */
function resetGame() {
    gameState.score = 0;
    gameState.objects = [];
    gameState.isGameOver = false;
    gameState.bonusCooldown = 0;
    gameState.activeBonus = null;
    
    UI.updateScore(gameState.score);
    UI.updateBonuses(gameState.bonusCooldown);
    
    // Перезапуск игрового цикла, если он был остановлен
    if (!animationFrameId) {
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

/**
 * Отрисовка всех элементов игры
 */
function render() {
    // Очистка экрана
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка фона (матричный дождь)
    Renderer.renderBackground(ctx, gameState.colorScheme);
    
    // Отрисовка верхней линии (границы проигрыша)
    Renderer.renderBoundaryLine(ctx, LINE_Y);
    
    // Отрисовка объектов
    Renderer.renderObjects(ctx, gameState.objects);
    
    // Дополнительные эффекты (если активен бонус)
    if (gameState.activeBonus) {
        Renderer.renderBonusEffect(ctx, gameState.activeBonus);
    }
}

/**
 * Активация бонуса дезинтеграции
 * Удаляет все объекты одного уровня
 */
function activateDisintegration() {
    if (gameState.bonusCooldown > 0 || gameState.objects.length === 0) return;
    
    // Генерируем случайный уровень из имеющихся объектов
    const availableLevels = [...new Set(gameState.objects.map(obj => obj.level))];
    const targetLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)];
    
    // Фильтруем объекты этого уровня
    const targetObjects = gameState.objects.filter(obj => obj.level === targetLevel);
    
    // Если такие объекты есть, уничтожаем их
    if (targetObjects.length > 0) {
        // Устанавливаем активный бонус для визуальных эффектов
        gameState.activeBonus = {
            type: 'disintegration',
            targets: targetObjects,
            level: targetLevel,
            startTime: performance.now()
        };
        
        // Удаляем объекты через короткое время (для анимации)
        setTimeout(() => {
            // Удаляем все объекты с указанным уровнем
            gameState.objects = gameState.objects.filter(obj => obj.level !== targetLevel);
            gameState.activeBonus = null;
            
            // Устанавливаем кулдаун
            gameState.bonusCooldown = 60; // 60 секунд
            UI.updateBonuses(gameState.bonusCooldown);
            
            // Начисляем очки (10 * количество удаленных объектов * уровень)
            const points = 10 * targetObjects.length * targetLevel;
            gameState.score += points;
            UI.updateScore(gameState.score);
        }, 1000); // Задержка для эффекта
    }
}

/**
 * Активация бонуса бомбы
 * Удаляет объекты в указанном радиусе
 */
function activateBomb(x, y) {
    if (gameState.bonusCooldown > 0) return;
    
    // Радиус действия бомбы (20% ширины экрана)
    const radius = GAME_WIDTH * 0.2;
    
    // Фильтруем объекты в радиусе
    const targetObjects = gameState.objects.filter(obj => {
        // Расчет расстояния между центром бомбы и объектом
        const distance = Math.sqrt(Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2));
        return distance <= radius;
    });
    
    // Если есть объекты в радиусе, уничтожаем их
    if (targetObjects.length > 0) {
        // Устанавливаем активный бонус для визуальных эффектов
        gameState.activeBonus = {
            type: 'bomb',
            x: x,
            y: y,
            radius: radius,
            targets: targetObjects,
            startTime: performance.now()
        };
        
        // Удаляем объекты через короткое время (для анимации)
        setTimeout(() => {
            // Сохраняем ID объектов для удаления
            const targetIds = targetObjects.map(obj => obj.id);
            
            // Удаляем все объекты в радиусе бомбы
            gameState.objects = gameState.objects.filter(obj => !targetIds.includes(obj.id));
            gameState.activeBonus = null;
            
            // Устанавливаем кулдаун
            gameState.bonusCooldown = 60; // 60 секунд
            UI.updateBonuses(gameState.bonusCooldown);
            
            // Начисляем очки (5 * количество удаленных объектов)
            const points = 5 * targetObjects.length;
            gameState.score += points;
            UI.updateScore(gameState.score);
        }, 1000); // Задержка для эффекта
    }
}

// Экспорт функций и объектов для использования в других модулях
window.Game = {
    state: gameState,
    init: initGame,
    reset: resetGame,
    activateDisintegration: activateDisintegration,
    activateBomb: activateBomb
};

// Запуск игры при загрузке страницы
window.addEventListener('load', initGame);
