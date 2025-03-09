/**
 * render.js - Визуализация игры Matrix Drop
 * Отвечает за отрисовку всех визуальных элементов игры
 */

// Объект с методами для отрисовки
const Renderer = (() => {
    // Константы
    const GAME_WIDTH = 1080;
    const GAME_HEIGHT = 1920;
    
    // Символы для матричного дождя
    const MATRIX_CHARS = [
        // Японские символы (катакана)
        'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ',
        'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
        'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ',
        // Математические символы
        '∑', '∫', '∞', '≠', '≤', '≥', 'π', '√', '∆', 'Ω', '∇', '∂', 'µ', 'θ', 'λ',
        // Цифры и другие символы
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '#', '$', '%', '*', '+'
    ];
    
    // Параметры матричного дождя
    const matrixRain = {
        drops: [],
        lastUpdateTime: 0,
        updateInterval: 100, // Интервал обновления (мс)
        glitchTime: 0,       // Время до следующего глитча
        isGlitching: false,  // Флаг активного глитча
        glitchDuration: 0    // Длительность текущего глитча
    };
    
    // Инициализация матричного дождя
    function initMatrixRain() {
        const dropCount = 200;
        matrixRain.drops = [];
        
        for (let i = 0; i < dropCount; i++) {
            matrixRain.drops.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                speed: 1 + Math.random() * 5,
                char: getRandomMatrixChar(),
                opacity: 0.1 + Math.random() * 0.9,
                size: 12 + Math.floor(Math.random() * 16)
            });
        }
        
        // Установка времени до первого глитча
        matrixRain.glitchTime = 30000 + Math.random() * 60000; // 30-90 секунд
    }
    
    // Получение случайного символа для матричного дождя
    function getRandomMatrixChar() {
        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    }
    
    /**
     * Отрисовка фона (матричный дождь)
     */
    function renderBackground(ctx, colorScheme) {
        const currentTime = performance.now();
        
        // Обновление матричного дождя
        if (currentTime - matrixRain.lastUpdateTime > matrixRain.updateInterval) {
            updateMatrixRain(currentTime);
            matrixRain.lastUpdateTime = currentTime;
        }
        
        // Очистка фона с небольшим затемнением предыдущего кадра
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Отрисовка символов
        for (const drop of matrixRain.drops) {
            // Установка цвета в зависимости от выбранной схемы
            let color;
            switch (colorScheme) {
                case 'classic':
                    color = `rgba(0, 255, 0, ${drop.opacity})`;
                    break;
                case 'cyberpunk':
                    color = `rgba(0, 255, 255, ${drop.opacity})`;
                    break;
                case 'chaos':
                    color = `rgba(255, 0, 0, ${drop.opacity})`;
                    break;
                default:
                    color = `rgba(0, 255, 0, ${drop.opacity})`;
            }
            
            ctx.font = `${drop.size}px monospace`;
            ctx.fillStyle = color;
            
            // Применение эффекта глитча
            if (matrixRain.isGlitching && Math.random() < 0.2) {
                // Рандомное смещение для эффекта глитча
                const glitchOffsetX = (Math.random() - 0.5) * 10;
                ctx.fillText(drop.char, drop.x + glitchOffsetX, drop.y);
                
                // Иногда добавляем "тень" символа
                if (Math.random() < 0.3) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(drop.char, drop.x + glitchOffsetX + 2, drop.y + 2);
                }
            } else {
                ctx.fillText(drop.char, drop.x, drop.y);
            }
        }
        
        // Управление глитчами
        if (!matrixRain.isGlitching && matrixRain.glitchTime <= 0) {
            // Запуск глитча
            matrixRain.isGlitching = true;
            matrixRain.glitchDuration = 500 + Math.random() * 1500; // 0.5-2 секунды
        } else if (matrixRain.isGlitching && matrixRain.glitchDuration <= 0) {
            // Окончание глитча
            matrixRain.isGlitching = false;
            matrixRain.glitchTime = 30000 + Math.random() * 60000; // 30-90 секунд до следующего
        }
    }
    
    /**
     * Обновление матричного дождя
     */
    function updateMatrixRain(currentTime) {
        // Уменьшение счетчиков времени
        if (matrixRain.isGlitching) {
            matrixRain.glitchDuration -= matrixRain.updateInterval;
        } else {
            matrixRain.glitchTime -= matrixRain.updateInterval;
        }
        
        // Обновление символов матричного дождя
        for (const drop of matrixRain.drops) {
            // Движение капли вниз
            drop.y += drop.speed;
            
            // Если капля достигла низа экрана, возвращаем её наверх
            if (drop.y > GAME_HEIGHT) {
                drop.y = 0;
                drop.x = Math.random() * GAME_WIDTH;
                drop.char = getRandomMatrixChar();
            }
            
            // Случайная смена символа (10% шанс при каждом обновлении)
            if (Math.random() < 0.1) {
                drop.char = getRandomMatrixChar();
            }
        }
    }
    
    /**
     * Отрисовка пульсирующей верхней линии (границы проигрыша)
     * Примечание: основная линия отображается через DOM элемент, 
     * но здесь мы добавляем дополнительный эффект пульсации
     */
    function renderBoundaryLine(ctx, lineY) {
        // Расчет пульсации (от 0 до 1)
        const pulse = (Math.sin(performance.now() * 0.005) + 1) / 2;
        
        // Градиент для пульсирующего свечения вокруг линии
        const gradient = ctx.createLinearGradient(0, lineY - 10, 0, lineY + 10);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.5, `rgba(255, 0, 0, ${0.3 + pulse * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        // Отрисовка пульсирующего свечения на канвасе
        ctx.fillStyle = gradient;
        ctx.fillRect(0, lineY - 10, GAME_WIDTH, 20);
    }
    
    /**
     * Отрисовка всех игровых объектов
     */
    function renderObjects(ctx, objects) {
        for (const obj of objects) {
            // Сохранение контекста для вращения
            ctx.save();
            
            // Перемещение в центр объекта
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.rotation);
            
            // Отрисовка основного круга
            ctx.beginPath();
            ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();
            
            // Отрисовка неонового контура
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.stroke();
            
            // Добавление свечения
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Отображение уровня объекта
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = `${obj.radius * 0.7}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.level.toString(), 0, 0);
            
            // Восстановление контекста
            ctx.restore();
        }
    }
    
    /**
     * Отрисовка эффектов бонусов
     */
    function renderBonusEffect(ctx, bonus) {
        const elapsedTime = performance.now() - bonus.startTime;
        
        if (bonus.type === 'disintegration') {
            // Эффект дезинтеграции
            renderDisintegrationEffect(ctx, bonus, elapsedTime);
        } else if (bonus.type === 'bomb') {
            // Эффект взрыва
            renderBombEffect(ctx, bonus, elapsedTime);
        }
    }
    
    /**
     * Эффект дезинтеграции (линии между объектами, частицы)
     */
    function renderDisintegrationEffect(ctx, bonus, elapsedTime) {
        const { targets, level } = bonus;
        const duration = 1000; // Длительность эффекта (1 секунда)
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Соединяем все объекты одного уровня линиями
        ctx.strokeStyle = 'rgba(0, 255, 0, ' + (1 - progress) + ')';
        ctx.lineWidth = 2;
        
        // Рисуем линии между всеми объектами
        for (let i = 0; i < targets.length; i++) {
            for (let j = i + 1; j < targets.length; j++) {
                ctx.beginPath();
                ctx.moveTo(targets[i].x, targets[i].y);
                ctx.lineTo(targets[j].x, targets[j].y);
                ctx.stroke();
            }
        }
        
        // Рисуем частицы распада для каждого объекта
        for (const obj of targets) {
            // Количество частиц зависит от размера объекта
            const particleCount = Math.floor(obj.radius);
            
            for (let i = 0; i < particleCount; i++) {
                // Рассчитываем позицию частицы (движется от центра объекта)
                const angle = Math.random() * Math.PI * 2;
                const distance = progress * obj.radius * 2;
                const x = obj.x + Math.cos(angle) * distance;
                const y = obj.y + Math.sin(angle) * distance;
                
                // Размер частицы уменьшается со временем
                const size = (1 - progress) * 3;
                
                // Рисуем частицу
                ctx.fillStyle = 'rgba(0, 255, 0, ' + (1 - progress) + ')';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Эффект бомбы (взрывная волна)
     */
    function renderBombEffect(ctx, bonus, elapsedTime) {
        const { x, y, radius, targets } = bonus;
        const duration = 1000; // Длительность эффекта (1 секунда)
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Рисуем расширяющуюся волну
        const waveRadius = radius * progress;
        const waveOpacity = 1 - progress;
        
        // Градиент для волны взрыва
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, waveRadius);
        gradient.addColorStop(0, `rgba(255, 255, 0, ${waveOpacity * 0.8})`);
        gradient.addColorStop(0.7, `rgba(255, 165, 0, ${waveOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, waveRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Внутренняя пульсирующая область
        const innerRadius = radius * 0.2 * (1 - progress);
        ctx.fillStyle = `rgba(255, 255, 255, ${waveOpacity})`;
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Рисуем частицы от взрыва
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = waveRadius * (0.5 + Math.random() * 0.5);
            const particleX = x + Math.cos(angle) * dist;
            const particleY = y + Math.sin(angle) * dist;
            const size = 2 + Math.random() * 4;
            
            ctx.fillStyle = `rgba(255, ${Math.random() * 200}, 0, ${waveOpacity})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Публичный API
    return {
        init: initMatrixRain,
        renderBackground,
        renderBoundaryLine,
        renderObjects,
        renderBonusEffect
    };
})();

// Инициализация при загрузке скрипта
Renderer.init();

// Экспорт объекта Renderer для использования в других модулях
window.Renderer = Renderer;
