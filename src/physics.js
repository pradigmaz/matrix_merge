/**
 * physics.js
 * Отвечает за физику игры: гравитацию, коллизии, 
 * слияние объектов и прочие физические аспекты
 */

// Константы физики
// Изменение констант физики для улучшения механики слияния
const GRAVITY = 0.5;        // Сила гравитации (оставляем без изменений)
const BOUNCE = 0.35;        // Коэффициент отскока - УМЕНЬШЕН с 0.4 до 0.35
const FRICTION = 0.98;      // Трение при движении (оставляем без изменений)
const MERGE_TIMER = 2;     // Время в мс для слияния

// Типы фигур
const SHAPES = ['circle', 'square', 'triangle', 'oval', 'diamond'];

// Класс для обработки физики объектов
class Physics {
    constructor(gameWidth, gameHeight, topLine, game) {
        this.gameWidth = gameWidth;       // Ширина игрового поля
        this.gameHeight = gameHeight;     // Высота игрового поля
        this.topLine = topLine;           // Верхняя граница (линия проигрыша)
        this.game = game;                 // Ссылка на экземпляр Game для обновления счета
        this.objects = [];                // Массив всех объектов в игре
        this.mergeInProgress = false;     // Флаг процесса слияния (для предотвращения множественных слияний)
        this.mergeTimers = new Map();     // Таймеры для отслеживания длительных контактов между объектами
    }

    // Создание нового объекта с заданным уровнем
    createObject(x, y, level = 1) {
        // Выбираем случайную форма из доступных
        const shapeType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        
        // Базовый размер для уровня 1
        const baseSize = 150;
        
        // Увеличиваем размер с каждым уровнем (на 20%)
        let size = baseSize;
        for (let i = 1; i < level; i++) {
            size *= 1.2;
        }
        
        // Максимальный размер объекта
        size = Math.min(size, 700);
        
        // Создаем объект
        const object = {
            x,
            y,
            vx: 0,                // Скорость по X
            vy: 0,                // Скорость по Y
            level,
            shapeType,
            size,
            merging: false,       // Флаг процесса слияния объекта
            mergePair: null,      // Ссылка на объект, с которым происходит слияние
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0,
            wasBelow: y > this.topLine  // Флаг, что объект был ниже линии
        };
        
        this.objects.push(object);
        return object;
    }

    // Метод для определения стабильного (естественного) угла фигуры
    getStableAngle(obj) {
        // Для квадрата/прямоугольника стабильные углы кратны 90° (π/2)
        if (obj.shapeType === 'square') {
            // Находим ближайший угол, кратный 90°
            return Math.round(obj.rotation / (Math.PI/2)) * (Math.PI/2);
        }
        
        // Для ромба стабильные углы кратны 45° (π/4)
        if (obj.shapeType === 'diamond') {
            // Находим ближайший угол, кратный 45°
            return Math.round(obj.rotation / (Math.PI/4)) * (Math.PI/4);
        }
        
        // Для круга любой угол стабилен
        if (obj.shapeType === 'circle') {
            return obj.rotation;
        }
        
        // Для овала стабильные углы - 0 и 90° (0 и π/2)
        if (obj.shapeType === 'oval') {
            // Основание овала предпочтительно горизонтальное
            const angleModPi = obj.rotation % Math.PI;
            if (angleModPi < Math.PI/4 || angleModPi > 3*Math.PI/4) {
                // Ближе к 0° или 180°
                return Math.round(obj.rotation / Math.PI) * Math.PI;
            } else {
                // Ближе к 90° или 270°
                return (Math.floor(obj.rotation / Math.PI) * Math.PI) + Math.PI/2;
            }
        }
        
        // Для треугольника стабильный угол - когда основание внизу (0 или π)
        if (obj.shapeType === 'triangle') {
            // Приводим к углу 0 или π (основание внизу)
            return Math.round(obj.rotation / Math.PI) * Math.PI;
        }
        
        return obj.rotation;
    }

