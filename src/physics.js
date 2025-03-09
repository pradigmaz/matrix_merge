/**
 * physics.js
 * Отвечает за физику игры: гравитацию, коллизии, 
 * слияние объектов и прочие физические аспекты
 */

// Константы физики
// Изменение констант физики для улучшения механики слияния
const GRAVITY = 0.5;        // Сила гравитации (оставляем без изменений)
const BOUNCE = 0.4;         // Коэффициент отскока - УМЕНЬШЕН с 0.7 до 0.4
const FRICTION = 0.98;      // Трение при движении (оставляем без изменений)
const MERGE_TIMER = 2;     // Время в мс для слияния - УМЕНЬШЕНО с 500 до 50

// Типы фигур
const SHAPES = ['circle', 'square', 'triangle', 'oval', 'diamond'];

// Класс для обработки физики объектов
class Physics {
    constructor(gameWidth, gameHeight, topLine) {
        this.gameWidth = gameWidth;       // Ширина игрового поля
        this.gameHeight = gameHeight;     // Высота игрового поля
        this.topLine = topLine;           // Верхняя граница (линия проигрыша)
        this.objects = [];                // Массив всех объектов в игре
        this.mergeInProgress = false;     // Флаг процесса слияния (для предотвращения множественных слияний)
        this.mergeTimers = new Map();     // Таймеры для отслеживания длительных контактов между объектами
    }

    // Создание нового объекта с заданным уровнем
    createObject(x, y, level = 1) {
        // Выбираем случайную форму из доступных
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
            rotationSpeed: 0,  // Вращение полностью отключено
            wasBelow: y > this.topLine  // Флаг, что объект был ниже линии
        };
        
        this.objects.push(object);
        return object;
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
            
            // Проверяем столкновение с границами поля
            this.handleBoundaryCollision(obj);
            
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
        // Столкновение с левой и правой границей
        if (obj.x - obj.size / 2 < 0) {
            obj.x = obj.size / 2;
            obj.vx = -obj.vx * BOUNCE;
        } else if (obj.x + obj.size / 2 > this.gameWidth) {
            obj.x = this.gameWidth - obj.size / 2;
            obj.vx = -obj.vx * BOUNCE;
        }
        
        // Столкновение с нижней границей
        if (obj.y + obj.size / 2 > this.gameHeight) {
            obj.y = this.gameHeight - obj.size / 2;
            obj.vy = -obj.vy * BOUNCE;
            // Применяем трение при отскоке от пола
            obj.vx *= FRICTION;
        }
        
        // Объекты могут пролетать через верхнюю границу, но не через линию проигрыша
        // Это проверяется в методе update
    }

    // Проверка столкновения между двумя объектами (используем упрощенный круговой коллайдер)
    checkCollision(obj1, obj2) {
        // Для упрощения используем круговую коллизию независимо от формы
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Коллизия происходит, когда расстояние меньше суммы радиусов
        return distance < (obj1.size / 2 + obj2.size / 2);
    }

    // Разрешение физического столкновения между объектами
    resolveCollision(obj1, obj2) {
        // Вектор между центрами объектов
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Нормализованный вектор направления
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Расчет перекрытия объектов
        const overlap = (obj1.size / 2 + obj2.size / 2) - distance;
        
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
        const impulse = (-(1 + BOUNCE) * dotProduct) / 2;
        
        // Применяем импульс к обоим объектам
        obj1.vx -= impulse * nx;
        obj1.vy -= impulse * ny;
        obj2.vx += impulse * nx;
        obj2.vy += impulse * ny;
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
        
        // Через 300 мс (время анимации) создаем новый объект и удаляем старые
        setTimeout(() => {
            // Создаем новый объект
            this.createObject(newX, newY, newLevel);
            
            // Помечаем старые объекты к удалению
            obj1.toRemove = true;
            obj2.toRemove = true;
            
            // Сбрасываем флаг слияния
            this.mergeInProgress = false;
            
            // Возвращаем очки за слияние (уровень * 10)
            return newLevel * 10;
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