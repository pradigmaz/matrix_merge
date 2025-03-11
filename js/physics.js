/**
 * physics.js - Физический движок для игры
 * Управляет физикой и столкновениями объектов
 */

const Physics = (function() {
    // Константы физики
    const GRAVITY = 1.25;
    const BOUNCE_FACTOR = 0.7;
    const FRICTION = 0.95; // Уменьшено для более быстрого затухания движения
    const SLEEP_VELOCITY_THRESHOLD = 0.2; // Снижено для более быстрого перехода в сон
    const SLEEP_ANGULAR_THRESHOLD = 0.05; // Снижено, но вращение будет полностью исключено
    
    // Простая сетка для пространственного разделения
    const grid = {
        cellSize: 100,
        cells: {},
        
        clear: function() {
            this.cells = {};
        },
        
        getKey: function(x, y) {
            const cellX = Math.floor(x / this.cellSize);
            const cellY = Math.floor(y / this.cellSize);
            return `${cellX},${cellY}`;
        },
        
        addObject: function(obj) {
            const key = this.getKey(obj.x, obj.y);
            if (!this.cells[key]) {
                this.cells[key] = [];
            }
            this.cells[key].push(obj);
        },
        
        getNearbyObjects: function(obj) {
            const centerKey = this.getKey(obj.x, obj.y);
            const cellX = Math.floor(obj.x / this.cellSize);
            const cellY = Math.floor(obj.y / this.cellSize);
            
            const nearby = [];
            
            // Проверяем ячейку объекта и 8 соседних
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    const key = `${cellX + x},${cellY + y}`;
                    if (this.cells[key]) {
                        // Исключаем сам объект из результатов
                        nearby.push(...this.cells[key].filter(o => o !== obj));
                    }
                }
            }
            
            return nearby;
        }
    };
    
    // Проверка столкновения двух кругов
    function circlesCollide(circleA, circleB) {
        const dx = circleB.x - circleA.x;
        const dy = circleB.y - circleA.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = circleA.radius + circleB.radius;
        
        return distanceSquared < radiusSum * radiusSum;
    }
    
    // Обработка столкновения двух кругов
    function resolveCollision(circleA, circleB) {
        // Вычисляем вектор между центрами
        const dx = circleB.x - circleA.x;
        const dy = circleB.y - circleA.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = circleA.radius + circleB.radius;
        
        // Если окружности перекрываются
        if (distanceSquared < radiusSum * radiusSum) {
            const distance = Math.sqrt(distanceSquared);
            
            // Нормализованный вектор направления столкновения
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Глубина перекрытия
            const overlap = (circleA.radius + circleB.radius) - distance;
            
            // Отталкиваем окружности друг от друга
            const moveX = nx * overlap * 0.5;
            const moveY = ny * overlap * 0.5;
            
            // Если объекты не спят, обновляем их позиции
            if (!circleA.sleeping) {
                circleA.x -= moveX;
                circleA.y -= moveY;
            }
            
            if (!circleB.sleeping) {
                circleB.x += moveX;
                circleB.y += moveY;
            }
            
            // Вычисляем относительную скорость
            const rvx = circleB.vx - circleA.vx;
            const rvy = circleB.vy - circleA.vy;
            
            // Проекция относительной скорости на нормаль столкновения
            const velAlongNormal = rvx * nx + rvy * ny;
            
            // Если окружности движутся друг от друга, не применяем импульс
            if (velAlongNormal > 0) return;
            
            // Коэффициент эластичности (объединение BOUNCE_FACTOR и эластичности объектов)
            const elasticity = BOUNCE_FACTOR;
            
            // Вычисляем импульс
            const impulse = (-(1 + elasticity) * velAlongNormal) / 
                            (1/circleA.mass + 1/circleB.mass);
            
            // Применяем импульс к скоростям объектов
            if (!circleA.sleeping) {
                circleA.vx -= impulse * nx / circleA.mass;
                circleA.vy -= impulse * ny / circleA.mass;
                // Пробуждаем объект, если он спал
                circleA.sleeping = false;
            }
            
            if (!circleB.sleeping) {
                circleB.vx += impulse * nx / circleB.mass;
                circleB.vy += impulse * ny / circleB.mass;
                // Пробуждаем объект, если он спал
                circleB.sleeping = false;
            }
            
            // Удаляем случайное вращение при столкновении
            // Если объекты имеют одинаковое значение, пробуждаем спящий объект
            if (circleA.value === circleB.value) {
                if (circleA.sleeping) circleA.sleeping = false;
                if (circleB.sleeping) circleB.sleeping = false;
            }
            
            return true; // Столкновение произошло
        }
        
        return false; // Столкновения не было
    }
    
    // Обновление физики для одного объекта
    function updateObject(obj, width, height, deltaTime) {
        // Если объект спит, не обновляем его
        if (obj.sleeping) return;
        
        // Масштабный коэффициент для временного шага
        const timeScale = deltaTime / 16.67; // 60 FPS = 16.67 мс
        
        // Применяем гравитацию
        obj.vy += GRAVITY * timeScale;
        
        // Улучшенное определение "сна"
        if (Math.abs(obj.vx) < SLEEP_VELOCITY_THRESHOLD && 
            Math.abs(obj.vy) < SLEEP_VELOCITY_THRESHOLD &&
            obj.y > height - obj.radius - 5) {
            
            // Добавляем счетчик стабильности
            obj.sleepCounter = (obj.sleepCounter || 0) + 1;
            
            // Требуем стабильности в течение нескольких кадров
            if (obj.sleepCounter > 3) {
                obj.sleeping = true;
                obj.vx = 0;
                obj.vy = 0;
                obj.angularVelocity = 0;
                return;
            }
        } else {
            obj.sleepCounter = 0;
        }
        // Обновляем позицию
        obj.x += obj.vx * timeScale;
        obj.y += obj.vy * timeScale;
        
        // Обновляем вращение
        obj.rotation += obj.angularVelocity * timeScale;
        
        // Применяем трение (усиленное для медленных объектов)
        const speedFactor = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
        if (speedFactor < SLEEP_VELOCITY_THRESHOLD * 2) {
            // Для медленных объектов применяем усиленное трение
            obj.vx *= FRICTION * 0.95;
            obj.vy *= FRICTION * 0.95;
        } else {
            obj.vx *= FRICTION;
            obj.vy *= FRICTION;
        }
        obj.angularVelocity *= FRICTION * 0.9; // Сильнее гасим вращение
        
        // Проверка столкновения со стенами
        // Левая стена
        if (obj.x - obj.radius < 0) {
            obj.x = obj.radius;
            obj.vx = -obj.vx * BOUNCE_FACTOR;
            obj.angularVelocity += obj.vx * 0.05; // Добавляем вращение от столкновения
        }
        
        // Правая стена
        if (obj.x + obj.radius > width) {
            obj.x = width - obj.radius;
            obj.vx = -obj.vx * BOUNCE_FACTOR;
            obj.angularVelocity += obj.vx * 0.05;
        }
        
        // Нижняя стена (пол)
        if (obj.y + obj.radius > height) {
            obj.y = height - obj.radius;
            obj.vy = -obj.vy * BOUNCE_FACTOR;
            
            // Если скорость очень маленькая, останавливаем объект
            if (Math.abs(obj.vy) < 0.5) {
                obj.vy = 0;
            }
            
            // Добавляем трение по X при соприкосновении с полом
            obj.vx *= 0.95;
        }
        
        // Проверка для пробуждения спящих объектов
        // Если объект двигается достаточно быстро, пробуждаем его
        if (obj.sleeping && (Math.abs(obj.vx) > SLEEP_VELOCITY_THRESHOLD * 1.5 || 
                            Math.abs(obj.vy) > SLEEP_VELOCITY_THRESHOLD * 1.5)) {
            obj.sleeping = false;
        }
    }
    
    // Пробуждение всех объектов в определенной области (для бонусов)
    function wakeObjectsInArea(objects, x, y, radius) {
        objects.forEach(obj => {
            const dx = obj.x - x;
            const dy = obj.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius + obj.radius) {
                obj.sleeping = false;
                
                // Добавляем небольшой импульс от центра
                const force = 3;
                const distanceFactor = 1 - Math.min(1, distance / radius);
                const angle = Math.atan2(dy, dx);
                
                obj.vx += Math.cos(angle) * force * distanceFactor;
                obj.vy += Math.sin(angle) * force * distanceFactor;
                
                // Сбрасываем угловой момент, так как мы убрали случайное вращение
                obj.angularVelocity = 0;
            }
        });
    }
    

// Публичный API
    return {
        circlesCollide: circlesCollide,
        resolveCollision: resolveCollision,
        updateObject: updateObject,
        wakeObjectsInArea: wakeObjectsInArea,
        grid: grid,  // Добавить эту строку!
        constants: {
            GRAVITY: GRAVITY,
            BOUNCE_FACTOR: BOUNCE_FACTOR,
            FRICTION: FRICTION
        }
    };
})();