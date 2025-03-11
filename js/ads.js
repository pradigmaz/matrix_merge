/**
 * ads.js - Заглушка для системы рекламы
 * В реальном проекте нужно заменить на интеграцию с Яндекс.Играми
 */

const AdsManager = (function() {
    // Приватные переменные
    let lastAdTime = 0;
    const AD_COOLDOWN = 5 * 60 * 1000; // 5 минут в миллисекундах
    let adCallback = null;
    let isAdShowing = false;
    let countdownInterval = null; // Сохраняем ссылку на интервал
    let autoCompleteTimeout = null; // Сохраняем ссылку на таймаут
    
    // Кнопки UI для имитации рекламы
    let showAdButton = null;
    let skipAdButton = null;
    let adOverlay = null;
    
    // Инициализация
    function init() {
        console.log("Инициализация AdsManager (заглушка)");
        
        // Создаем элементы UI для имитации рекламы
        createAdUI();
    }
    
    // Создание UI для имитации рекламы
    function createAdUI() {
        // Создаем оверлей для рекламы
        adOverlay = document.createElement('div');
        adOverlay.className = 'ad-overlay overlay';
        adOverlay.style.display = 'none';
        adOverlay.style.zIndex = '100';
        
        const adContent = document.createElement('div');
        adContent.className = 'ad-content';
        
        const adTitle = document.createElement('h2');
        adTitle.className = 'neon-text';
        adTitle.textContent = 'Реклама';
        
        const adDescription = document.createElement('p');
        adDescription.className = 'neon-text';
        adDescription.textContent = 'Это имитация рекламы для разработки. В финальной версии здесь будет настоящая реклама.';
        
        showAdButton = document.createElement('button');
        showAdButton.className = 'neon-button';
        showAdButton.textContent = 'Смотреть рекламу';
        showAdButton.addEventListener('click', function() {
            showAd();
        });
        
        skipAdButton = document.createElement('button');
        skipAdButton.className = 'neon-button';
        skipAdButton.textContent = 'Пропустить (3)';
        skipAdButton.style.display = 'none';
        skipAdButton.style.marginTop = '10px';
        
        adContent.appendChild(adTitle);
        adContent.appendChild(adDescription);
        adContent.appendChild(showAdButton);
        adContent.appendChild(skipAdButton);
        adOverlay.appendChild(adContent);
        
        document.body.appendChild(adOverlay);
    }
    
    // Проверка возможности показа рекламы
    function canShowAd() {
        const now = Date.now();
        return now - lastAdTime >= AD_COOLDOWN;
    }
    
    // Имитация показа рекламы
    function showAd(callback) {
        if (isAdShowing) return;
        
        adCallback = callback;
        isAdShowing = true;
        
        // Показываем оверлей рекламы
        if (adOverlay) {
            adOverlay.style.display = 'flex';
        }
        
        // Скрываем кнопку показа рекламы
        if (showAdButton) {
            showAdButton.style.display = 'none';
        }
        
        // Показываем кнопку пропуска с обратным отсчетом
        if (skipAdButton) {
            skipAdButton.style.display = 'block';
            
            // Очищаем предыдущий интервал и таймаут, если они есть
            clearAllTimers();
            
            // Имитация длительности рекламы с обратным отсчетом
            let seconds = 3;
            skipAdButton.textContent = `Пропустить (${seconds})`;
            
            countdownInterval = setInterval(() => {
                seconds--;
                skipAdButton.textContent = `Пропустить (${seconds})`;
                
                if (seconds <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    skipAdButton.textContent = 'Пропустить';
                    
                    // Создаем новую кнопку, чтобы избежать проблем с множественными обработчиками
                    const newSkipButton = skipAdButton.cloneNode(true);
                    newSkipButton.addEventListener('click', completeAd);
                    skipAdButton.parentNode.replaceChild(newSkipButton, skipAdButton);
                    skipAdButton = newSkipButton;
                }
            }, 1000);
            
            // Автоматическое завершение через 5 секунд
            autoCompleteTimeout = setTimeout(() => {
                completeAd();
            }, 5000);
        }
    }
    
    // Очистка всех таймеров
    function clearAllTimers() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        if (autoCompleteTimeout) {
            clearTimeout(autoCompleteTimeout);
            autoCompleteTimeout = null;
        }
    }
    
    // Завершение просмотра рекламы
    function completeAd() {
        if (!isAdShowing) return;
        
        // Очищаем все таймеры
        clearAllTimers();
        
        // Сохраняем коллбэк в локальной переменной перед сбросом
        const callback = adCallback;
        
        // Сбрасываем состояние
        isAdShowing = false;
        adCallback = null;
        lastAdTime = Date.now();
        
        // Скрываем UI рекламы
        if (adOverlay) {
            adOverlay.style.display = 'none';
        }
        
        // Возвращаем кнопки в исходное состояние
        if (showAdButton) {
            showAdButton.style.display = 'block';
        }
        
        if (skipAdButton) {
            skipAdButton.style.display = 'none';
            skipAdButton.textContent = 'Пропустить (3)';
            
            // Создаем новую кнопку, чтобы избежать проблем с множественными обработчиками
            const newSkipButton = skipAdButton.cloneNode(true);
            skipAdButton.parentNode.replaceChild(newSkipButton, skipAdButton);
            skipAdButton = newSkipButton;
        }
        
        // Вызываем сохраненный коллбэк, если он есть - синхронно, без setTimeout
        if (callback && typeof callback === 'function') {
            try {
                callback();
            } catch (e) {
                console.error("Ошибка при выполнении коллбэка рекламы:", e);
            }
        }
    }
    
    // Показать рекламу в начале игры
    function showStartGameAd(callback) {
        console.log("Показываем рекламу в начале игры");
        showAd(callback);
    }
    
    // Показать рекламу для продолжения игры
    function showContinueGameAd(callback) {
        console.log("Показываем рекламу для продолжения игры");
        showAd(callback);
    }
    
    // Показать рекламу для получения бонуса
    function showBonusAd(bonusType, callback) {
        console.log(`Показываем рекламу для получения бонуса: ${bonusType}`);
        showAd(callback);
    }
    
    // Проверка времени с последнего показа рекламы
    function getTimeUntilNextAd() {
        const now = Date.now();
        const elapsed = now - lastAdTime;   
        return Math.max(0, AD_COOLDOWN - elapsed);
    }
    
    // Очистка ресурсов при выгрузке страницы
    function cleanup() {
        clearAllTimers();
        
        // Сбрасываем состояние перед удалением элементов
        isAdShowing = false;
        adCallback = null;
        
        // Удаляем созданные элементы UI
        if (adOverlay && adOverlay.parentNode) {
            adOverlay.parentNode.removeChild(adOverlay);
        }
        
        // Удаляем все ссылки на элементы UI
        showAdButton = null;
        skipAdButton = null;
        adOverlay = null;
    }
    
    // Публичный API
    return {
        init: init,
        canShowAd: canShowAd,
        showStartGameAd: showStartGameAd,
        showContinueGameAd: showContinueGameAd,
        showBonusAd: showBonusAd,
        getTimeUntilNextAd: getTimeUntilNextAd,
        cleanup: cleanup
    };
})();

// Инициализация менеджера рекламы при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    AdsManager.init();
});

// Очистка ресурсов при выгрузке страницы
window.addEventListener('beforeunload', function(event) {
    // Важно! Не возвращаем ничего из обработчика beforeunload
    // чтобы избежать ошибки "A listener indicated an asynchronous response..."
    AdsManager.cleanup();
    // Явно не возвращаем true и не используем event.preventDefault()
});