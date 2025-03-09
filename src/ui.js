/**
 * ui.js
 * Отвечает за интерфейс игры и настройки:
 * - отображение счетчика очков
 * - отображение и управление кнопками бонусов
 * - панель настроек (музыка, звуки, цветовая схема)
 */

// Класс для работы с интерфейсом игры
class UI {
    constructor(game, renderer) {
        this.game = game;
        this.renderer = renderer;
        
        // Элементы DOM
        this.settingsPanel = document.getElementById('settings-panel');
        this.closeSettingsButton = document.getElementById('close-settings');
        this.musicVolumeSlider = document.getElementById('music-volume');
        this.soundVolumeSlider = document.getElementById('sound-volume');
        this.colorSchemeButtons = document.querySelectorAll('.color-scheme-buttons button');
        
        // Области для кликов (кнопка настроек и кнопки бонусов)
        this.clickAreas = {
            settings: {
                x: this.renderer.gameWidth - 40,
                y: 40,
                radius: 20
            },
            bonus1: {
                x: this.renderer.gameWidth / 2 - 100,
                y: 40,
                radius: 40
            },
            bonus2: {
                x: this.renderer.gameWidth / 2 + 100,
                y: 40,
                radius: 40
            }
        };
        
        // Настройки игры
        this.settings = {
            musicVolume: 50,
            soundVolume: 50,
            colorScheme: 'classic'
        };
        
        // Инициализация обработчиков событий
        this.initEventListeners();
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Закрытие панели настроек
        this.closeSettingsButton.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // Изменение громкости музыки
        this.musicVolumeSlider.addEventListener('input', (e) => {
            this.settings.musicVolume = parseInt(e.target.value);
            // TODO: Когда будет реализована аудиосистема
            // this.game.audio.setMusicVolume(this.settings.musicVolume / 100);
        });
        
        // Изменение громкости звуков
        this.soundVolumeSlider.addEventListener('input', (e) => {
            this.settings.soundVolume = parseInt(e.target.value);
            // TODO: Когда будет реализована аудиосистема
            // this.game.audio.setSoundVolume(this.settings.soundVolume / 100);
        });
        
        // Изменение цветовой схемы
        this.colorSchemeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const scheme = e.target.dataset.scheme;
                this.setColorScheme(scheme);
                
                // Обновляем активные кнопки
                this.colorSchemeButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
    }

    // Проверка, находится ли клик внутри указанной области
    isInsideClickArea(x, y, area) {
        const dx = x - area.x;
        const dy = y - area.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= area.radius;
    }

    // Обработка клика на игровой области
    handleClick(x, y) {
        // Проверяем, попал ли клик на кнопку настроек
        if (this.isInsideClickArea(x, y, this.clickAreas.settings)) {
            this.showSettings();
            return true;
        }
        
        // Проверяем, попал ли клик на кнопку бонуса "Дезинтеграция"
        if (this.isInsideClickArea(x, y, this.clickAreas.bonus1)) {
            this.game.activateBonus('disintegration');
            return true;
        }
        
        // Проверяем, попал ли клик на кнопку бонуса "Бомба"
        if (this.isInsideClickArea(x, y, this.clickAreas.bonus2)) {
            // Для бомбы запоминаем, что она активирована,
            // ждем следующий клик для определения места взрыва
            this.game.activateBonus('bomb');
            return true;
        }
        
        // Клик не попал ни на одну из кнопок
        return false;
    }

    // Отображение панели настроек
    showSettings() {
        this.settingsPanel.classList.remove('hidden');
        
        // Обновляем значения слайдеров
        this.musicVolumeSlider.value = this.settings.musicVolume;
        this.soundVolumeSlider.value = this.settings.soundVolume;
        
        // Обновляем активную цветовую схему
        this.colorSchemeButtons.forEach(button => {
            if (button.dataset.scheme === this.settings.colorScheme) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // Скрытие панели настроек
    hideSettings() {
        this.settingsPanel.classList.add('hidden');
    }

    // Установка цветовой схемы
    setColorScheme(scheme) {
        this.settings.colorScheme = scheme;
        this.renderer.setColorScheme(scheme);
    }

    // Получение текущих настроек
    getSettings() {
        return this.settings;
    }

    // Сохранение настроек в localStorage
    saveSettings() {
        localStorage.setItem('matrixDropSettings', JSON.stringify(this.settings));
    }

    // Загрузка настроек из localStorage
    loadSettings() {
        const savedSettings = localStorage.getItem('matrixDropSettings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
            
            // Применяем загруженные настройки
            this.musicVolumeSlider.value = this.settings.musicVolume;
            this.soundVolumeSlider.value = this.settings.soundVolume;
            this.setColorScheme(this.settings.colorScheme);
        }
    }
}