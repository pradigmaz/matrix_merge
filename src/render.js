/**
 * render.js
 * Отвечает за визуальное отображение всех элементов игры:
 * - отрисовка объектов разных форм с неоновым эффектом
 * - рендеринг фона "матричный дождь"
 * - анимации слияния, исчезновения и др.
 */

// Класс для управления рендерингом игры
class Renderer {
    constructor(gameCanvas, bgCanvas, gameWidth, gameHeight, topLine) {
        // Холст для игровых объектов
        this.gameCanvas = gameCanvas;
        this.gameCtx = gameCanvas.getContext('2d');
        
        // Холст для фона (матричный дождь)
        this.bgCanvas = bgCanvas;
        this.bgCtx = bgCanvas.getContext('2d');
        
        // Размеры игрового поля
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        
        // Позиция верхней линии (граница проигрыша)
        this.topLine = topLine;
        
        // Таймер для пульсации линии
        this.lineTime = 0;
        
        // Настройка холстов
        this.gameCanvas.width = this.gameWidth;
        this.gameCanvas.height = this.gameHeight;
        this.bgCanvas.width = this.gameWidth;
        this.bgCanvas.height = this.gameHeight;
        
        // Символы для матричного дождя
        this.matrixChars = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｦｲｸｺｿﾁﾄﾉﾌﾔﾖﾙﾚﾛﾝπΣ∞ΦΩαβγδεζηθικλμνξοπρστυφχψω∷∫∮∝∞∧∨∑∏∪∩∈∵∴⊥‖∠⌒⊙≌∽≦≧≒≠≤≥º¹²³∟⊿ⁿ₊₋₌∏₍₎₀₁₂₃₄₅₆₇₈₉ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ0123456789';
        
        // "Капли" матричного дождя
        this.drops = [];
        this.initMatrixRain();
        
        // Текущая цветовая схема
        this.colorScheme = {
            background: '#000',
            matrixText: '#0f0',
            objectStroke: '#fff',
            objectFill: 'rgba(255, 255, 255, 0.1)',
            topLine: '#f00'
        };
    }

    // Инициализация матричного дождя
    initMatrixRain() {
        const fontSize = 14;
        const columns = Math.floor(this.gameWidth / fontSize);
        
        // Создаем капли для каждой колонки
        for (let i = 0; i < columns; i++) {
            this.drops.push({
                x: i * fontSize,
                y: Math.random() * this.gameHeight,
                speed: 1 + Math.random() * 3,
                chars: [],
                lastUpdate: 0
            });
            
            // Заполняем колонку случайными символами
            const dropLength = 5 + Math.floor(Math.random() * 15);
            for (let j = 0; j < dropLength; j++) {
                this.drops[i].chars.push({
                    char: this.getRandomMatrixChar(),
                    opacity: (1 - j / dropLength) * 0.9
                });
            }
        }
    }

    // Получение случайного символа для матричного дождя
    getRandomMatrixChar() {
        return this.matrixChars.charAt(Math.floor(Math.random() * this.matrixChars.length));
    }

    // Обновление матричного дождя
    updateMatrixRain(deltaTime) {
        for (let i = 0; i < this.drops.length; i++) {
            const drop = this.drops[i];
            
            // Обновляем позицию капли
            drop.y += drop.speed * (deltaTime / 16);
            
            // Если капля вышла за пределы экрана, сбрасываем ее наверх
            if (drop.y - drop.chars.length * 14 > this.gameHeight) {
                drop.y = 0;
                drop.speed = 1 + Math.random() * 3;
            }
            
            // Периодически обновляем символы
            drop.lastUpdate += deltaTime;
            if (drop.lastUpdate > 500) {
                // Обновляем случайный символ в капле
                const randomIndex = Math.floor(Math.random() * drop.chars.length);
                if (randomIndex < drop.chars.length) {
                    drop.chars[randomIndex].char = this.getRandomMatrixChar();
                }
                drop.lastUpdate = 0;
            }
        }
    }