    // Метод для определения, находится ли объект на поверхности в состоянии покоя
    isObjectResting(obj) {
        // Объект на нижней границе экрана
        const onBottom = obj.y + obj.size/2 >= this.gameHeight - 1;
        
        // Объект на другом объекте
        let onAnotherObject = false;
        for (const other of this.objects) {
            if (obj !== other && !other.merging && !obj.merging) {
                // Проверяем, находится ли объект сверху на другом объекте
                const dx = obj.x - other.x;
                const dy = obj.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Если объекты касаются и наш объект выше другого
                if (distance < (obj.size/2 + other.size/2 + 1) && obj.y < other.y && Math.abs(dy) < obj.size/3) {
                    onAnotherObject = true;
                    break;
                }
            }
        }
        
        // Объект считается "в покое", если:
        // 1. Он на нижней границе или на другом объекте
        // 2. Его вертикальная скорость близка к нулю
        // 3. Его горизонтальная скорость тоже достаточно мала
        // 4. Скорость вращения невелика (добавляем новое условие)
        return (onBottom || onAnotherObject) && 
               Math.abs(obj.vy) < 0.5 && 
               Math.abs(obj.vx) < 1.0 && 
               Math.abs(obj.rotationSpeed) < 0.02;
    }

    // Обновление физики всех объектов
    update(deltaTime) {
        // Обработка всех объектов
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            
            // Пропускаем объекты в процессе слияния
            if (obj.merging) continue;
            
            // Применяем гравитацию
            obj.vy += GRAVITY;
            
            // Обновляем позицию
            obj.x += obj.vx;
            obj.y += obj.vy;
            
            // Обновляем вращение
            obj.rotation += obj.rotationSpeed;
            
            // Добавляем постепенное затухание вращения для всех объектов
            // Коэффициент затухания зависит от типа фигуры
            let rotationDampingFactor = 0.98; // Базовое затухание
            
            // Усиливаем затухание для квадратов и ромбов
            if (obj.shapeType === 'square' || obj.shapeType === 'diamond') {
                rotationDampingFactor = 0.94; // Сильное затухание
            } else if (obj.shapeType === 'triangle') {
                rotationDampingFactor = 0.96; // Среднее затухание
            }
            
            // Применяем затухание
            obj.rotationSpeed *= rotationDampingFactor;
            
            // Если скорость вращения очень мала, останавливаем вращение полностью
            if (Math.abs(obj.rotationSpeed) < 0.001) {
                obj.rotationSpeed = 0;
            }
            
            // Ограничиваем максимальную скорость вращения
            const maxRotationSpeed = 0.1;
            if (obj.rotationSpeed > maxRotationSpeed) {
                obj.rotationSpeed = maxRotationSpeed;
            } else if (obj.rotationSpeed < -maxRotationSpeed) {
                obj.rotationSpeed = -maxRotationSpeed;
            }
            
            // Проверяем столкновение с границами поля
            this.handleBoundaryCollision(obj);
            
            // Применяем стабилизацию для объектов на поверхности
            // или для объектов с высокой скоростью вращения (даже в движении)
            if (this.isObjectResting(obj) || Math.abs(obj.rotationSpeed) > 0.05) {
                const stableAngle = this.getStableAngle(obj);
                const angleDiff = stableAngle - obj.rotation;
                
                // Нормализуем разницу углов в пределах -π до π
                let normalizedDiff = angleDiff;
                while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                
                // Если есть разница в угле, применяем стабилизирующее вращение
                if (Math.abs(normalizedDiff) > 0.01) {
                    // Скорость вращения зависит от разницы углов и замедляется при приближении к стабильному положению
                    // Используем более сильную стабилизацию для покоящихся объектов
                    const stabilizationFactor = this.isObjectResting(obj) ? 0.05 : 0.02;
                    obj.rotationSpeed = normalizedDiff * stabilizationFactor;
                } else {
                    // Когда достигнут стабильный угол, фиксируем его
                    // Полностью останавливаем вращение только если объект в покое
                    obj.rotation = stableAngle;
                    if (this.isObjectResting(obj)) {
                        obj.rotationSpeed = 0;
                    } else {
                        // Для движущихся объектов просто уменьшаем вращение
                        obj.rotationSpeed *= 0.8;
                    }
                }
            }
            
            // Отмечаем, если объект оказался ниже линии
            if (obj.y > this.topLine + obj.size / 2) {
                obj.wasBelow = true;
            }
            
            // Проверка условия проигрыша (объект пересекает верхнюю линию снизу и остается там)
            // Перенесена в метод checkGameOver
            
            // Проверяем коллизии с другими объектами
            for (let j = i + 1; j < this.objects.length; j++) {
                const other = this.objects[j];
                
                // Пропускаем объекты в процессе слияния
                if (other.merging) continue;
                
                // Проверяем коллизию
                if (this.checkCollision(obj, other)) {
                    // Обрабатываем физическую коллизию
                    this.resolveCollision(obj, other);
                    
                    // Если уровни объектов совпадают, запускаем таймер слияния или выполняем слияние
                    if (obj.level === other.level) {
                        // Создаем уникальный ключ для пары объектов
                        const pairId = `${Math.min(i, j)}_${Math.max(i, j)}`;
                        
                        // Проверяем коллизию с увеличенным радиусом для объектов одинакового уровня
                        const dx = other.x - obj.x;
                        const dy = other.y - obj.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const mergeThreshold = (obj.size / 2 + other.size / 2) * 1.1; // Увеличиваем порог слияния на 10%
                        
                        if (distance < mergeThreshold) {
                            // Если таймер для этой пары еще не существует, создаем его
                            if (!this.mergeTimers.has(pairId)) {
                                this.mergeTimers.set(pairId, {
                                    time: 0,
                                    obj1: obj,
                                    obj2: other
                                });
                            } else {
                                // Увеличиваем время контакта
                                const timer = this.mergeTimers.get(pairId);
                                timer.time += deltaTime;
                                
                                // Если время контакта достаточное, выполняем слияние
                                if (timer.time >= MERGE_TIMER && !this.mergeInProgress) {
                                    this.mergeObjects(obj, other);
                                    this.mergeTimers.delete(pairId);
                                }
                            }
                        } else {
                            // Если объекты не в контакте, удаляем таймер слияния для этой пары
                            // Но только если они далеко друг от друга, чтобы избежать "дребезга"
                            if (this.mergeTimers.has(pairId) && distance > mergeThreshold * 1.5) {
                                this.mergeTimers.delete(pairId);
                            }
                        }
                    }
                } else {
                    // Если объекты не в контакте, удаляем таймер слияния для этой пары
                    const pairId = `${Math.min(i, j)}_${Math.max(i, j)}`;
                    if (this.mergeTimers.has(pairId)) {
                        this.mergeTimers.delete(pairId);
                    }
                }
            }
        }
        
