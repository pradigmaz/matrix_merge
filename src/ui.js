/**
 * ui.js - Интерфейс игры Matrix Drop
 * Отвечает за управление интерфейсом, настройками и взаимодействием с пользователем
 */

// Объект с методами для управления интерфейсом
const UI = (() => {
    // Хранение состояния интерфейса
    const state = {
        settingsOpen: false,
        musicVolume: 50,
        soundVolume: 50,
        colorScheme: 'classic'
    };
    
    /**
     * Инициализация интерфейса
     * Настраивает обработчики событий для элементов UI
     */
    function init() {
        // Кнопка настроек
        const settingsButton = document.getElementById('settingsButton');
        settingsButton.addEventListener('click', toggleSettings);
        
        // Кнопка закрытия настроек
        const closeSettings = document.getElementById('closeSettings');
        closeSettings.addEventListener('click', toggleSettings);
        
        // Ползунки громкости
        const musicSlider = document.getElementById('musicVolume');
        musicSlider.addEventListener('input', (e) => {
            state.musicVolume = parseInt(e.target.value);
            updateAudioVolume('music', state.musicVolume);
        });
        
        const soundSlider = document.getElementById('soundVolume');
        soundSlider.addEventListener('input', (e) => {
            state.soundVolume = parseInt(e.target.value);
            updateAudioVolume('sound', state.soundVolume);
        });
        
        // Кнопки цветовых схем
        const schemeButtons = document.querySelectorAll('.schemeButton');
        schemeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const scheme = button.getAttribute('data-scheme');
                changeColorScheme(scheme);
                
                // Обновляем активную кнопку
                schemeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        // Кнопки бонусов
        const disintegrateBonus = document.getElementById('disintegrateBonus');
        disintegrateBonus.addEventListener('click', () => {
            if (!disintegrateBonus.classList.contains('cooldown')) {
                // Активация бонуса
                Game.activateDisintegration();
                
                // Звук активации
                playSound('disintegrate');
            }
        });
        
        const bombBonus = document.getElementById('bombBonus');
        bombBonus.addEventListener('click', () => {
            if (!bombBonus.classList.contains('cooldown')) {
                // Получаем координаты в игровой области
                const canvas = document.getElementById('gameCanvas');
                const rect = canvas.getBoundingClientRect();
                
                // При клике на кнопку бонуса, помещаем бомбу в центре экрана
                const gameX = canvas.width / 2;
                const gameY = 600; // Немного ниже середины
                
                // Активация бонуса
                Game.activateBomb(gameX, gameY);
                
                // Звук активации
                playSound('bomb');
            }
        });
    }
    
    /**
     * Переключение видимости панели настроек
     */
    function toggleSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        state.settingsOpen = !state.settingsOpen;
        
        if (state.settingsOpen) {
            settingsPanel.classList.remove('hidden');
        } else {
            settingsPanel.classList.add('hidden');
        }
    }
    
    /**
     * Изменение цветовой схемы
     */
    function changeColorScheme(scheme) {
        // Обновление состояния
        state.colorScheme = scheme;
        
        // Обновление класса body
        document.body.className = scheme;
        
        // Обновление схемы в игре
        if (window.Game && window.Game.state) {
            window.Game.state.colorScheme = scheme;
        }
    }
    
    /**
     * Обновление громкости звуков
     */
    function updateAudioVolume(type, volume) {
        // Нормализация громкости (0-1)
        const normalizedVolume = volume / 100;
        
        // Здесь можно добавить логику для управления звуками
        // когда будут добавлены файлы звуков
        console.log(`${type} volume set to ${normalizedVolume}`);
    }
    
    /**
     * Воспроизведение звука
     */
    function playSound(soundType) {
        // Здесь будет логика воспроизведения звуков
        // когда будут добавлены файлы звуков
        console.log(`Playing sound: ${soundType}`);
    }
    
    /**
     * Обновление отображения счета
     */
    function updateScore(score) {
        const scoreElement = document.getElementById('score');
        scoreElement.textContent = score;
        
        // Эффект увеличения при обновлении
        scoreElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
        }, 200);
    }
    
    /**
     * Обновление отображения кулдауна бонусов
     */
    function updateBonuses(cooldown) {
        const disintegrateBonus = document.getElementById('disintegrateBonus');
        const bombBonus = document.getElementById('bombBonus');
        
        if (cooldown > 0) {
            // Округляем время до целых секунд
            const secondsLeft = Math.ceil(cooldown);
            
            // Добавляем класс кулдауна и устанавливаем счетчик
            disintegrateBonus.classList.add('cooldown');
            bombBonus.classList.add('cooldown');
            disintegrateBonus.setAttribute('data-cooldown', secondsLeft);
            bombBonus.setAttribute('data-cooldown', secondsLeft);
        } else {
            // Убираем класс кулдауна
            disintegrateBonus.classList.remove('cooldown');
            bombBonus.classList.remove('cooldown');
            disintegrateBonus.removeAttribute('data-cooldown');
            bombBonus.removeAttribute('data-cooldown');
        }
    }
    
    /**
     * Показ сообщения о проигрыше
     */
    function showGameOver(score) {
        // В будущем можно добавить модальное окно с финальным счетом,
        // кнопкой перезапуска и т.д.
        alert(`Игра окончена! Ваш счет: ${score}`);
    }
    
    // Публичный API
    return {
        init,
        updateScore,
        updateBonuses,
        showGameOver,
        changeColorScheme
    };
})();

// Экспорт объекта UI для использования в других модулях
window.UI = UI;