    // Рендеринг матричного дождя
    renderMatrixRain() {
        // Очищаем холст с полупрозрачным черным цветом для создания шлейфа
        this.bgCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.bgCtx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        
        // Отрисовываем символы
        this.bgCtx.font = '14px monospace';
        
        for (const drop of this.drops) {
            for (let i = 0; i < drop.chars.length; i++) {
                const char = drop.chars[i];
                
                // Цвет с учетом прозрачности
                this.bgCtx.fillStyle = `rgba(0, 255, 0, ${char.opacity})`;
                
                // Позиция символа
                const x = drop.x;
                const y = drop.y - i * 14;
                
                // Пропускаем символы выше экрана
                if (y < 0) continue;
                
                // Отрисовываем символ
                this.bgCtx.fillText(char.char, x, y);
            }
        }
    }

    // Отрисовка верхней линии (граница проигрыша)
    renderTopLine(deltaTime) {
        // Обновляем время для пульсации
        this.lineTime += deltaTime;
        
        // Пульсация шириины линии (от 3 до 6 пикселей)
        const lineWidth = 3 + Math.sin(this.lineTime / 200) * 2;
        
        // Рисуем линию
        this.gameCtx.beginPath();
        this.gameCtx.moveTo(0, this.topLine);
        this.gameCtx.lineTo(this.gameWidth, this.topLine);
        this.gameCtx.strokeStyle = this.colorScheme.topLine;
        this.gameCtx.lineWidth = lineWidth;
        
        // Добавляем свечение
        this.gameCtx.shadowColor = this.colorScheme.topLine;
        this.gameCtx.shadowBlur = 10;
        this.gameCtx.stroke();
        
        // Сбрасываем свечение
        this.gameCtx.shadowBlur = 0;
    }

    // Отрисовка одного объекта
    renderObject(obj) {
        this.gameCtx.save();
        
        // Перемещаем начало координат в центр объекта и применяем вращение
        this.gameCtx.translate(obj.x, obj.y);
        this.gameCtx.rotate(obj.rotation);
        
        // Настраиваем стили отрисовки
        this.gameCtx.fillStyle = this.colorScheme.objectFill;
        this.gameCtx.strokeStyle = this.colorScheme.objectStroke;
        this.gameCtx.lineWidth = 2;
        
        // Добавляем неоновое свечение
        this.gameCtx.shadowColor = this.colorScheme.objectStroke;
        this.gameCtx.shadowBlur = 10;
        
        // Отрисовываем объект в зависимости от его типа
        switch (obj.shapeType) {
            case 'circle':
                this.gameCtx.beginPath();
                this.gameCtx.arc(0, 0, obj.size / 2, 0, Math.PI * 2);
                this.gameCtx.fill();
                this.gameCtx.stroke();
                break;
                
            case 'square':
                this.gameCtx.beginPath();
                this.gameCtx.rect(-obj.size / 2, -obj.size / 2, obj.size, obj.size);
                this.gameCtx.fill();
                this.gameCtx.stroke();
                break;
                
            case 'triangle':
                this.gameCtx.beginPath();
                this.gameCtx.moveTo(0, -obj.size / 2);
                this.gameCtx.lineTo(-obj.size / 2, obj.size / 2);
                this.gameCtx.lineTo(obj.size / 2, obj.size / 2);
                this.gameCtx.closePath();
                this.gameCtx.fill();
                this.gameCtx.stroke();
                break;
                
            case 'oval':
                this.gameCtx.beginPath();
                this.gameCtx.ellipse(0, 0, obj.size / 2, obj.size / 3, 0, 0, Math.PI * 2);
                this.gameCtx.fill();
                this.gameCtx.stroke();
                break;
                
            case 'diamond':
                this.gameCtx.beginPath();
                this.gameCtx.moveTo(0, -obj.size / 2);
                this.gameCtx.lineTo(obj.size / 2, 0);
                this.gameCtx.lineTo(0, obj.size / 2);
                this.gameCtx.lineTo(-obj.size / 2, 0);
                this.gameCtx.closePath();
                this.gameCtx.fill();
                this.gameCtx.stroke();
                break;
        }
        
        // Отображаем уровень объекта в центре
        this.gameCtx.fillStyle = '#fff';
        this.gameCtx.font = `${obj.size / 3}px Orbitron, sans-serif`;
        this.gameCtx.textAlign = 'center';
        this.gameCtx.textBaseline = 'middle';
        this.gameCtx.fillText(obj.level.toString(), 0, 0);
        
        // Если объект в процессе слияния, рисуем анимацию
        if (obj.merging && obj.mergePair) {
            // Импульсное свечение
            this.gameCtx.shadowBlur = 20;
            this.gameCtx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.beginPath();
            this.gameCtx.arc(0, 0, obj.size / 1.5, 0, Math.PI * 2);
            this.gameCtx.stroke();
        }
        
        this.gameCtx.restore();
    }

