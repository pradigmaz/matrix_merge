/**
 * ui.js - Управление пользовательским интерфейсом игры
 */

const GameUI = (function() {
    // Элементы интерфейса
    let elements = {
        score: null,
        finalScore: null,
        startOverlay: null,
        gameOverOverlay: null,
        startButton: null,
        restartButton: null,
        continueButton: null,
        disintegrationButton: null,
        bombButton: null,
        disintegrationCooldown: null,
        bombCooldown: null,
        bonusesContainer: null // Добавляем контейнер для бонусов
    };
    
    // Слушатели событий для кнопок бонусов
    let bonusListeners = {
        disintegration: null,
        bomb: null
    };
    
    // Инициализация UI
    function init() {
        // Получаем ссылки на элементы DOM
        elements.score = document.getElementById('score');
        elements.finalScore = document.getElementById('final-score');
        elements.startOverlay = document.getElementById('start-overlay');
        elements.gameOverOverlay = document.getElementById('game-over-overlay');
        elements.startButton = document.getElementById('start-button');
        elements.restartButton = document.getElementById('restart-button');
        elements.continueButton = document.getElementById('continue-button');
        elements.disintegrationButton = document.getElementById('disintegration');
        elements.bombButton = document.getElementById('bomb');
        elements.disintegrationCooldown = document.getElementById('disintegration-cooldown');
        elements.bombCooldown = document.getElementById('bomb-cooldown');
        elements.bonusesContainer = document.querySelector('.bonuses-container'); // Инициализируем контейнер бонусов
        
        // Позиционируем элементы UI
        positionUIElements();
        
        // Заменяем текст кнопок на иконки
        if (elements.disintegrationButton) {
            const textSpan = elements.disintegrationButton.querySelector('.neon-text');
            if (textSpan) {
                textSpan.innerHTML = '<img src="assets/images/disintegration-icon.svg" alt="Дезинтеграция" style="width: 30px; height: 30px; filter: drop-shadow(0 0 5px var(--primary-color, #0ff));">';
            }
        }
        
        if (elements.bombButton) {
            const textSpan = elements.bombButton.querySelector('.neon-text');
            if (textSpan) {
                textSpan.innerHTML = '<img src="assets/images/bomb-icon.svg" alt="Бомба" style="width: 30px; height: 30px; filter: drop-shadow(0 0 5px var(--primary-color, #0ff));">';
            }
        }
        
        // Скрываем кнопки бонусов изначально
        if (elements.disintegrationButton) elements.disintegrationButton.classList.add('disabled');
        if (elements.bombButton) elements.bombButton.classList.add('disabled');
        
        // Прячем игровой экран
        hideGameScreen();
    }
    
    // Позиционирование элементов UI
    function positionUIElements() {
        const dimensions = calculateGameDimensions();
        const gameWidth = dimensions.width;
        const gameHeight = dimensions.height;
        
        // Позиционирование контейнера бонусов
        if (elements.bonusesContainer) {
            elements.bonusesContainer.style.position = 'absolute';
            elements.bonusesContainer.style.top = (window.innerHeight - gameHeight) / 2 + 110 + 'px';
            elements.bonusesContainer.style.right = (window.innerWidth - gameWidth) / 2 + 20 + 'px';
            elements.bonusesContainer.style.zIndex = '10';
        }
    }
    // Расчет размеров игры
    function calculateGameDimensions() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const ASPECT_RATIO = 11 / 16;
        const MAX_GAME_HEIGHT = 1920;
        const MAX_GAME_WIDTH = 1080;
        
        let gameWidth, gameHeight;
        
        if (windowWidth / windowHeight > ASPECT_RATIO) {
            gameHeight = Math.min(windowHeight, MAX_GAME_HEIGHT);
            gameWidth = gameHeight * ASPECT_RATIO;
        } else {
            gameWidth = Math.min(windowWidth, MAX_GAME_WIDTH);
            gameHeight = gameWidth / ASPECT_RATIO;
        }
        
        return { width: Math.floor(gameWidth), height: Math.floor(gameHeight) };
    }
    
    // Обновление счета
    function updateScore(newScore) {
        if (elements.score) {
            elements.score.textContent = newScore;
        }
    }
    
    // Показать стартовый экран
    function showStartScreen() {
        if (elements.startOverlay) {
            elements.startOverlay.style.display = 'flex';
        }
        if (elements.gameOverOverlay) {
            elements.gameOverOverlay.style.display = 'none';
        }
    }
    
    // Показать игровой экран
    function showGameScreen() {
        if (elements.startOverlay) {
            elements.startOverlay.style.display = 'none';
        }
        if (elements.gameOverOverlay) {
            elements.gameOverOverlay.style.display = 'none';
        }
    }
    
    // Скрыть игровой экран
    function hideGameScreen() {
        showStartScreen();
    }
    
    // Показать экран окончания игры
    function showGameOverScreen(finalScore) {
        if (elements.finalScore) {
            elements.finalScore.textContent = finalScore;
        }
        if (elements.gameOverOverlay) {
            elements.gameOverOverlay.style.display = 'flex';
        }
        if (elements.startOverlay) {
            elements.startOverlay.style.display = 'none';
        }
    }
    
    // Обработчик нажатия на кнопку "Начать игру"
    function onStartClick(callback) {
        if (elements.startButton) {
            elements.startButton.addEventListener('click', callback);
        }
    }
    
    // Обработчик нажатия на кнопку "Начать заново"
    function onRestartClick(callback) {
        if (elements.restartButton) {
            elements.restartButton.addEventListener('click', callback);
        }
    }
    
    // Обработчик нажатия на кнопку "Продолжить"
    function onContinueClick(callback) {
        if (elements.continueButton) {
            elements.continueButton.addEventListener('click', callback);
        }
    }
    
    // Обработчик нажатия на кнопку "Дезинтеграция"
    function onDisintegrationClick(callback) {
        bonusListeners.disintegration = callback;
        if (elements.disintegrationButton) {
            elements.disintegrationButton.addEventListener('click', function() {
                if (!elements.disintegrationButton.classList.contains('disabled')) {
                    bonusListeners.disintegration();
                }
            });
        }
    }
    
    // Обработчик нажатия на кнопку "Бомба"
    function onBombClick(callback) {
        bonusListeners.bomb = callback;
        if (elements.bombButton) {
            elements.bombButton.addEventListener('click', function() {
                if (!elements.bombButton.classList.contains('disabled')) {
                    bonusListeners.bomb();
                }
            });
        }
    }
    
    // Включение бонуса
    function enableBonus(bonusType) {
        if (bonusType === 'disintegration' && elements.disintegrationButton) {
            elements.disintegrationButton.classList.remove('disabled');
        } else if (bonusType === 'bomb' && elements.bombButton) {
            elements.bombButton.classList.remove('disabled');
        }
    }
    
    // Отключение бонуса
    function disableBonus(bonusType) {
        if (bonusType === 'disintegration' && elements.disintegrationButton) {
            elements.disintegrationButton.classList.add('disabled');
        } else if (bonusType === 'bomb' && elements.bombButton) {
            elements.bombButton.classList.add('disabled');
        }
    }
    
    // Обновление отображения кулдауна
    function updateCooldown(bonusType, percentage) {
        let cooldownElement = null;
        
        if (bonusType === 'disintegration') {
            cooldownElement = elements.disintegrationCooldown;
        } else if (bonusType === 'bomb') {
            cooldownElement = elements.bombCooldown;
        }
        
        if (cooldownElement) {
            if (percentage <= 0) {
                cooldownElement.style.height = '0%';
            } else {
                cooldownElement.style.height = percentage + '%';
            }
        }
    }
    
    // Публичный API
    return {
        init: init,
        updateScore: updateScore,
        showStartScreen: showStartScreen,
        showGameScreen: showGameScreen,
        hideGameScreen: hideGameScreen,
        showGameOverScreen: showGameOverScreen,
        onStartClick: onStartClick,
        onRestartClick: onRestartClick,
        onContinueClick: onContinueClick,
        onDisintegrationClick: onDisintegrationClick,
        onBombClick: onBombClick,
        enableBonus: enableBonus,
        disableBonus: disableBonus,
        updateCooldown: updateCooldown
    };
})();

// Инициализация UI при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    GameUI.init();
});