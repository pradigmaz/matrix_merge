/**
 * settings.js - Управление настройками игры
 */

const GameSettings = (function() {
    // Настройки по умолчанию
    const defaults = {
        colorScheme: 'matrix',
        musicVolume: 0.5
    };
    
    // Текущие настройки
    let settings = {};
    
    // Инициализация настроек
    function init() {
        // Загрузка настроек из localStorage или использование значений по умолчанию
        loadSettings();
        
        // Настройка элементов интерфейса
        setupUI();
        
        // Применение начальных настроек
        applySettings();
    }
    
    // Загрузка настроек из localStorage
    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem('matrixMergeSettings');
            if (savedSettings) {
                settings = JSON.parse(savedSettings);
            } else {
                settings = { ...defaults };
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
            settings = { ...defaults };
        }
        
        // Убедимся, что все настройки имеют значения
        for (const key in defaults) {
            if (settings[key] === undefined) {
                settings[key] = defaults[key];
            }
        }
    }
    
    // Сохранение настроек в localStorage
    function saveSettings() {
        try {
            localStorage.setItem('matrixMergeSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
    }
    
    // Настройка элементов интерфейса
    function setupUI() {
        // Кнопка настроек
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        
        if (settingsToggle && settingsPanel) {
            // Заменяем символ ⚙ на SVG-иконку
            settingsToggle.innerHTML = '<img src="assets/images/settings-icon.svg" alt="Настройки" style="width: 60%; height: 60%; filter: drop-shadow(0 0 5px var(--primary-color, #0f0));" class="settings-icon">';
            
            // Убедимся, что клики обрабатываются на всей кнопке, включая иконку внутри
            settingsToggle.querySelector('.settings-icon').style.pointerEvents = 'none';
            
            settingsToggle.addEventListener('click', function(event) {
                settingsPanel.classList.toggle('active');
            });
        }
        
        // Слайдер громкости музыки
        const musicVolume = document.getElementById('music-volume');
        if (musicVolume) {
            musicVolume.value = settings.musicVolume * 100;
            musicVolume.addEventListener('input', function() {
                settings.musicVolume = this.value / 100;
                if (AudioManager) {
                    AudioManager.setMusicVolume(settings.musicVolume);
                }
                saveSettings();
            });
        }
        
        // Настройка цветовой схемы
        const colorSchemeSelect = document.getElementById('color-scheme');
        if (colorSchemeSelect) {
            colorSchemeSelect.value = settings.colorScheme;
            
            // Проверяем, есть ли уже опция cyberpunk2077
            let hasCyberpunkOption = false;
            for (let i = 0; i < colorSchemeSelect.options.length; i++) {
                if (colorSchemeSelect.options[i].value === 'cyberpunk2077') {
                    hasCyberpunkOption = true;
                    break;
                }
            }
            
            // Добавляем опцию, если ее нет
            if (!hasCyberpunkOption) {
                const option = document.createElement('option');
                option.value = 'cyberpunk2077';
                option.textContent = 'Cyberpunk 2077';
                colorSchemeSelect.appendChild(option);
            }
            
            colorSchemeSelect.addEventListener('change', function() {
                setSetting('colorScheme', this.value);
                applyColorScheme(this.value);
                
                // Если выбрана схема cyberpunk2077 и Three.js уже инициализирован
                if (this.value === 'cyberpunk2077' && MatrixEffect) {
                    // Проверяем, инициализирована ли уже хроматическая аберрация
                    if (MatrixEffect.hasOwnProperty('setupChromaticAberration') && 
                        !MatrixEffect.aberrationPass) {
                        MatrixEffect.setupChromaticAberration();
                    }
                }
            });
        }
        
        // Закрытие панели настроек при клике вне её
        document.addEventListener('click', function(event) {
            if (settingsPanel && settingsPanel.classList.contains('active') && 
                !settingsPanel.contains(event.target) && 
                event.target !== settingsToggle) {
                settingsPanel.classList.remove('active');
            }
        });
    }
    
    // Применение настроек
    function applySettings() {
        // Применение цветовой схемы
        applyColorScheme(settings.colorScheme);
        
        // Применение громкости музыки
        if (AudioManager) {
            AudioManager.setMusicVolume(settings.musicVolume);
        }
    }
    
    // Применение цветовой схемы
    function applyColorScheme(scheme) {
        // Удаляем все классы схем
        document.body.classList.remove('matrix', 'cyber', 'neon', 'retro', 'gold', 'space');
        
        // Добавляем класс выбранной схемы
        document.body.classList.add(scheme);
        
        // Обновляем матричный эффект, если он доступен
        if (MatrixEffect) {
            MatrixEffect.setColorScheme(scheme);
        }
    }
    
    // Получение значения настройки
    function getSetting(key) {
        return settings[key];
    }
    
    // Установка значения настройки
    function setSetting(key, value) {
        settings[key] = value;
        saveSettings();
        
        // Применение изменений сразу
        if (key === 'colorScheme') {
            applyColorScheme(value);
        } else if (key === 'musicVolume' && AudioManager) {
            AudioManager.setMusicVolume(value);
        }
    }
    
    // Публичный API
    return {
        init: init,
        getSetting: getSetting,
        setSetting: setSetting
    };
})();

// Инициализация настроек при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    GameSettings.init();
});