    // Отрисовка всех объектов
    renderObjects(objects) {
        for (const obj of objects) {
            this.renderObject(obj);
        }
    }

    // Отрисовка интерфейса
    renderUI(score, bonus1Cooldown, bonus2Cooldown) {
        // Отрисовка счетчика очков
        this.gameCtx.fillStyle = this.colorScheme.objectStroke;
        this.gameCtx.font = '40px Orbitron, sans-serif';
        this.gameCtx.textAlign = 'left';
        this.gameCtx.textBaseline = 'top';
        this.gameCtx.shadowColor = this.colorScheme.objectStroke;
        this.gameCtx.shadowBlur = 10;
        this.gameCtx.fillText(`Score: ${score}`, 20, 20);
        
        // Отрисовка кнопки настроек
        this.gameCtx.beginPath();
        this.gameCtx.arc(this.gameWidth - 40, 40, 20, 0, Math.PI * 2);
        this.gameCtx.stroke();
        this.renderGear(this.gameWidth - 40, 40, 15);
        
        // Отрисовка кнопок бонусов в верхней части экрана
        this.renderBonusButton('Дезинтеграция', this.gameWidth / 2 - 100, 40, bonus1Cooldown);
        this.renderBonusButton('Бомба', this.gameWidth / 2 + 100, 40, bonus2Cooldown);
        
        // Сбрасываем эффекты
        this.gameCtx.shadowBlur = 0;
    }

    // Отрисовка иконки шестеренки для кнопки настроек
    renderGear(x, y, size) {
        this.gameCtx.save();
        this.gameCtx.translate(x, y);
        
        const toothCount = 8;
        const innerRadius = size * 0.6;
        const outerRadius = size;
        
        this.gameCtx.beginPath();
        for (let i = 0; i < toothCount; i++) {
            const angle = (i / toothCount) * Math.PI * 2;
            const nextAngle = ((i + 0.5) / toothCount) * Math.PI * 2;
            const nextNextAngle = ((i + 1) / toothCount) * Math.PI * 2;
            
            this.gameCtx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
            this.gameCtx.lineTo(Math.cos(nextAngle) * innerRadius, Math.sin(nextAngle) * innerRadius);
            this.gameCtx.lineTo(Math.cos(nextNextAngle) * outerRadius, Math.sin(nextNextAngle) * outerRadius);
        }
        this.gameCtx.closePath();
        this.gameCtx.fillStyle = this.colorScheme.objectFill;
        this.gameCtx.fill();
        this.gameCtx.stroke();
        
        // Отверстие в центре
        this.gameCtx.beginPath();
        this.gameCtx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        this.gameCtx.fillStyle = this.colorScheme.objectFill;
        this.gameCtx.fill();
        this.gameCtx.stroke();
        
        this.gameCtx.restore();
    }

