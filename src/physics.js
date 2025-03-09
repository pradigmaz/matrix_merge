/**
 * physics.js - Физика игры Matrix Drop
 * Отвечает за физику падения, обнаружение столкновений и слияния объектов
 */

// Объект с методами для физики
const Physics = (() => {
    // Константы физики
    const GRAVITY = 0.2;            // Гравитационное ускорение
    const BOUNCE_FACTOR = 0.7;      // Коэффициент отскока (0 - нет отскока, 1 - идеальный отскок)
    const DAMPING = 0.98;           // Затухание скорости (сопротивление среды)
    const MIN_VELOCITY = 0.1;       // Минимальная скорость для движения
    const MIN_ROTATION_SPEED = 0.001; // Минимальная скорость вращения
    const MERGE_DELAY = 500;        // Задержка слияния (мс) при длительном контакте
    const COLLISION_THRESHOLD = 0.75; // Порог пересечения для слияния (75% пересечения)
    
    // Уникальный идентификатор для объектов
    let nextId = 1;
    
    // Слияния, которые ожидают подтверждения с задержкой
    const pendingMerges = [];
    
    // Флаг для отслеживания произошедших слияний
    let mergeOccurred = false;
    
    /**
     * Создание нового объекта с физическими свойствами
     */
    function createObject(x, y, level = 1) {
        // Базовый радиус для уровня 1
        const baseRadius = 65;
        
        // Формула увеличения: +20% на каждый уровень
        let radius = baseRadius * Math.pow(1.2, level - 1);
        
        // Ограничение максимального размера объекта
        radius = Math.min(radius, 100); // Максимальный радиус 100 (диаметр 200)
        
        return {
            id: nextId++,
            x,
            y,
            level,
            radius,
            velocityX: 0,
            velocityY: 0,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            lastCollisionTime: 0
        };
    }
    
    /**
     * Обновление всех объектов с учетом физики
     */
    function updateObjects(objects, deltaTime) {
        // Проверка и удаление устаревших ожидающих слияний
        const currentTime = performance.now();
        for (let i = pendingMerges.length - 1; i >= 0; i--) {
            if (currentTime - pendingMerges[i].startTime >= MERGE_DELAY) {
                const { obj1Id, obj2Id } = pendingMerges[i];
                
                // Находим объекты по ID
                const obj1Index = objects.findIndex(obj => obj.id === obj1Id);
                const obj2Index = objects.findIndex(obj => obj.id === obj2Id);
                
                // Если оба объекта все еще существуют, выполняем слияние
                if (obj1Index !== -1 && obj2Index !== -1) {
                    // Проверяем, что объекты все еще пересекаются
                    if (checkCollision(objects[obj1Index], objects[obj2Index])) {
                        mergeTwoObjects(objects, obj1Index, obj2Index);
                    }
                }
                
                // Удаляем ожидающее слияние из списка
                pendingMerges.splice(i, 1);
            }
        }
        
        // Обновляем каждый объект
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            
            // Применение гравитации
            obj.velocityY += GRAVITY;
            
            // Обновление позиции
            obj.x += obj.velocityX;
            obj.y += obj.velocityY;
            
            // Обновление вращения
            obj.rotation += obj.rotationSpeed;
            
            // Затухание вращения
            obj.rotationSpeed *= DAMPING;
            if (Math.abs(obj.rotationSpeed) < MIN_ROTATION_SPEED) {
                obj.rotationSpeed = 0;
            }
            
            // Проверка столкновений со стенками
            handleWallCollisions(obj);
            
            // Затухание скорости (сопротивление среды)
            obj.velocityX *= DAMPING;
            obj.velocityY *= DAMPING;
            
            // Остановка при малой скорости для оптимизации
            if (Math.abs(obj.velocityX) < MIN_VELOCITY) obj.velocityX = 0;
            if (Math.abs(obj.velocityY) < MIN_VELOCITY) obj.velocityY = 0;
        }
        
        // Проверка столкновений между объектами
        handleObjectCollisions(objects);
        
        return { merges: 0, points: 0 }; // Обновится в checkMerges
    }
    
    /**
     * Проверка столкновений со стенками и границами
     */
    function handleWallCollisions(obj) {
        // Константы игрового поля
        const LEFT_WALL = 0;
        const RIGHT_WALL = 1080;
        const BOTTOM_WALL = 1720;
        
        // Столкновение с левой стенкой
        if (obj.x - obj.radius < LEFT_WALL) {
            obj.x = LEFT_WALL + obj.radius;
            obj.velocityX = -obj.velocityX * BOUNCE_FACTOR;
        }
        
        // Столкновение с правой стенкой
        if (obj.x + obj.radius > RIGHT_WALL) {
            obj.x = RIGHT_WALL - obj.radius;
            obj.velocityX = -obj.velocityX * BOUNCE_FACTOR;
        }
        
        // Столкновение с нижней границей
        if (obj.y + obj.radius > BOTTOM_WALL) {
            obj.y = BOTTOM_WALL - obj.radius;
            obj.velocityY = -obj.velocityY * BOUNCE_FACTOR;
            
            // Добавляем случайный импульс по X при отскоке от дна
            // для более интересного поведения
            if (Math.abs(obj.velocityY) > 1) {
                obj.velocityX += (Math.random() - 0.5) * 0.5;
            }
        }
        
        // Предотвращение выхода за верхнюю границу (Y < 0)
        if (obj.y - obj.radius < 0) {
            obj.y = obj.radius;
            obj.velocityY = Math.abs(obj.velocityY) * BOUNCE_FACTOR;
        }
    }
    
    /**
     * Проверка столкновений между объектами
     */
    function handleObjectCollisions(objects) {
        const currentTime = performance.now();
        const collisionThreshold = 200; // Минимальное время между последовательными столкновениями (мс)
        
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                const obj1 = objects[i];
                const obj2 = objects[j];
                
                // Если столкновения не было, пропускаем
                if (!checkCollision(obj1, obj2)) continue;
                
                // Если с момента последнего столкновения прошло мало времени, пропускаем
                if (currentTime - obj1.lastCollisionTime < collisionThreshold ||
                    currentTime - obj2.lastCollisionTime < collisionThreshold) {
                    continue;
                }
                
                // Обновляем время последнего столкновения
                obj1.lastCollisionTime = currentTime;
                obj2.lastCollisionTime = currentTime;
                
                // Если объекты имеют одинаковый уровень, проверяем возможность слияния
                if (obj1.level === obj2.level) {
                    const pct = calculateOverlapPercentage(obj1, obj2);
                    
                    // Если процент перекрытия достаточен для немедленного слияния
                    if (pct >= COLLISION_THRESHOLD) {
                        // Выполняем слияние сразу
                        mergeTwoObjects(objects, i, j);
                        return; // Выходим, так как индексы могли измениться
                    } 
                    // Иначе планируем слияние с задержкой
                    else {
                        // Проверяем, не запланировано ли уже это слияние
                        const alreadyPending = pendingMerges.some(
                            merge => (merge.obj1Id === obj1.id && merge.obj2Id === obj2.id) ||
                                    (merge.obj1Id === obj2.id && merge.obj2Id === obj1.id)
                        );
                        
                        if (!alreadyPending) {
                            pendingMerges.push({
                                obj1Id: obj1.id,
                                obj2Id: obj2.id,
                                startTime: currentTime
                            });
                        }
                    }
                }
                
                // Обрабатываем физику столкновения для отскока
                resolveCollision(obj1, obj2);
            }
        }
    }
    
    /**
     * Вычисление процента перекрытия между двумя объектами
     */
    function calculateOverlapPercentage(obj1, obj2) {
        const distance = Math.sqrt(Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.y - obj2.y, 2));
        const sumRadii = obj1.radius + obj2.radius;
        
        // Если объекты не пересекаются, перекрытие 0%
        if (distance >= sumRadii) return 0;
        
        // Вычисляем процент перекрытия (от 0 до 1)
        return (sumRadii - distance) / Math.min(obj1.radius, obj2.radius);
    }
    
    /**
     * Проверка столкновения между двумя объектами
     */
    function checkCollision(obj1, obj2) {
        const distance = Math.sqrt(Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.y - obj2.y, 2));
        return distance < obj1.radius + obj2.radius;
    }
    
    /**
     * Физическое разрешение столкновения между двумя объектами
     */
    function resolveCollision(obj1, obj2) {
        // Вектор нормали между центрами объектов
        const nx = obj2.x - obj1.x;
        const ny = obj2.y - obj1.y;
        
        // Длина вектора нормали
        const length = Math.sqrt(nx * nx + ny * ny);
        if (length === 0) return; // Предотвращение деления на ноль
        
        // Нормализация вектора нормали
        const unx = nx / length;
        const uny = ny / length;
        
        // Проекции скоростей объектов на вектор нормали
        const v1n = obj1.velocityX * unx + obj1.velocityY * uny;
        const v2n = obj2.velocityX * unx + obj2.velocityY * uny;
        
        // Расчет импульса (формула для упругого столкновения)
        const m1 = obj1.radius * obj1.radius; // Масса пропорциональна квадрату радиуса
        const m2 = obj2.radius * obj2.radius;
        
        // Если объекты движутся в разных направлениях относительно нормали,
        // выполняем отскок, иначе они могут уже "расталкиваться"
        if (v1n > v2n) {
            // Новые скорости после столкновения
            const v1nNew = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
            const v2nNew = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);
            
            // Обновление скоростей объектов
            obj1.velocityX += (v1nNew - v1n) * unx * BOUNCE_FACTOR;
            obj1.velocityY += (v1nNew - v1n) * uny * BOUNCE_FACTOR;
            obj2.velocityX += (v2nNew - v2n) * unx * BOUNCE_FACTOR;
            obj2.velocityY += (v2nNew - v2n) * uny * BOUNCE_FACTOR;
            
            // Отталкиваем объекты друг от друга для предотвращения застревания
            const overlap = obj1.radius + obj2.radius - length;
            if (overlap > 0) {
                // Распределяем смещение по массам объектов
                const totalMass = m1 + m2;
                const moveX = unx * overlap;
                const moveY = uny * overlap;
                
                obj1.x -= moveX * (m2 / totalMass);
                obj1.y -= moveY * (m2 / totalMass);
                obj2.x += moveX * (m1 / totalMass);
                obj2.y += moveY * (m1 / totalMass);
            }
            
            // Добавляем случайное вращение при столкновении
            obj1.rotationSpeed += (Math.random() - 0.5) * 0.05;
            obj2.rotationSpeed += (Math.random() - 0.5) * 0.05;
        }
    }
    
    /**
     * Выполнение слияния двух объектов
     */
    function mergeTwoObjects(objects, index1, index2) {
        const obj1 = objects[index1];
        const obj2 = objects[index2];
        
        // Определяем новую позицию (центр между объектами)
        const newX = (obj1.x + obj2.x) / 2;
        const newY = (obj1.y + obj2.y) / 2;
        
        // Усредняем скорости с учетом сохранения импульса
        const m1 = obj1.radius * obj1.radius;
        const m2 = obj2.radius * obj2.radius;
        const totalMass = m1 + m2;
        const newVelocityX = (obj1.velocityX * m1 + obj2.velocityX * m2) / totalMass;
        const newVelocityY = (obj1.velocityY * m1 + obj2.velocityY * m2) / totalMass;
        
        // Новый уровень = текущий уровень + 1
        const newLevel = obj1.level + 1;
        
        // Создаем новый объект
        const newObj = createObject(newX, newY, newLevel);
        
        // Устанавливаем начальные скорости и вращение
        newObj.velocityX = newVelocityX;
        newObj.velocityY = newVelocityY;
        newObj.rotationSpeed = (obj1.rotationSpeed + obj2.rotationSpeed) / 2;
        
        // Удаляем старые объекты (в обратном порядке, чтобы индексы не сбились)
        objects.splice(Math.max(index1, index2), 1);
        objects.splice(Math.min(index1, index2), 1);
        
        // Добавляем новый объект
        objects.push(newObj);
        
        // Устанавливаем флаг слияния
        mergeOccurred = true;
    }
    
    /**
     * Проверка возможных слияний и подсчет очков
     */
    function checkMerges(objects) {
        let merges = 0;
        let points = 0;
        
        // Проверяем флаг слияния вместо логики с ID
        if (mergeOccurred) {
            // Находим объект с максимальным ID (это новый слитый объект)
            const maxId = objects.reduce((max, obj) => Math.max(max, obj.id), -Infinity);
            const newObj = objects.find(obj => obj.id === maxId);
            
            if (newObj) {
                merges = 1; // Одно слияние
                points = newObj.level * 10; // 10 очков за каждый уровень
            }
            
            // Сбрасываем флаг слияния
            mergeOccurred = false;
        }
        
        return { merges, points };
    }
    
    // Публичный API
    return {
        createObject,
        updateObjects,
        checkMerges
    };
})();

// Экспорт объекта Physics для использования в других модулях
window.Physics = Physics;
