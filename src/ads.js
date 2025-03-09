/**
 * ads.js
 * Содержит заглушки для рекламы и бонусов.
 * В будущем эти функции будут заменены реальными вызовами Яндекс Games SDK.
 */

// Класс для работы с рекламой и бонусами
class Ads {
    constructor(game) {
        this.game = game;
        
        // Время последнего показа рекламы (для периодической рекламы)
        this.lastAdTime = 0;
        
        // Флаг, показывающий, что идет показ рекламы
        this.adShowing = false;
    }

    // Инициализация рекламы (в будущем здесь будет инициализация SDK)
    init() {
        console.log('Реклама инициализирована (заглушка)');
        return Promise.resolve();
    }

    // Показ вступительной рекламы
    showInitialAd() {
        // Заглушка для вступительной рекламы
        console.log('Показываем вступительную рекламу (заглушка)');
        
        // Имитируем показ рекламы на 2 секунды
        this.adShowing = true;
        return new Promise(resolve => {
            setTimeout(() => {
                this.adShowing = false;
                console.log('Реклама завершена');
                resolve();
            }, 2000);
        });
    }

    // Показ периодической рекламы (каждые 5 минут)
    checkPeriodicAd() {
        const currentTime = Date.now();
        
        // Проверяем, прошло ли 5 минут с последнего показа
        if (currentTime - this.lastAdTime > 5 * 60 * 1000) {
            // Заглушка для показа рекламы
            console.log('Показываем периодическую рекламу (заглушка)');
            
            // Имитируем показ рекламы на 2 секунды
            this.adShowing = true;
            this.game.pause();
            
            return new Promise(resolve => {
                setTimeout(() => {
                    this.adShowing = false;
                    this.lastAdTime = currentTime;
                    console.log('Реклама завершена');
                    this.game.resume();
                    resolve();
                }, 2000);
            });
        }
        
        return Promise.resolve(false);
    }

    // Показ рекламы после проигрыша для продолжения
    showContinueAd() {
        // Заглушка для показа рекламы после проигрыша
        console.log('Показываем рекламу для продолжения (заглушка)');
        
        // Имитируем показ рекламы на 2 секунды
        this.adShowing = true;
        return new Promise(resolve => {
            setTimeout(() => {
                this.adShowing = false;
                console.log('Реклама завершена');
                
                // Возвращаем true, что означает успешный просмотр рекламы
                // и возможность продолжить игру
                resolve(true);
            }, 2000);
        });
    }

    // Показ рекламы для активации бонуса
    showBonusAd(bonusType) {
        // Заглушка для показа рекламы для бонуса
        console.log(`Показываем рекламу для активации бонуса ${bonusType} (заглушка)`);
        
        // Имитируем показ рекламы на 2 секунды
        this.adShowing = true;
        this.game.pause();
        
        return new Promise(resolve => {
            setTimeout(() => {
                this.adShowing = false;
                console.log('Реклама завершена');
                this.game.resume();
                
                // Возвращаем true, что означает успешный просмотр рекламы
                // и активацию бонуса
                resolve(true);
            }, 2000);
        });
    }

    // Проверка, идет ли сейчас показ рекламы
    isAdShowing() {
        return this.adShowing;
    }
}