    // Отрисовка кнопки бонуса
    renderBonusButton(type, x, y, cooldown) {
        this.gameCtx.save();
        this.gameCtx.translate(x, y);
        
        // Рисуем круглую кнопку
        this.gameCtx.beginPath();
        this.gameCtx.arc(0, 0, 40, 0, Math.PI * 2);
        this.gameCtx.fillStyle = this.colorScheme.objectFill;
        this.gameCtx.fill();
        this.gameCtx.stroke();
        
        // Рисуем иконку внутри
        if (type === 'Дезинтеграция') {
            // Иконка дезинтеграции (импульс)
            this.gameCtx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                this.gameCtx.moveTo(0, 0);
                this.gameCtx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
            }
            this.gameCtx.stroke();
        } else if (type === 'Бомба') {
            // Иконка бомбы
            this.gameCtx.beginPath();
            this.gameCtx.arc(0, 5, 20, 0, Math.PI * 2);
            this.gameCtx.fill();
            this.gameCtx.stroke();
            
            // Фитиль
            this.gameCtx.beginPath();
            this.gameCtx.moveTo(0, -15);
            this.gameCtx.quadraticCurveTo(10, -25, 0, -30);
            this.gameCtx.stroke();
        }
        
        // Если бонус на кулдауне, отображаем таймер
        if (cooldown > 0) {
            // Затемняем кнопку
            this.gameCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.gameCtx.beginPath();
            this.gameCtx.arc(0, 0, 40, 0, Math.PI * 2);
            this.gameCtx.fill();
            
            // Отображаем оставшееся время
            const seconds = Math.ceil(cooldown / 1000);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = '20px Orbitron, sans-serif';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.textBaseline = 'middle';
            this.gameCtx.fillText(seconds.toString(), 0, 0);
            
            // Рисуем круг прогресса
            const progress = 1 - (cooldown / 60000); // 60 секунд кулдаун
            this.gameCtx.beginPath();
            this.gameCtx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            this.gameCtx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.stroke();
        }
        
        this.gameCtx.restore();
    }

    // Основной метод рендеринга игры
    render(objects, score, bonus1Cooldown, bonus2Cooldown, deltaTime) {
        // Обновляем и рендерим матричный дождь
        this.updateMatrixRain(deltaTime);
        this.renderMatrixRain();
        
        // Очищаем игровой холст
        this.gameCtx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        
        // Рисуем верхнюю линию
        this.renderTopLine(deltaTime);
        
        // Рисуем все объекты
        this.renderObjects(objects);
        
        // Рисуем интерфейс
        this.renderUI(score, bonus1Cooldown, bonus2Cooldown);
    }

    // Установка цветовой схемы
    setColorScheme(scheme) {
        switch (scheme) {
            case 'classic':
                this.colorScheme = {
                    background: '#000',
                    matrixText: '#0f0',
                    objectStroke: '#fff',
                    objectFill: 'rgba(255, 255, 255, 0.1)',
                    topLine: '#f00'
                };
                break;
                
            case 'cyberpunk':
                this.colorScheme = {
                    background: '#000033',
                    matrixText: '#0088ff',
                    objectStroke: '#ff00ff',
                    objectFill: 'rgba(255, 0, 255, 0.1)',
                    topLine: '#ff00ff'
                };
                break;
                
            case 'chaos':
                this.colorScheme = {
                    background: '#330000',
                    matrixText: '#ff0000',
                    objectStroke: '#ffff00',
                    objectFill: 'rgba(255, 255, 0, 0.1)',
                    topLine: '#ffff00'
                };
                break;
        }
        
        // Обновляем фон
        document.body.style.backgroundColor = this.colorScheme.background;
    }

    // Анимация бонуса "Дезинтеграция"
    animateDisintegration(objectsToRemove) {
        // Для каждого объекта создаем анимацию распада
        for (const obj of objectsToRemove) {
            // Создаем частицы для эффекта распада
            const particleCount = 10;
            for (let i = 0; i < particleCount; i++) {
                // TODO: Реализация анимации частиц для распада объектов
                // В базовой версии просто делаем мгновенное исчезновение
            }
        }
    }

    // Анимация бонуса "Бомба"
    animateBomb(x, y, radius) {
        // Рисуем взрыв
        this.gameCtx.save();
        
        // Градиент от центра к краю
        const gradient = this.gameCtx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        
        // Рисуем круг взрыва
        this.gameCtx.beginPath();
        this.gameCtx.fillStyle = gradient;
        this.gameCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.gameCtx.fill();
        
        this.gameCtx.restore();
    }
}