/**
 * physics.js
 * Отвечает за физику игры: гравитацию, коллизии, 
 * слияние объектов и прочие физические аспекты
 */

// Константы физики
// Более сбалансированные значения для устранения регдоления и проблем со слиянием
const GRAVITY = 0.5;        // Сила гравитации (без изменений)
const BOUNCE = 0.1;         // Уменьшено до 0.1
const FRICTION = 0.98;      // Трение при движении (без изменений)
const VELOCITY_DAMPING = 0.75; // Уменьшено до 0.75
const MERGE_TIMER = 150;    // Увеличено до 150
const MIN_COLLISION_THRESHOLD = 0.5; // Увеличено до 0.5

// Типы фигур
const SHAPES = ['circle'];

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
        this.collisionCooldowns = new Map(); // Добавлено для кулдауна столкновений
    }

    // Создание нового объекта с заданным уровнем
    createObject(x, y, level = 1) {
        // Используем только круг
        const shapeType = 'circle';
        
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
        // 2. Его вертикальная скорость очень мала
        // 3. Его горизонтальная скорость тоже очень мала
        // 4. Скорость вращения минимальна
        return (onBottom || onAnotherObject) && 
               Math.abs(obj.vy) < 0.1 &&   // Уменьшено до 0.1
               Math.abs(obj.vx) < 0.2 &&   // Уменьшено до 0.2
               Math.abs(obj.rotationSpeed) < 0.005; // Уменьшено до 0.005
    }

    // Обновление физики всех объектов
    update(deltaTime) {
        // Ограничение deltaTime для стабильности физики
        const cappedDeltaTime = Math.min(deltaTime, 33);
        
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
            
            // Добавляем постепенное затухание вращения
            obj.rotationSpeed *= 0.98; // Затухание вращения
            
            // Если скорость вращения очень мала, останавливаем вращение полностью
            if (Math.abs(obj.rotationSpeed) < 0.005) {
                obj.rotationSpeed = 0;
            }
            
            // Проверяем столкновение с границами поля
            this.handleBoundaryCollision(obj);
            
            // Если объект в состоянии покоя, полностью останавливаем его
            if (this.isObjectResting(obj)) {
                obj.vx = 0;
                obj.vy = 0;
                obj.rotationSpeed = 0;
                obj.rotation = this.getStableAngle(obj);
            } else {
                // Дополнительное демпфирование скорости для уменьшения колебаний
                if (Math.abs(obj.vx) < 0.5) obj.vx *= 0.9;
                if (Math.abs(obj.vy) < 0.5) obj.vy *= 0.9;
            }
            
            // Отмечаем, если объект оказался ниже линии
            if (obj.y > this.topLine + obj.size / 2) {
                obj.wasBelow = true;
            }
            
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
                        // Увеличиваем порог слияния на 20% для более надежного объединения
                        const mergeThreshold = (obj.size / 2 + other.size / 2) * 1.2;
                        
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
                                timer.time += cappedDeltaTime;
                                
                                // Если время контакта достаточное, выполняем слияние
                                if (timer.time >= MERGE_TIMER && !this.mergeInProgress) {
                                    this.mergeObjects(obj, other);
                                    this.mergeTimers.delete(pairId);
                                }
                            }
                        } else {
                            // Если объекты не в контакте, удаляем таймер слияния для этой пары
                            // Но только если они далеко друг от друга, чтобы избежать "дребезга"
                            // Уменьшаем множитель, чтобы таймер не сбрасывался так быстро
                            if (this.mergeTimers.has(pairId) && distance > mergeThreshold * 1.3) {
                                this.mergeTimers.delete(pairId);
                            }
                        }
                    }
                } else {
                    // Если объекты не в контакте, удаляем таймер слияния для этой пары
                    const pairId = `${Math.min(i, j)}_${Math.max(i, j)}`;
                    if (this.mergeTimers.has(pairId)) {
                        // Сбрасываем таймер не сразу, а пропорционально накопленному времени
                        // Это даст шанс объектам немного отдалиться и снова сойтись
                        const timer = this.mergeTimers.get(pairId);
                        timer.time -= cappedDeltaTime * 2; // Уменьшаем вдвое быстрее
                        
                        // Если таймер исчерпан полностью, удаляем его
                        if (timer.time <= 0) {
                            this.mergeTimers.delete(pairId);
                        }
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
                // Квадраты и ромбы - нормальный отскок
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
            // Добавляем случайное вращение, кроме круга (уменьшенное)
            if (obj.shapeType !== 'circle') {
                // Уменьшено с 0.015 до 0.005
                obj.rotationSpeed += (Math.random() - 0.5) * 0.005;
            }
        } else if (obj.x > rightBound) {
            obj.x = rightBound;
            obj.vx = -obj.vx * bounceCoefficient;
            // Добавляем случайное вращение, кроме круга (уменьшенное)
            if (obj.shapeType !== 'circle') {
                // Уменьшено с 0.015 до 0.005
                obj.rotationSpeed += (Math.random() - 0.5) * 0.005;
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
                // Уменьшено с 0.01 до 0.003
                obj.rotationSpeed += (Math.random() - 0.5) * 0.003;
            }
        }
        
        // Объекты могут пролетать через верхнюю границу, но не через линию проигрыша
        // Это проверяется в методе update
    }

    // Проверка столкновения между двумя объектами (используем упрощенный круговой коллайдер)
    checkCollision(obj1, obj2) {
        // Теперь у нас только круги, поэтому сразу вызываем проверку для кругов
        return this.checkCircleCollision(obj1, obj2);
    }

    // Проверка коллизии между двумя кругами
    checkCircleCollision(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Радиусы обоих кругов
        const radius1 = obj1.size / 2;
        const radius2 = obj2.size / 2;
        
        // Коллизия происходит, когда расстояние меньше суммы радиусов
        return distance < (radius1 + radius2);
    }

    // Оставляем заглушки для других методов проверки коллизий для обратной совместимости
    checkSquareCollision(obj1, obj2) {
        return this.checkCircleCollision(obj1, obj2);
    }

    checkTriangleCollision(obj1, obj2) {
        return this.checkCircleCollision(obj1, obj2);
    }

    checkOvalCollision(obj1, obj2) {
        return this.checkCircleCollision(obj1, obj2);
    }

    checkDiamondCollision(obj1, obj2) {
        return this.checkCircleCollision(obj1, obj2);
    }

    // Разрешение физического столкновения между объектами
    resolveCollision(obj1, obj2) {
        // Проверка кулдауна столкновений
        const pairId = `${Math.min(this.objects.indexOf(obj1), this.objects.indexOf(obj2))}_${Math.max(this.objects.indexOf(obj1), this.objects.indexOf(obj2))}`;
        const lastCollision = this.collisionCooldowns.get(pairId) || 0;
        if (Date.now() - lastCollision < 100) return;
        
        // Вектор между центрами объектов
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Если объекты очень далеко друг от друга, игнорируем
        if (distance > obj1.size + obj2.size) return;
        
        // Коэффициент отскока, который зависит от типов объектов
        let bounceCoefficient = BOUNCE;
        
        // Модифицируем коэффициент отскока в зависимости от форм объектов
        if (obj1.shapeType === 'oval' || obj2.shapeType === 'oval') {
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
        obj1.x -= nx * overlap * 0.6;
        obj1.y -= ny * overlap * 0.6;
        obj2.x += nx * overlap * 0.6;
        obj2.y += ny * overlap * 0.6;
        
        // Относительная скорость в направлении нормали
        const dvx = obj2.vx - obj1.vx;
        const dvy = obj2.vy - obj1.vy;
        const dotProduct = nx * dvx + ny * dvy;
        
        // Если объекты удаляются друг от друга, не обрабатываем столкновение
        if (dotProduct >= 0) return;
        
        // Игнорируем только очень незначительные микроколлизии
        if (Math.abs(dotProduct) < MIN_COLLISION_THRESHOLD) return;
        
        // Импульс от столкновения
        const impulse = (-(1 + bounceCoefficient) * dotProduct) / 2;
        
        // Применяем импульс к обоим объектам
        obj1.vx -= impulse * nx;
        obj1.vy -= impulse * ny;
        obj2.vx += impulse * nx;
        obj2.vy += impulse * ny;
        
        // Более умеренное демпфирование скорости после столкновения
        obj1.vx *= VELOCITY_DAMPING;
        obj1.vy *= VELOCITY_DAMPING;
        obj2.vx *= VELOCITY_DAMPING;
        obj2.vy *= VELOCITY_DAMPING;
        
        // Добавляем случайное вращение, зависящее от формы объекта
        // С очень малой амплитудой для минимизации регдоления
        if (obj1.shapeType !== 'circle') {
            obj1.rotationSpeed += (Math.random() - 0.5) * 0.007;
        }
        if (obj2.shapeType !== 'circle') {
            obj2.rotationSpeed += (Math.random() - 0.5) * 0.007;
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