        // Удаляем объекты, помеченные для удаления
        this.objects = this.objects.filter(obj => !obj.toRemove);
    }

    // Обработка столкновения с границами поля
    handleBoundaryCollision(obj) {
        // Коэффициент отскока с учетом формы объекта
        let bounceCoefficient = BOUNCE;
        
        // Модифицируем коэффициент отскока в зависимости от формы
        switch (obj.shapeType) {
            case 'oval':
                // Овалы отскакивают слабее
                bounceCoefficient *= 0.85;
                break;
            case 'square':
            case 'diamond':
                // Квадраты и ромбы - нормальный отскок (без усиления)
                // Убрано увеличение коэффициента (было bounceCoefficient *= 1.1)
                break;
            case 'triangle':
                // Треугольники - средний отскок
                bounceCoefficient *= 0.9;
                break;
        }
        
        // Границы для проверки столкновений (разные для разных форм)
        let leftBound, rightBound, bottomBound;
        
        // Учитываем форму объекта для определения границ
        switch (obj.shapeType) {
            case 'circle':
                leftBound = obj.size / 2;
                rightBound = this.gameWidth - obj.size / 2;
                bottomBound = this.gameHeight - obj.size / 2;
                break;
            case 'square':
                // Для квадрата расчет с учетом вращения
                // Упрощенно, берем как для круга с небольшой корректировкой
                leftBound = obj.size / 2 * 0.95;
                rightBound = this.gameWidth - obj.size / 2 * 0.95;
                bottomBound = this.gameHeight - obj.size / 2 * 0.95;
                break;
            case 'oval':
                // Для овала - полуоси
                leftBound = obj.size / 2; // по X
                rightBound = this.gameWidth - obj.size / 2;
                bottomBound = this.gameHeight - obj.size / 3; // по Y меньше
                break;
            case 'triangle':
                // Для треугольника - примерные границы
                leftBound = obj.size / 2 * 0.9;
                rightBound = this.gameWidth - obj.size / 2 * 0.9;
                bottomBound = this.gameHeight - obj.size / 2 * 0.8;
                break;
            case 'diamond':
                // Для ромба - примерные границы
                leftBound = obj.size / 2 * 0.9;
                rightBound = this.gameWidth - obj.size / 2 * 0.9;
                bottomBound = this.gameHeight - obj.size / 2 * 0.9;
                break;
            default:
                // По умолчанию как для круга
                leftBound = obj.size / 2;
                rightBound = this.gameWidth - obj.size / 2;
                bottomBound = this.gameHeight - obj.size / 2;
        }
        
        // Столкновение с левой и правой границей
        if (obj.x < leftBound) {
            obj.x = leftBound;
            obj.vx = -obj.vx * bounceCoefficient;
            // Добавляем случайное вращение, кроме круга
            if (obj.shapeType !== 'circle') {
                // Уменьшено с 0.05 до 0.015
                obj.rotationSpeed += (Math.random() - 0.5) * 0.015;
            }
        } else if (obj.x > rightBound) {
            obj.x = rightBound;
            obj.vx = -obj.vx * bounceCoefficient;
            // Добавляем случайное вращение, кроме круга
            if (obj.shapeType !== 'circle') {
                // Уменьшено с 0.05 до 0.015
                obj.rotationSpeed += (Math.random() - 0.5) * 0.015;
            }
        }
        
        // Столкновение с нижней границей
        if (obj.y > bottomBound) {
            obj.y = bottomBound;
            obj.vy = -obj.vy * bounceCoefficient;
            // Применяем трение при отскоке от пола
            obj.vx *= FRICTION;
            // Добавляем случайное вращение, кроме круга (еще меньше для нижней границы)
            if (obj.shapeType !== 'circle') {
                // Уменьшено с 0.03 до 0.01
                obj.rotationSpeed += (Math.random() - 0.5) * 0.01;
            }
        }
        
        // Объекты могут пролетать через верхнюю границу, но не через линию проигрыша
        // Это проверяется в методе update
    }

    // Проверка столкновения между двумя объектами (используем упрощенный круговой коллайдер)
    checkCollision(obj1, obj2) {
        // Для разных типов фигур используем специфичные проверки коллизий
        switch (obj1.shapeType) {
            case 'circle':
                return this.checkCircleCollision(obj1, obj2);
            case 'square':
                return this.checkSquareCollision(obj1, obj2);
            case 'triangle':
                return this.checkTriangleCollision(obj1, obj2);
            case 'oval':
                return this.checkOvalCollision(obj1, obj2);
            case 'diamond':
                return this.checkDiamondCollision(obj1, obj2);
            default:
                // Если тип неизвестен, используем круговую коллизию
                return this.checkCircleCollision(obj1, obj2);
        }
    }

    // Проверка коллизии с кругом
    checkCircleCollision(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Эффективный радиус для объекта obj2 в зависимости от его типа
        let effectiveRadius2;
        
        switch (obj2.shapeType) {
            case 'circle':
                effectiveRadius2 = obj2.size / 2;
                break;
            case 'square':
                // Для квадрата используем радиус описанной окружности
                effectiveRadius2 = obj2.size / 2 * Math.sqrt(2) * 0.8;
                break;
            case 'triangle':
                // Для треугольника используем примерный радиус
                effectiveRadius2 = obj2.size / 2 * 0.9;
                break;
            case 'oval':
                // Для овала используем среднее между осями
                effectiveRadius2 = obj2.size / 2 * 0.85;
                break;
            case 'diamond':
                // Для ромба радиус описанной окружности
                effectiveRadius2 = obj2.size / 2 * 0.9;
                break;
            default:
                effectiveRadius2 = obj2.size / 2;
        }
        
        // Коллизия происходит, когда расстояние меньше суммы радиусов
        return distance < (obj1.size / 2 + effectiveRadius2);
    }

    // Проверка коллизии с квадратом
    checkSquareCollision(obj1, obj2) {
        // Для квадрата проверяем коллизию с другими объектами
        switch (obj2.shapeType) {
            case 'circle':
                return this.checkCircleCollision(obj2, obj1);
            case 'square':
                // Упрощенная проверка AABB коллизии для двух квадратов
                const halfSize1 = obj1.size / 2;
                const halfSize2 = obj2.size / 2;
                
                return Math.abs(obj1.x - obj2.x) < (halfSize1 + halfSize2) * 0.9 &&
                       Math.abs(obj1.y - obj2.y) < (halfSize1 + halfSize2) * 0.9;
            default:
                // Для других форм используем приближенную коллизию
                return this.checkCircleCollision(obj2, obj1);
        }
    }

    // Проверка коллизии с треугольником
    checkTriangleCollision(obj1, obj2) {
        // Упрощенная реализация, используем круговую коллизию с коррекцией
        switch (obj2.shapeType) {
            case 'circle':
                return this.checkCircleCollision(obj2, obj1);
            case 'triangle':
                // Для двух треугольников используем модифицированную круговую коллизию
                const dx = obj2.x - obj1.x;
                const dy = obj2.y - obj1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                return distance < (obj1.size / 2 + obj2.size / 2) * 0.85;
            default:
                // Для других форм используем приближенную коллизию
                return this.checkCircleCollision(obj2, obj1);
        }
    }

    // Проверка коллизии с овалом
    checkOvalCollision(obj1, obj2) {
        // Для овала используем эллиптическую коллизию
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        
        // Для овала главная ось по x, второстепенная по y
        const a = obj1.size / 2;      // полуось по x
        const b = obj1.size / 3;      // полуось по y
        
        // Нормализуем расстояние для эллипса
        const normalizedDistance = Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
        
        switch (obj2.shapeType) {
            case 'circle':
                // Для круга с овалом
                return normalizedDistance < 1 + (obj2.size / 2) / Math.min(a, b);
            case 'oval':
                // Для двух овалов - приближенная коллизия
                const a2 = obj2.size / 2;
                const b2 = obj2.size / 3;
                return normalizedDistance < 1 + Math.min(a2, b2) / Math.min(a, b);
            default:
                // Для других форм используем приближенную коллизию
                return this.checkCircleCollision(obj2, obj1);
        }
    }

    // Проверка коллизии с ромбом
    checkDiamondCollision(obj1, obj2) {
        // Используем упрощенную коллизию, аналогичную квадрату но с меньшим охватом
        switch (obj2.shapeType) {
            case 'circle':
                return this.checkCircleCollision(obj2, obj1);
            case 'diamond':
                // Для двух ромбов
                const dx = obj2.x - obj1.x;
                const dy = obj2.y - obj1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                return distance < (obj1.size / 2 + obj2.size / 2) * 0.85;
            default:
                // Для других форм используем приближенную коллизию
                return this.checkCircleCollision(obj2, obj1);
        }
    }

    // Разрешение физического столкновения между объектами
    resolveCollision(obj1, obj2) {
        // Вектор между центрами объектов
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Если объекты очень далеко друг от друга, игнорируем
        if (distance > obj1.size + obj2.size) return;
        
        // Коэффициент отскока, который зависит от типов объектов
        let bounceCoefficient = BOUNCE;
        
        // Модифицируем коэффициент отскока в зависимости от форм объектов
        if ((obj1.shapeType === 'square' && obj2.shapeType === 'square') ||
            (obj1.shapeType === 'diamond' && obj2.shapeType === 'diamond')) {
            // Квадраты и ромбы отскакивают с нормальным коэффициентом
            // Убрано усиление отскока (было bounceCoefficient *= 1.1)
        } else if (obj1.shapeType === 'oval' || obj2.shapeType === 'oval') {
            // Овалы имеют меньший отскок
            bounceCoefficient *= 0.85;
        } else if (obj1.shapeType === 'triangle' || obj2.shapeType === 'triangle') {
            // Треугольники имеют немного меньший отскок из-за острых углов
            bounceCoefficient *= 0.9;
        }
        
        // Нормализованный вектор направления
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Расчет перекрытия объектов с учетом их форм
        let overlap;
        
        // Используем форму для определения перекрытия
        if (obj1.shapeType === 'circle' && obj2.shapeType === 'circle') {
            // Для двух кругов - стандартное перекрытие
            overlap = (obj1.size / 2 + obj2.size / 2) - distance;
        } else if (obj1.shapeType === 'oval' || obj2.shapeType === 'oval') {
            // Для овалов учитываем эллиптическую форму
            overlap = ((obj1.size / 2 + obj2.size / 2) - distance) * 0.85;
        } else {
            // Для других сочетаний форм - с корректировкой
            overlap = ((obj1.size / 2 + obj2.size / 2) - distance) * 0.9;
        }
        
        // Если перекрытие отрицательное, объекты не пересекаются
        if (overlap <= 0) return;
        
        // Корректируем позиции, чтобы устранить перекрытие
        obj1.x -= nx * overlap / 2;
        obj1.y -= ny * overlap / 2;
        obj2.x += nx * overlap / 2;
        obj2.y += ny * overlap / 2;
        
        // Относительная скорость в направлении нормали
        const dvx = obj2.vx - obj1.vx;
        const dvy = obj2.vy - obj1.vy;
        const dotProduct = nx * dvx + ny * dvy;
        
        // Если объекты удаляются друг от друга, не обрабатываем столкновение
        if (dotProduct >= 0) return;
        
        // Импульс от столкновения
        const impulse = (-(1 + bounceCoefficient) * dotProduct) / 2;
        
        // Применяем импульс к обоим объектам
        obj1.vx -= impulse * nx;
        obj1.vy -= impulse * ny;
        obj2.vx += impulse * nx;
        obj2.vy += impulse * ny;
        
        // Добавляем случайное вращение, зависящее от формы объекта
        // Уменьшаем величину случайного вращения для уменьшения регдоления
        if (obj1.shapeType !== 'circle') {
            // Уменьшено с 0.05 до 0.015
            obj1.rotationSpeed += (Math.random() - 0.5) * 0.015;
        }
        if (obj2.shapeType !== 'circle') {
            // Уменьшено с 0.05 до 0.015
            obj2.rotationSpeed += (Math.random() - 0.5) * 0.015;
        }
    }

    // Объединение двух объектов
    mergeObjects(obj1, obj2) {
        if (this.mergeInProgress || obj1.merging || obj2.merging) return;
        
        this.mergeInProgress = true;
        obj1.merging = true;
        obj2.merging = true;
        obj1.mergePair = obj2;
        obj2.mergePair = obj1;
        
        // Позиция нового объекта - середина между двумя старыми
        const newX = (obj1.x + obj2.x) / 2;
        const newY = (obj1.y + obj2.y) / 2;
        
        // Новый уровень - на 1 больше
        const newLevel = obj1.level + 1;
        
        setTimeout(() => {
            // Создаем новый объект
            this.createObject(newX, newY, newLevel);
            
            // Помечаем старые объекты к удалению
            obj1.toRemove = true;
            obj2.toRemove = true;
            
            // Сбрасываем флаг слияния
            this.mergeInProgress = false;
            
            // Начисляем очки за слияние
            const points = newLevel * 10;
            if (this.game && typeof this.game.updateScore === 'function') {
                this.game.updateScore(points);
                console.log(`Начислено ${points} очков за слияние объектов уровня ${newLevel-1} в объект уровня ${newLevel}`);
            } else {
                console.error('Не удалось обновить счет: метод updateScore недоступен');
            }
        }, 300);
        
        // Возвращаем 0, так как очки будут начислены позже
        return 0;
    }

    // Проверка условия проигрыша - есть ли объекты, пересекающие верхнюю линию
    checkGameOver() {
        // Игра считается проигранной, если объекты пересекают верхнюю линию снизу и остаются там
        for (const obj of this.objects) {
            // Если объект:
            // 1. Раньше был ниже линии
            // 2. Сейчас находится выше линии (пересекает её)
            // 3. Не движется вверх (т.е. он не просто временно подпрыгнул)
            if (obj.wasBelow && 
                obj.y - obj.size / 2 < this.topLine && 
                obj.vy >= 0) {
                
                console.log('Проигрыш: объект пересёк линию снизу', obj);
                return true;
            }
        }
        return false;
    }

    // Удаление всех объектов определенного уровня (для бонуса "Дезинтеграция")
    removeObjectsByLevel(level) {
        let removedCount = 0;
        
        for (const obj of this.objects) {
            if (obj.level === level && !obj.merging) {
                obj.toRemove = true;
                removedCount++;
            }
        }
        
        return removedCount;
    }

    // Удаление объектов в радиусе от точки (для бонуса "Бомба")
    removeObjectsInRadius(x, y, radius) {
        let removedCount = 0;
        
        for (const obj of this.objects) {
            // Расстояние от центра бомбы до объекта
            const dx = obj.x - x;
            const dy = obj.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Если объект в радиусе взрыва и не сливается
            if (distance <= radius && !obj.merging) {
                obj.toRemove = true;
                removedCount++;
            }
        }
        
        return removedCount;
    }
}