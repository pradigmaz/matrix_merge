/**
 * ads.js - Заглушки для рекламы и бонусов в игре Matrix Drop
 * Предназначен для последующей интеграции с Яндекс Games SDK
 */

// Объект с методами для работы с рекламой и бонусами
const Ads = (() => {
    // Состояние рекламы
    const state = {
        lastAdShown: 0,
        adInterval: 5 * 60 * 1000, // 5 минут в миллисекундах
        isAdPlaying: false,
        pendingCallback: null
    };
    
    /**
     * Инициализация заглушек рекламы
     */
    function init() {
        // В реальной интеграции здесь будет инициализация Яндекс Games SDK
        console.log('Ads: инициализация рекламных заглушек');
        
        // Запуск таймера для периодического показа рекламы
        startAdTimer();
    }
    
    /**
     * Запуск таймера для показа рекламы с интервалом
     */
    function startAdTimer() {
        // Проверяем время с последнего показа рекламы
        setInterval(() => {
            const currentTime = performance.now();
            if (!state.isAdPlaying && 
                currentTime - state.lastAdShown >= state.adInterval) {
                showPeriodicAd();
            }
        }, 10000); // Проверяем каждые 10 секунд
    }
    
    /**
     * Показ периодической рекламы
     */
    function showPeriodicAd() {
        // Проверяем, что игра активна и не на паузе
        if (window.Game && window.Game.state && !window.Game.state.isGameOver) {
            console.log('Ads: показ периодической рекламы');
            showAd(() => {
                console.log('Ads: периодическая реклама завершена');
            });
        }
    }
    
    /**
     * Показ рекламы при проигрыше с возможностью продолжения
     */
    function showGameOverAd(callback) {
        console.log('Ads: показ рекламы после проигрыша');
        showAd(() => {
            // Удаляем 50% объектов для продолжения
            if (window.Game && window.Game.state && window.Game.state.objects) {
                const objects = window.Game.state.objects;
                // Сортируем объекты по уровню (от меньшего к большему)
                objects.sort((a, b) => a.level - b.level);
                
                // Удаляем половину объектов (начиная с самых маленьких)
                const removeCount = Math.floor(objects.length / 2);
                if (removeCount > 0) {
                    objects.splice(0, removeCount);
                }
                
                // Сбрасываем флаг проигрыша
                window.Game.state.isGameOver = false;
                
                console.log(`Ads: удалено ${removeCount} объектов для продолжения игры`);
                
                // Вызываем колбэк, если он был передан
                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        });
    }
    
    /**
     * Общая функция для показа рекламы (заглушка)
     */
    function showAd(callback) {
        // Если реклама уже воспроизводится, сохраняем колбэк и выходим
        if (state.isAdPlaying) {
            state.pendingCallback = callback;
            return;
        }
        
        // Устанавливаем флаг воспроизведения рекламы
        state.isAdPlaying = true;
        state.lastAdShown = performance.now();
        
        // Имитация показа рекламы (в реальном приложении здесь будет вызов SDK)
        console.log('Ads: начало показа рекламы (заглушка)');
        
        // Имитируем задержку от рекламы
        setTimeout(() => {
            // Сбрасываем флаг воспроизведения
            state.isAdPlaying = false;
            
            // Вызываем колбэк после "просмотра" рекламы
            if (callback && typeof callback === 'function') {
                callback();
            }
            
            // Если есть ожидающий колбэк, вызываем его и очищаем
            if (state.pendingCallback) {
                const pendingCallback = state.pendingCallback;
                state.pendingCallback = null;
                pendingCallback();
            }
            
            console.log('Ads: конец показа рекламы (заглушка)');
        }, 1000); // Имитация длительности 1 секунда
    }
    
    /**
     * Активация бонуса в обмен на просмотр рекламы
     */
    function activateBonusForAd(bonusType, position, callback) {
        // Показываем рекламу
        showAd(() => {
            // Применяем бонус в зависимости от типа
            if (bonusType === 'disintegration') {
                // Активация бонуса дезинтеграции
                if (window.Game && window.Game.activateDisintegration) {
                    window.Game.activateDisintegration();
                }
            } else if (bonusType === 'bomb') {
                // Активация бонуса бомбы
                if (window.Game && window.Game.activateBomb) {
                    const { x, y } = position || { x: window.Game.width / 2, y: 600 };
                    window.Game.activateBomb(x, y);
                }
            }
            
            // Вызываем колбэк, если он был передан
            if (callback && typeof callback === 'function') {
                callback();
            }
        });
    }
    
    // Публичный API
    return {
        init,
        showAd,
        showGameOverAd,
        activateBonusForAd
    };
})();

// Экспорт объекта Ads для использования в других модулях
window.Ads = Ads;
