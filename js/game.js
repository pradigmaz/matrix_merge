/**
 * game.js - Основная логика игры
 * Объединяет все компоненты и реализует механику игры
 */

const Game = (function() {
    // Константы игры
    const ASPECT_RATIO = 11 / 16; // Соотношение сторон (ширина / высота) для вертикальной ориентации
    const MAX_DELTA_TIME = 100; // Максимальное время между кадрами в мс

    // Функция для правильного позиционирования UI
    function positionUIElements() {
        const dimensions = calculateGameDimensions();
        const gameWidth = dimensions.width;
        const gameHeight = dimensions.height;
        
        // Получаем элементы UI
        const scoreElement = document.getElementById('score');
        const scoreContainer = document.querySelector('.score-container');
        const settingsToggle = document.getElementById('settings-toggle');
        const deathLine = document.querySelector('.death-line');
        
        if (scoreContainer) {
            // Перемещаем весь контейнер счета внутрь игровой области
            scoreContainer.style.position = 'absolute';
            scoreContainer.style.left = (window.innerWidth - gameWidth) / 2 + 20 + 'px';
            scoreContainer.style.top = (window.innerHeight - gameHeight) / 2 + 20 + 'px';
            scoreContainer.style.zIndex = '10';
            scoreContainer.style.fontSize = '28px';
        }
        
        if (settingsToggle) {
            // Перемещаем кнопку настроек внутрь игровой области (в правый верхний угол)
            settingsToggle.style.position = 'absolute';
            settingsToggle.style.right = (window.innerWidth - gameWidth) / 2 + 20 + 'px';
            settingsToggle.style.top = (window.innerHeight - gameHeight) / 2 + 20 + 'px';
            settingsToggle.style.zIndex = '10';
        }

        if (deathLine) {
            deathLine.style.position = 'absolute';
            deathLine.style.left = (window.innerWidth - gameWidth) / 2 + 'px';
            deathLine.style.width = gameWidth + 'px';
        }
        
        // Позиционирование границы игрового поля
        const gameBorder = document.querySelector('.game-border');
        if (gameBorder) {
            gameBorder.style.left = (window.innerWidth - gameWidth) / 2 + 'px';
            gameBorder.style.top = (window.innerHeight - gameHeight) / 2 + 'px';
            gameBorder.style.width = gameWidth + 'px';
            gameBorder.style.height = gameHeight + 'px';
        }
    }
    
    const MAX_GAME_HEIGHT = 1920;
    const MAX_GAME_WIDTH = 1080;
    
    // Расчет оптимальных размеров игры
    function calculateGameDimensions() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let gameWidth, gameHeight;
        
        // Определяем, какая сторона ограничивает размер
        if (windowWidth / windowHeight > ASPECT_RATIO) {
            // Ограничение по высоте
            gameHeight = Math.min(windowHeight, MAX_GAME_HEIGHT);
            gameWidth = gameHeight * ASPECT_RATIO;
        } else {
            // Ограничение по ширине
            gameWidth = Math.min(windowWidth, MAX_GAME_WIDTH);
            gameHeight = gameWidth / ASPECT_RATIO;
        }
        
        return { width: Math.floor(gameWidth), height: Math.floor(gameHeight) };
    }
    
    // Начальный расчет размеров
    const dimensions = calculateGameDimensions();
    let GAME_WIDTH = dimensions.width;
    let GAME_HEIGHT = dimensions.height;
    const DEATH_LINE_HEIGHT = GAME_HEIGHT * 0.2;
    const SPAWN_COOLDOWN = 500; // Задержка между созданием объектов 500 мс
    const BONUS_COOLDOWN = 30000; // 30 секунд кулдаун для бонусов
    const AD_INTERVAL = 5 * 60 * 1000; // 5 минут между рекламой
    
    // Свойства игры
    let canvas, ctx;
    let objects = [];
    let nextObjectId = 1;
    let isGameRunning = false;
    let isPaused = false; // Флаг для отслеживания статуса паузы
    let score = 0;
    let lastFrameTime = 0;
    let lastSpawnTime = 0;
    let lastAdTime = 0;
    let bonusCooldowns = {
        disintegration: 0,
        bomb: 0
    };
    // Добавленные переменные для предпросмотра
    let nextObjectType = null; // Тип следующего объекта
    let previewX = 0; // Позиция предпросмотра по X
    
    // Объекты и их свойства
    const OBJECT_TYPES = [
        { value: 1, radius: 45, color: '#00ff00', mass: 1 },
        { value: 2, radius: 55, color: '#00ffaa', mass: 2 },
        { value: 4, radius: 65, color: '#00ffff', mass: 4 },
        { value: 8, radius: 75, color: '#00aaff', mass: 8 },
        { value: 16, radius: 85, color: '#0066ff', mass: 16 },
        { value: 32, radius: 95, color: '#ff00ff', mass: 32 },
        { value: 64, radius: 105, color: '#ff0099', mass: 64 },
        { value: 128, radius: 115, color: '#ff6600', mass: 128 },
        { value: 256, radius: 125, color: '#ffaa00', mass: 256 },
        { value: 512, radius: 135, color: '#ffff00', mass: 512 },
        { value: 1024, radius: 145, color: '#ffffff', mass: 1024 }
    ];
    
    // Функция для генерации типа следующего объекта
    function generateNextObjectType() {
        const randomTypeIndex = Math.min(2, OBJECT_TYPES.length - 1);
        nextObjectType = OBJECT_TYPES[Math.floor(Math.random() * randomTypeIndex)];
    }
    
    // Инициализация игры
    function init() {
        // Получаем canvas и его контекст
        canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Не удалось найти игровой canvas');
            return;
        }
        
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Не удалось получить 2D контекст');
            return;
        }
        
        // Настройка размеров канваса
        resizeCanvas();
        
        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', resizeCanvas);
        
        // Добавляем обработчик события видимости страницы
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Обработка событий ввода
        setupInput();
        
        // Настройка пользовательского интерфейса
        setupUI();
        
        // Запуск начального экрана
        GameUI.showStartScreen();
    }
    
    // Изменение размера canvas при изменении размеров окна
    function resizeCanvas() {
        const dimensions = calculateGameDimensions();
        GAME_WIDTH = dimensions.width;
        GAME_HEIGHT = dimensions.height;
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        
        // Добавляем вызов функции позиционирования UI
        positionUIElements();
    }
    
    // Настройка пользовательского ввода
    function setupInput() {
        // Обработчик клика мыши и тапа
        canvas.addEventListener('click', function(event) {
            if (!isGameRunning) return;
            
            // Проверка задержки между созданием объектов
            const currentTime = Date.now();
            if (currentTime - lastSpawnTime < SPAWN_COOLDOWN) return;
            
            // Получаем положение canvas относительно окна
            const canvasRect = canvas.getBoundingClientRect();
            
            // Вычисляем координату X клика относительно canvas
            const canvasX = event.clientX - canvasRect.left;
            
            // Создаем новый объект при клике/тапе
            spawnObject(canvasX);
            lastSpawnTime = currentTime;
        });
        
        // Добавляем обработчик движения мыши для предпросмотра
        canvas.addEventListener('mousemove', function(event) {
            if (!isGameRunning) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            previewX = event.clientX - canvasRect.left;
            
            // Ограничиваем позицию предпросмотра границами игрового поля
            if (nextObjectType) {
                previewX = Math.min(Math.max(previewX, nextObjectType.radius), 
                                  GAME_WIDTH - nextObjectType.radius);
            }
        });
        
        // Добавляем обработчик движения пальца для мобильных устройств
        canvas.addEventListener('touchmove', function(event) {
            if (!isGameRunning) return;
            event.preventDefault();
            
            const canvasRect = canvas.getBoundingClientRect();
            previewX = event.touches[0].clientX - canvasRect.left;
            
            // Ограничиваем позицию предпросмотра границами игрового поля
            if (nextObjectType) {
                previewX = Math.min(Math.max(previewX, nextObjectType.radius), 
                                  GAME_WIDTH - nextObjectType.radius);
            }
        });
        
        // Обработчик нажатия клавиш (для отладки)
        window.addEventListener('keydown', function(event) {
            // Только для отладки: R - рестарт игры
            if (event.key === 'r' || event.key === 'R') {
                resetGame();
                startGame();
            }
        });
    }
    
    // Настройка UI
    function setupUI() {
        // Кнопка старта
        GameUI.onStartClick(function() {
            // Показываем рекламу перед началом игры
            AdsManager.showStartGameAd(function() {
                resetGame();
                startGame();
            });
        });
        
        // Кнопка рестарта
        GameUI.onRestartClick(function() {
            resetGame();
            startGame();
        });
        
        // Кнопка продолжения после проигрыша
        GameUI.onContinueClick(function() {
            // Показываем рекламу для продолжения
            AdsManager.showContinueGameAd(function() {
                // Удаляем часть объектов сверху
                clearTopObjects();
                // Продолжаем игру
                isGameRunning = true;
                requestAnimationFrame(gameLoop);
            });
        });
        
        // Кнопка дезинтеграции
        GameUI.onDisintegrationClick(function() {
            // Если кулдаун ещё не закончился, не используем бонус
            if (bonusCooldowns.disintegration > Date.now()) return;
            
            // Показываем рекламу для получения бонуса
            AdsManager.showBonusAd('disintegration', function() {
                // Активируем бонус дезинтеграции
                useDisintegration();
                
                // Устанавливаем кулдаун
                const now = Date.now();
                bonusCooldowns.disintegration = now + BONUS_COOLDOWN;
                
                // Отключаем кнопку на время кулдауна
                GameUI.disableBonus('disintegration');
                
                // Запускаем обновление визуализации кулдауна
                updateBonusCooldowns();
            });
        });
        
        // Кнопка бомбы
        GameUI.onBombClick(function() {
            // Если кулдаун ещё не закончился, не используем бонус
            if (bonusCooldowns.bomb > Date.now()) return;
            
            // Показываем рекламу для получения бонуса
            AdsManager.showBonusAd('bomb', function() {
                // Активируем бонус бомбы
                useBomb();
                
                // Устанавливаем кулдаун
                const now = Date.now();
                bonusCooldowns.bomb = now + BONUS_COOLDOWN;
                
                // Отключаем кнопку на время кулдауна
                GameUI.disableBonus('bomb');
                
                // Запускаем обновление визуализации кулдауна
                updateBonusCooldowns();
            });
        });
    }
    
    // Сброс состояния игры
    function resetGame() {
        objects = [];
        nextObjectId = 1;
        isGameRunning = false;
        score = 0;
        lastFrameTime = 0;
        lastSpawnTime = 0;
        lastAdTime = Date.now();
        
        bonusCooldowns = {
            disintegration: 0,
            bomb: 0
        };
        
        // Обновляем UI
        GameUI.updateScore(score);
        GameUI.enableBonus('disintegration');
        GameUI.enableBonus('bomb');
    }
    
    // Запуск игры
    function startGame() {
        // Сброс игрового состояния
        resetGame();
        
        // Запуск игры
        isGameRunning = true;
        isPaused = false;
        lastFrameTime = performance.now();
        lastAdTime = Date.now();
        
        // Инициализация предпросмотра
        generateNextObjectType();
        previewX = GAME_WIDTH / 2;
        
        // Запускаем музыку после взаимодействия пользователя
        AudioManager.playMusic();
        
        // Отображение игрового экрана
        GameUI.showGameScreen();
        
        // Запуск игрового цикла
        requestAnimationFrame(gameLoop);
    }
    
    // Обработчик изменения видимости страницы
    function handleVisibilityChange() {
        if (document.hidden) {
            // Страница стала невидимой (пользователь переключился)
            if (isGameRunning && !isPaused) {
                isPaused = true;
                console.log('Игра приостановлена из-за смены фокуса окна');
            }
        } else {
            // Страница снова видима (пользователь вернулся)
            if (isGameRunning && isPaused) {
                isPaused = false;
                // Сбрасываем lastFrameTime для правильной заморозки игры
                lastFrameTime = performance.now();
                console.log('Игра возобновлена после смены фокуса окна');
                // Перезапускаем игровой цикл
                requestAnimationFrame(gameLoop);
            }
        }
    }
    
    // Окончание игры
    function endGame() {
        isGameRunning = false;
        
        // Показываем экран окончания игры
        GameUI.showGameOverScreen(score);
        
        // Останавливаем музыку
        AudioManager.playSoundEffect('gameover');
    }
    
    // Создание объекта
    function spawnObject(x) {
        // Используем заранее сгенерированный тип или выбираем случайный
        const type = nextObjectType || OBJECT_TYPES[Math.floor(Math.random() * Math.min(2, OBJECT_TYPES.length - 1))];
        
        const newObject = {
            id: nextObjectId++,
            value: type.value,
            x: Math.min(Math.max(x, type.radius), GAME_WIDTH - type.radius),
            y: DEATH_LINE_HEIGHT - type.radius - 10, // Располагаем объект ВЫШЕ линии смерти
            radius: type.radius,
            color: type.color,
            mass: type.mass,
            vx: 0,
            vy: 0,
            rotation: 0,
            angularVelocity: 0,
            sleeping: false,
            createdAt: Date.now() // Запоминаем время создания объекта
        };
        objects.push(newObject);
        
        // Генерируем тип следующего объекта
        generateNextObjectType();
        
        // Инициализируем позицию предпросмотра
        previewX = GAME_WIDTH / 2;
        
        // Воспроизводим звук падения
        AudioManager.playSoundEffect('drop');
        
        return newObject;
    }
    
    // Проверка объединения объектов
    function checkMerges() {
        let mergeOccurred = false;
        
        // Используем сетку для поиска потенциальных слияний
        for (let i = 0; i < objects.length; i++) {
            const objA = objects[i];
            
            // Пропускаем объекты, которые уже были объединены
            if (!objects.includes(objA)) continue;
            
            // Получаем только близкие объекты через сетку
            const nearbyObjects = Physics.grid.getNearbyObjects(objA);
            
            for (let j = 0; j < nearbyObjects.length; j++) {
                const objB = nearbyObjects[j];
                
                // Пропускаем объекты, которые уже были объединены
                if (!objects.includes(objB)) continue;
                
                // Проверяем, могут ли объекты объединиться
                if (objA.value === objB.value && Physics.circlesCollide(objA, objB)) {
                    // Временно пробуждаем объекты для объединения, если они спят
                    const wasSleepingA = objA.sleeping;
                    const wasSleepingB = objB.sleeping;
                    
                    if (wasSleepingA || wasSleepingB) {
                        if (wasSleepingA) objA.sleeping = false;
                        if (wasSleepingB) objB.sleeping = false;
                    }
                    
                    // Создаем новый объект в результате слияния
                    mergeTwoObjects(objA, objB);
                    mergeOccurred = true;
                    
                    // Прерываем цикл, так как objA был удален
                    break;
                }
            }
        }
        
        return mergeOccurred;
    }
    
    // Объединение двух объектов
    function mergeTwoObjects(objA, objB) {
        // Находим тип следующего объекта
        const nextTypeIndex = OBJECT_TYPES.findIndex(type => type.value === objA.value) + 1;
        
        // Если достигнут максимальный тип, просто удаляем оба объекта и даем бонусные очки
        if (nextTypeIndex >= OBJECT_TYPES.length) {
            // Удаляем оба объекта
            objects = objects.filter(obj => obj !== objA && obj !== objB);
            
            // Даем больше очков, чем обычно
            score += objA.value * 4;
            
            // Воспроизводим звук слияния
            AudioManager.playSoundEffect('merge');
            
            // Обновляем счет
            GameUI.updateScore(score);
            
            return;
        }
        
        // Создаем новый объект большего типа
        const nextType = OBJECT_TYPES[nextTypeIndex];
        
        // Вычисляем среднюю позицию и скорость
        const newX = (objA.x + objB.x) / 2;
        const newY = (objA.y + objB.y) / 2;
        const newVx = (objA.vx + objB.vx) / 2;
        const newVy = (objA.vy + objB.vy) / 2;
        
        // Создаем новый объект
        const newObject = {
            id: nextObjectId++,
            value: nextType.value,
            x: newX,
            y: newY,
            radius: nextType.radius,
            color: nextType.color,
            mass: nextType.mass,
            vx: newVx,
            vy: newVy,
            rotation: 0,
            angularVelocity: (objA.angularVelocity + objB.angularVelocity) / 2,
            sleeping: false
        };
        
        // Удаляем старые объекты
        objects = objects.filter(obj => obj !== objA && obj !== objB);
        
        // Добавляем новый объект
        objects.push(newObject);
        
        // Добавляем очки
        score += nextType.value;
        
        // Воспроизводим звук слияния
        AudioManager.playSoundEffect('merge');
        
        // Создаем эффект слияния
        GameEffects.mergeEffect(newX, newY, nextType.radius, ctx);
        
        // Обновляем счет
        GameUI.updateScore(score);
    }
    
    // Очистка верхних объектов (бонус за рекламу)
    function clearTopObjects() {
        // Сортируем объекты по высоте (y координата)
        objects.sort((a, b) => a.y - b.y);
        
        // Удаляем 30% верхних объектов
        const removeCount = Math.floor(objects.length * 0.3);
        
        if (removeCount > 0) {
            // Запоминаем объекты для эффектов
            const removedObjects = objects.slice(0, removeCount);
            
            // Удаляем объекты
            objects = objects.slice(removeCount);
            
            // Добавляем эффекты удаления
            removedObjects.forEach(obj => {
                GameEffects.disintegrationEffect(ctx, obj.x, obj.y);
            });
        }
    }
    
    // Использование бонуса дезинтеграции
    function useDisintegration() {
        // Находим объекты в средней части экрана
        const centerY = GAME_HEIGHT / 2;
        const targetArea = GAME_HEIGHT * 0.3;
        
        const objectsToRemove = objects.filter(obj => 
            obj.y > centerY - targetArea / 2 && 
            obj.y < centerY + targetArea / 2
        );
        
        // Удаляем найденные объекты
        objectsToRemove.forEach(obj => {
            objects = objects.filter(o => o !== obj);
            
            // Добавляем эффект удаления
            GameEffects.disintegrationEffect(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        });
        
        // Играем звук бонуса
        AudioManager.playSoundEffect('bonus');
        
        // Пробуждаем оставшиеся объекты
        Physics.wakeObjectsInArea(objects, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 3);
    }
    
    // Использование бонуса бомбы
    function useBomb() {
        // Создаем бомбу
        const bomb = {
            id: -1, // Отрицательный ID для бомбы
            x: GAME_WIDTH / 2,
            y: 50,
            radius: 30,
            color: '#ff0000',
            mass: 10,
            vx: 0,
            vy: 2,
            rotation: 0,
            angularVelocity: 0.1,
            isBomb: true
        };
        
        // Добавляем бомбу
        objects.push(bomb);
        
        // Через 2 секунды бомба взрывается
        setTimeout(() => {
            // Удаляем бомбу
            objects = objects.filter(obj => obj.id !== -1);
            
            // Находим все объекты в радиусе взрыва
            const explosionRadius = GAME_WIDTH / 3;
            const bombX = bomb.x;
            const bombY = bomb.y;
            
            const objectsInRadius = objects.filter(obj => {
                const dx = obj.x - bombX;
                const dy = obj.y - bombY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < explosionRadius + obj.radius;
            });
            
            // Удаляем объекты в радиусе взрыва
            objectsInRadius.forEach(obj => {
                objects = objects.filter(o => o !== obj);
            });
            
            // Добавляем эффект взрыва
            GameEffects.bombEffect(bombX, bombY, ctx, GAME_WIDTH, GAME_HEIGHT);
            
            // Играем звук бонуса
            AudioManager.playSoundEffect('bonus');
            
            // Пробуждаем оставшиеся объекты
            Physics.wakeObjectsInArea(objects, bombX, bombY, explosionRadius * 1.5);
        }, 2000);
    }
    
    // Обновление визуализации кулдаунов бонусов
    function updateBonusCooldowns() {
        const now = Date.now();
        
        // Обновление кулдауна дезинтеграции
        if (bonusCooldowns.disintegration > now) {
            const remaining = bonusCooldowns.disintegration - now;
            const percentage = Math.max(0, Math.min(100, (remaining / BONUS_COOLDOWN) * 100));
            
            GameUI.updateCooldown('disintegration', percentage);
            
            // Разблокируем кнопку, когда кулдаун закончится
            if (percentage <= 0) {
                GameUI.enableBonus('disintegration');
            }
        } else if (bonusCooldowns.disintegration > 0) {
            bonusCooldowns.disintegration = 0;
            GameUI.enableBonus('disintegration');
        }
        
        // Обновление кулдауна бомбы
        if (bonusCooldowns.bomb > now) {
            const remaining = bonusCooldowns.bomb - now;
            const percentage = Math.max(0, Math.min(100, (remaining / BONUS_COOLDOWN) * 100));
            
            GameUI.updateCooldown('bomb', percentage);
            
            // Разблокируем кнопку, когда кулдаун закончится
            if (percentage <= 0) {
                GameUI.enableBonus('bomb');
            }
        } else if (bonusCooldowns.bomb > 0) {
            bonusCooldowns.bomb = 0;
            GameUI.enableBonus('bomb');
        }
        
        // Продолжаем обновление, пока кулдаун не закончится
        if (bonusCooldowns.disintegration > now || bonusCooldowns.bomb > now) {
            requestAnimationFrame(updateBonusCooldowns);
        }
    }
    
    // Проверка рекламы по таймеру
    function checkAdTime() {
        const now = Date.now();
        
        // Если прошло достаточно времени с последней рекламы, показываем новую
        if (now - lastAdTime >= AD_INTERVAL && isGameRunning) {
            lastAdTime = now;
            
            // Временно останавливаем игру
            const wasRunning = isGameRunning;
            isGameRunning = false;
            
            // Показываем рекламу
            AdsManager.showContinueGameAd(function() {
                // Возобновляем игру после рекламы
                isGameRunning = wasRunning;
                
                // Если игра была запущена, продолжаем игровой цикл
                if (wasRunning) {
                    requestAnimationFrame(gameLoop);
                }
            });
        }
    }
    
    // Проверка проигрыша
    function checkGameOver() {
        const now = Date.now();
        // Проверяем, есть ли объекты выше линии смерти
        for (const obj of objects) {
            // Проверяем только те объекты, которые существуют более секунды
            // и почти остановились (не находятся в активном падении)
            if (obj.y - obj.radius < DEATH_LINE_HEIGHT && 
                now - obj.createdAt > 1000 && 
                Math.abs(obj.vy) < 0.5) {
                endGame();
                return true;
            }
        }
        
        return false;
    }
    
    // Отрисовка игрового состояния
    function render() {
        // Очищаем canvas
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Отрисовка предпросмотра
        if (nextObjectType && isGameRunning) {
            ctx.save();
            ctx.globalAlpha = 0.6; // Полупрозрачный
            
            // Рисуем контур объекта
            ctx.fillStyle = nextObjectType.color;
            ctx.beginPath();
            ctx.arc(previewX, DEATH_LINE_HEIGHT - nextObjectType.radius - 10, 
                    nextObjectType.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Рисуем текст значения
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.font = `bold ${Math.max(18, nextObjectType.radius * 0.7)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText(nextObjectType.value.toString(), 
                          previewX, DEATH_LINE_HEIGHT - nextObjectType.radius - 10);
            ctx.fillText(nextObjectType.value.toString(), 
                        previewX, DEATH_LINE_HEIGHT - nextObjectType.radius - 10);
            
            // Добавляем неоновое свечение
            ctx.shadowBlur = 10;
            ctx.shadowColor = nextObjectType.color;
            ctx.strokeStyle = nextObjectType.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Рисуем все объекты
        for (const obj of objects) {
            ctx.save();
            
            ctx.translate(obj.x, obj.y);
            // Удаляем вращение при отрисовке
            // ctx.rotate(obj.rotation);
            
            // Особая отрисовка для бомбы
            if (obj.isBomb) {
                // Рисуем бомбу
                ctx.fillStyle = obj.color;
                ctx.beginPath();
                ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Рисуем фитиль
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -obj.radius);
                ctx.quadraticCurveTo(10, -obj.radius - 15, 0, -obj.radius - 20);
                ctx.stroke();
                
                // Рисуем искры
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, -obj.radius - 20, 3 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Рисуем обычный объект
                ctx.fillStyle = obj.color;
                ctx.beginPath();
                ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Рисуем текст значения
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.font = `bold ${Math.max(18, obj.radius * 0.7)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeText(obj.value.toString(), 0, 0);
                ctx.fillText(obj.value.toString(), 0, 0);
                
                // Добавляем неоновое свечение
                ctx.shadowBlur = 10;
                ctx.shadowColor = obj.color;
                ctx.strokeStyle = obj.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
    
    // Игровой цикл
    function gameLoop(timestamp) {
        if (!isGameRunning || isPaused) return;
        
        // Вычисляем прошедшее время
        let deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        
        // Ограничиваем deltaTime
        if (deltaTime > MAX_DELTA_TIME) {
            deltaTime = MAX_DELTA_TIME;
        }
        
        // Очищаем сетку перед каждым обновлением
        Physics.grid.clear();
        
        // Добавляем объекты в сетку
        for (let i = 0; i < objects.length; i++) {
            Physics.grid.addObject(objects[i]);
        }
        
        // Обновляем только неспящие объекты
        for (let i = 0; i < objects.length; i++) {
            if (!objects[i].sleeping) {
                Physics.updateObject(objects[i], GAME_WIDTH, GAME_HEIGHT, deltaTime);
            }
        }
        
        // Проверяем столкновения с использованием сетки
        for (let i = 0; i < objects.length; i++) {
            if (objects[i].sleeping) continue;
            
            const nearbyObjects = Physics.grid.getNearbyObjects(objects[i]);
            for (let j = 0; j < nearbyObjects.length; j++) {
                Physics.resolveCollision(objects[i], nearbyObjects[j]);
            }
        }
        
        // Проверяем возможные слияния каждый кадр
        checkMerges();
        
        // Проверяем проигрыш
        if (checkGameOver()) {
            return;
        }
        
        // Проверяем время для показа рекламы
        checkAdTime();
        
        // Отрисовываем игру
        render();
        
        // Запрашиваем следующий кадр
        requestAnimationFrame(gameLoop);
    }
    
    // Публичный API
    return {
        init: init,
        startGame: startGame,
        resetGame: resetGame,
        getGameDimensions: function() {
            return {
                width: GAME_WIDTH,
                height: GAME_HEIGHT
            };
        }
    };
})();

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    // Проверяем наличие необходимых модулей перед инициализацией
    const requiredModules = {
        'GameUI': typeof GameUI !== 'undefined',
        'AudioManager': typeof AudioManager !== 'undefined',
        'AdsManager': typeof AdsManager !== 'undefined',
        'MatrixEffect': typeof MatrixEffect !== 'undefined'
    };
    
    // Проверяем, все ли модули загружены
    const missingModules = Object.keys(requiredModules).filter(module => !requiredModules[module]);
    
    if (missingModules.length > 0) {
        console.error('Следующие модули не загружены: ' + missingModules.join(', ') + '. Убедитесь, что все скрипты загружены в правильном порядке.');
        return;
    }
    
    // Инициализируем игру
    Game.init();
});