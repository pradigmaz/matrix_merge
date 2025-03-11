/**
 * audio.js - Управление звуками и музыкой в игре
 */

const AudioManager = (function() {
    // Приватные переменные
    let musicVolume = 0.5;
    let sfxVolume = 0.7;
    let musicElement = null;
    let sounds = {};
    let isMusicEnabled = true;
    let playPromise = null; // Отслеживаем Promise воспроизведения
    let activeAudioElements = []; // Массив для отслеживания всех активных звуков
    
    // Инициализация аудио системы
    function init() {
        // Создаем элемент для фоновой музыки
        musicElement = new Audio();
        musicElement.loop = true;
        musicElement.volume = musicVolume;
        
        // Загружаем музыку
        loadMusic('background', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwMD4+Pj4+PkxMTExMTFpaWlpaWmhoaGhoaHZ2dnZ2doSEhISEhJKSkpKSkqCgoKCgoK6urq6urrKysr');
        
        // Загружаем звуковые эффекты
        loadSoundEffect('merge', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA');
        loadSoundEffect('drop', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA');
        loadSoundEffect('bonus', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA');
        loadSoundEffect('gameover', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA');
        
        // Обработчик изменения громкости музыки
        const volumeSlider = document.getElementById('music-volume');
        if (volumeSlider) {
            volumeSlider.value = musicVolume * 100;
            volumeSlider.addEventListener('input', function() {
                setMusicVolume(this.value / 100);
            });
        }
    }
    
    // Загрузка фоновой музыки
    function loadMusic(name, src) {
        musicElement.src = src;
        musicElement.load();
    }
    
    // Загрузка звукового эффекта
    function loadSoundEffect(name, src) {
        sounds[name] = new Audio(src);
        sounds[name].volume = sfxVolume;
    }
    
    // Воспроизведение фоновой музыки
    function playMusic() {
        if (isMusicEnabled && musicElement) {
            try {
                // Если уже есть активный Promise, дожидаемся его завершения
                if (playPromise !== null && typeof playPromise === 'object' && typeof playPromise.then === 'function') {
                    return; // Пропускаем новую попытку воспроизведения пока не завершится текущая
                }
                
                // Создаем новый Promise
                playPromise = musicElement.play()
                    .catch(e => {
                        console.log("Автоматическое воспроизведение музыки заблокировано браузером:", e);
                    })
                    .finally(() => {
                        // В любом случае сбрасываем Promise
                        playPromise = null;
                    });
            } catch (e) {
                console.log("Ошибка воспроизведения музыки:", e);
                playPromise = null;
            }
        }
    }
    
    // Остановка фоновой музыки
    function stopMusic() {
        if (musicElement) {
            try {
                musicElement.pause();
                musicElement.currentTime = 0;
                // Сбрасываем Promise после остановки
                playPromise = null;
            } catch (e) {
                console.log("Ошибка при остановке музыки:", e);
            }
        }
    }
    
    // Воспроизведение звукового эффекта
    function playSoundEffect(name) {
        if (sounds[name]) {
            try {
                // Создаем клон звука для возможности множественного воспроизведения
                const sound = sounds[name].cloneNode();
                sound.volume = sfxVolume;
                
                // Добавляем в список активных звуков
                activeAudioElements.push(sound);
                
                // Воспроизводим с обработкой ошибок
                sound.play()
                    .catch(e => {
                        console.log(`Воспроизведение звука ${name} заблокировано:`, e);
                        // Удаляем из активных при ошибке
                        const index = activeAudioElements.indexOf(sound);
                        if (index !== -1) activeAudioElements.splice(index, 1);
                    });
                
                // Добавляем обработчик окончания для очистки ресурсов
                sound.onended = function() {
                    // Удаляем из списка активных звуков
                    const index = activeAudioElements.indexOf(sound);
                    if (index !== -1) activeAudioElements.splice(index, 1);
                    // Удаляем ссылки для GC
                    sound.onended = null;
                };
            } catch (e) {
                console.log(`Ошибка при воспроизведении звука ${name}:`, e);
            }
        }
    }
    
    // Установка громкости музыки
    function setMusicVolume(volume) {
        musicVolume = Math.max(0, Math.min(1, volume));
        if (musicElement) {
            musicElement.volume = musicVolume;
        }
        
        // Если громкость = 0, отключаем музыку
        isMusicEnabled = musicVolume > 0;
        
        // Если музыка должна быть выключена, останавливаем её
        if (!isMusicEnabled && musicElement && !musicElement.paused) {
            try {
                musicElement.pause();
                // Сбрасываем Promise после паузы
                playPromise = null;
            } catch (e) {
                console.log("Ошибка при паузе музыки:", e);
            }
        } 
        // Если музыка должна быть включена, но не играет, запускаем её
        else if (isMusicEnabled && musicElement && musicElement.paused) {
            playMusic();
        }
    }
    
    // Очистка ресурсов
    function cleanup() {
        // Останавливаем музыку
        if (musicElement) {
            try {
                musicElement.pause();
                musicElement.src = '';
                musicElement.load();
            } catch (e) {
                console.log("Ошибка при очистке музыки:", e);
            }
        }
        
        // Останавливаем все активные звуки
        activeAudioElements.forEach(sound => {
            try {
                sound.pause();
                sound.src = '';
                sound.load();
                sound.onended = null;
            } catch (e) {
                console.log("Ошибка при очистке звука:", e);
            }
        });
        
        // Очищаем массив активных звуков
        activeAudioElements = [];
        
        // Сбрасываем Promise
        playPromise = null;
    }
    
    // Публичный API
    return {
        init: init,
        playMusic: playMusic,
        stopMusic: stopMusic,
        playSoundEffect: playSoundEffect,
        setMusicVolume: setMusicVolume,
        cleanup: cleanup
    };
})();

// Инициализация аудио при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    AudioManager.init();
});

// Очистка ресурсов при выгрузке страницы
window.addEventListener('beforeunload', function(event) {
    // Очищаем ресурсы аудио без возврата результата
    AudioManager.cleanup();
});