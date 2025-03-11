/**
 * effects.js - Визуальные эффекты и 3D киберпространство для игры
 */
// Импорт Three.js (ES модули)
import * as THREE from 'three';
import { EffectComposer } from './postprocessing/EffectComposer.js';
import { RenderPass } from './postprocessing/RenderPass.js';
import { UnrealBloomPass } from './postprocessing/UnrealBloomPass.js';
import { GlitchPass } from './postprocessing/GlitchPass.js';
import { ShaderPass } from './postprocessing/ShaderPass.js';

// Система мониторинга FPS для автоматической адаптации качества
const FPSMonitor = {
    frames: 0,
    lastCheck: 0,
    currentFPS: 60,
    samples: [],
    maxSamples: 10,
    
    update: function() {
        this.frames++;
        const now = performance.now();
        
        if (now - this.lastCheck >= 1000) {
            const fps = this.frames * 1000 / (now - this.lastCheck);
            this.samples.push(fps);
            
            if (this.samples.length > this.maxSamples) {
                this.samples.shift();
            }
            
            this.currentFPS = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
            this.frames = 0;
            this.lastCheck = now;
            
            // Проверяем и адаптируем качество
            QualityManager.checkAndAdjustQuality(this.currentFPS);
        }
        
        return this.currentFPS;
    }
};

// Профили качества, определяющие параметры сцены
const QualityProfiles = {
    LOW: {
        particlesCount: 100,
        geometricObjectsCount: 5,
        bloomIntensity: 0.5,
        useBloom: false,
        gridSegments: 10,
        dataStreamsCount: 100
    },
    MEDIUM: {
        particlesCount: 200,
        geometricObjectsCount: 8,
        bloomIntensity: 1.0,
        useBloom: true,
        gridSegments: 15,
        dataStreamsCount: 200
    },
    HIGH: {
        particlesCount: 300,
        geometricObjectsCount: 15,
        bloomIntensity: 1.5,
        useBloom: true,
        gridSegments: 20,
        dataStreamsCount: 300
    }
};

// Менеджер качества
const QualityManager = {
    currentProfile: 'MEDIUM',
    manualOverride: false,
    
    checkAndAdjustQuality: function(fps) {
        if (this.manualOverride) return;
        
        if (fps < 30 && this.currentProfile !== 'LOW') {
            this.setQuality('LOW');
            console.log('Качество снижено до НИЗКОГО (FPS: ' + fps.toFixed(1) + ')');
        } else if (fps > 50 && fps < 58 && this.currentProfile !== 'MEDIUM') {
            this.setQuality('MEDIUM');
            console.log('Качество установлено на СРЕДНЕЕ (FPS: ' + fps.toFixed(1) + ')');
        } else if (fps >= 58 && this.currentProfile !== 'HIGH') {
            this.setQuality('HIGH');
            console.log('Качество повышено до ВЫСОКОГО (FPS: ' + fps.toFixed(1) + ')');
        }
    },
    
    setQuality: function(profileName) {
        this.currentProfile = profileName;
        applyQualitySettings();
    },
    
    getCurrentProfile: function() {
        return QualityProfiles[this.currentProfile];
    }
};

// Применяем текущие настройки качества к сцене
function applyQualitySettings() {
    const profile = QualityManager.getCurrentProfile();
    
    // Применяем настройки к существующим объектам сцены
    if (typeof scene !== 'undefined') {
        // Пересоздаем геометрические объекты с новым количеством
        if (typeof addGeometricObjects === 'function') {
            addGeometricObjects();
        }
        
        // Обновляем киберпространство
        if (typeof createCyberspace === 'function') {
            // Удаляем старые объекты киберпространства
            scene.traverse((object) => {
                if (object.userData && 
                    (object.userData.isDataStream || 
                     object.userData.isDataLine || 
                     object.userData.isDigitalSymbol || 
                     object.userData.isDigitalPanel)) {
                    scene.remove(object);
                }
            });
            
            // Создаем новое киберпространство
            createCyberspace();
        }
        
        // Обновляем частицы
        if (particles) {
            scene.remove(particles);
            
            // Создаем новые частицы с настройками качества
            const particlesCount = profile.particlesCount;
            const particlesGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particlesCount * 3);
            
            for (let i = 0; i < particlesCount * 3; i += 3) {
                positions[i] = (Math.random() - 0.5) * 20;
                positions[i + 1] = (Math.random() - 0.5) * 20;
                positions[i + 2] = (Math.random() - 0.5) * 20;
            }
            
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            if (!particlesMaterial) {
                particlesMaterial = new THREE.PointsMaterial({
                    color: cssToThreeColor(colorScheme.main),
                    size: 0.1,
                    transparent: true,
                    opacity: 0.8
                });
            }
            
            particles = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particles);
        }
    }
    
    // Обновляем постобработку, если она уже настроена
    if (typeof composer !== 'undefined' && composer) {
        // Удаляем старый bloomPass, если он существует
        if (typeof bloomPass !== 'undefined' && bloomPass) {
            composer.removePass(bloomPass);
            bloomPass = null;
        }
        
        // Добавляем новый bloomPass с настройками качества
        if (profile.useBloom && typeof UnrealBloomPass !== 'undefined') {
            bloomPass = new UnrealBloomPass(
                new THREE.Vector2(canvas.width, canvas.height),
                profile.bloomIntensity,
                0.4,
                0.85
            );
            composer.addPass(bloomPass);
        }
    }
    
    // Сохраняем настройки качества в localStorage
    localStorage.setItem('matrixMergeQuality', QualityManager.currentProfile);
    
    console.log('Применены настройки качества:', QualityManager.currentProfile);
}

// Определяем начальное качество на основе устройства
function determineInitialQuality() {
    // Если на мобильном устройстве, начинаем с низкого качества
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return 'LOW';
    }
    
    // По умолчанию начинаем со среднего качества
    return 'MEDIUM';
}

const MatrixEffect = (function() {
    // Переменные Three.js
    let scene, camera, renderer;
    let gridMaterial, particlesMaterial, linesMaterial;
    let grid, particles, lines, matrixParticles;
    let geometricObjects = [];
    let composer, bloomPass, glitchPass;
    
    // Константы киберпространства
    const roadSize = 60;
    const roadWidth = 10;
    
    // Остальные переменные
    let canvas;
    let animationId = null;
    let isActive = false;
    let frameCount = 0;
    let colorScheme = {
        main: '#0f0',
        shadow: 'rgba(0, 255, 0, 0.3)',
        secondary: 'rgba(0, 255, 0, 0.1)'
    };
    
    // Массив для отслеживания всех активных таймеров
    let activeTimers = [];
    
    let aberrationPass; // Добавляем переменную для хроматической аберрации
    let hologramMaterials = []; // Список материалов голограмм
    
    // Конвертация CSS-цветов в Three.js цвета
    function cssToThreeColor(cssColor) {
        // Проверяем, содержит ли цвет альфа-канал (rgba)
        if (cssColor.startsWith('rgba')) {
            // Извлекаем только RGB часть
            const match = cssColor.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
            if (match) {
                return new THREE.Color(
                    parseInt(match[1]) / 255,
                    parseInt(match[2]) / 255,
                    parseInt(match[3]) / 255
                );
            }
        }
        
        // Обычная обработка других форматов цвета
        return new THREE.Color(cssColor);
    }
    
    // Инициализация 3D сцены
    function initThreeScene() {
        // Создание сцены
        scene = new THREE.Scene();
        
        // Настраиваем более густой туман для кибер-атмосферы
        scene.fog = new THREE.FogExp2(0x000000, 0.03);
        
        // Настройка камеры
        const fov = 60;
        const aspect = canvas.width / canvas.height;
        camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        
        // Позиционируем камеру для обзора статичной улицы
        camera.position.set(0, 5, -10);
        camera.lookAt(0, 0, 20);
        
        // Создание рендерера
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor(0x000000, 0.1); // Полупрозрачный черный фон
        
        // Создание объектов сцены
        createGridObjects();
        addGeometricObjects();
        setupPostprocessing();
    }
    
    // Инициализация эффекта киберпространства
    function init() {
        // Получаем canvas только при инициализации
        canvas = document.getElementById('matrix-bg');
        
        // Проверяем, доступен ли canvas
        if (!canvas) {
            console.error('Элемент canvas с id "matrix-bg" не найден!');
            return;
        }
        
        console.log('MatrixEffect: инициализация 3D эффекта');
        
        // Загружаем сохраненное качество или определяем автоматически
        const savedQuality = localStorage.getItem('matrixMergeQuality');
        if (savedQuality) {
            QualityManager.setQuality(savedQuality);
            QualityManager.manualOverride = true;
            console.log('Загружены сохраненные настройки качества:', savedQuality);
        } else {
            QualityManager.setQuality(determineInitialQuality());
            console.log('Установлено автоматическое качество:', QualityManager.currentProfile);
        }
        
        // Установка размеров холста
        resize();
        
        // Инициализация Three.js сцены
        initThreeScene();
        
        // Запуск анимации
        isActive = true;
        if (animationId === null) {
            animate();
        }
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', resize);
    }
    
    // Настройка постобработки
    function setupPostprocessing() {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        
        // Bloom эффект
        bloomPass = new UnrealBloomPass(
            new THREE.Vector2(canvas.width, canvas.height),
            1.5, // сила
            0.4, // радиус
            0.85  // порог
        );
        composer.addPass(bloomPass);
        
        // Добавляем хроматическую аберрацию для схемы cyberpunk2077
        if (colorScheme.main === '#fcee0a' || document.body.classList.contains('cyberpunk2077')) {
            setupChromaticAberration();
        }
    }
    
    // Установка эффекта хроматической аберрации
    function setupChromaticAberration() {
        // Шейдер для хроматической аберрации
        const chromaticAberrationShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "amount": { value: 0.005 },
                "time": { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    float aberration = amount * (1.0 + 0.2 * sin(time * 2.0));
                    
                    vec2 offset = aberration * vec2(cos(time), sin(time * 0.5));
                    
                    vec4 cr = texture2D(tDiffuse, vUv + offset);
                    vec4 cg = texture2D(tDiffuse, vUv);
                    vec4 cb = texture2D(tDiffuse, vUv - offset);
                    
                    gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
                }
            `
        };
        
        aberrationPass = new ShaderPass(chromaticAberrationShader);
        composer.addPass(aberrationPass);
    }
    
    // Изменение размера холста
    function resize() {
        if (typeof Game !== 'undefined' && typeof Game.getGameDimensions === 'function') {
            const dimensions = Game.getGameDimensions();
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            canvas.style.position = 'absolute';
            canvas.style.left = (window.innerWidth - dimensions.width) / 2 + 'px';
            canvas.style.top = (window.innerHeight - dimensions.height) / 2 + 'px';
        } else {
            const aspectRatio = 11 / 16;
            let gameWidth, gameHeight;

            if (window.innerWidth / window.innerHeight > aspectRatio) {
                gameHeight = Math.min(window.innerHeight, 1920);
                gameWidth = gameHeight * aspectRatio;
            } else {
                gameWidth = Math.min(window.innerWidth, 1080);
                gameHeight = gameWidth / aspectRatio;
            }

            canvas.width = Math.floor(gameWidth);
            canvas.height = Math.floor(gameHeight);

            canvas.style.position = 'absolute';
            canvas.style.left = (window.innerWidth - canvas.width) / 2 + 'px';
            canvas.style.top = (window.innerHeight - canvas.height) / 2 + 'px';
        }
        
        // Обновление размеров для Three.js
        if (renderer && camera) {
            renderer.setSize(canvas.width, canvas.height);
            camera.aspect = canvas.width / canvas.height;
            camera.updateProjectionMatrix();
            
            // Обновление размеров для постобработки
            if (composer && bloomPass) {
                composer.setSize(canvas.width, canvas.height);
                bloomPass.resolution.set(canvas.width, canvas.height);
            }
        }
    }
    
    // Добавление геометрических объектов
    function addGeometricObjects() {
        const profile = QualityManager.getCurrentProfile();
        const objectCount = profile.geometricObjectsCount;
        
        const shapes = [
            new THREE.TetrahedronGeometry(0.5, 0),
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            new THREE.OctahedronGeometry(0.5, 0),
            new THREE.DodecahedronGeometry(0.5, 0)
        ];
        
        const material = new THREE.MeshBasicMaterial({
            color: cssToThreeColor(colorScheme.main),
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        // Очищаем существующие объекты при повторном вызове
        geometricObjects.forEach(obj => {
            scene.remove(obj);
        });
        geometricObjects = [];
        
        for (let i = 0; i < objectCount; i++) {
            const shapeIndex = Math.floor(Math.random() * shapes.length);
            const mesh = new THREE.Mesh(shapes[shapeIndex], material.clone());
            
            mesh.position.set(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10
            );
            
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            mesh.userData = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                },
                floatSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.005,
                    z: (Math.random() - 0.5) * 0.01
                }
            };
            
            geometricObjects.push(mesh);
            scene.add(mesh);
        }
    }
    
    // Создание объектов киберпространства
    function createGridObjects() {
        const profile = QualityManager.getCurrentProfile();
        
        // Создание дороги
        const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadSize, 20, 20);
        gridMaterial = new THREE.MeshBasicMaterial({
            color: cssToThreeColor(colorScheme.secondary),
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        grid = new THREE.Mesh(roadGeometry, gridMaterial);
        grid.rotation.x = -Math.PI / 2;
        grid.position.y = -2;
        scene.add(grid);
        
        // Создание киберпространства вместо киберпространственной улицы
        createCyberspace();
        
        // Создание частиц (световых эффектов)
        const particlesCount = profile.particlesCount;
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particlesCount * 3);
        
        for (let i = 0; i < particlesCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 20;
            positions[i + 1] = (Math.random() - 0.5) * 20;
            positions[i + 2] = (Math.random() - 0.5) * 20;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesMaterial = new THREE.PointsMaterial({
            color: cssToThreeColor(colorScheme.main),
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);
    }
    
    // Создание киберпространства вместо киберпространственной улицы
    function createCyberspace() {
        // Создаем группу для объектов киберпространства
        const cyberspaceGroup = new THREE.Group();
        scene.add(cyberspaceGroup);
        
        // Создаем основную сетку
        createGrid(cyberspaceGroup);
        
        // Создаем потоки данных (замена кибердождя)
        createDataStreams(cyberspaceGroup);
        
        // Добавляем несколько цифровых эффектов
        addDigitalEffects(cyberspaceGroup);
        
        // Добавляем голографические проекции для cyberpunk2077
        if (colorScheme.main === '#fcee0a' || document.body.classList.contains('cyberpunk2077')) {
            addHolographicProjections(cyberspaceGroup);
        }
    }
    
    // Создание основной сетки киберпространства
    function createGrid(group) {
        const profile = QualityManager.getCurrentProfile();
        const gridSize = 60;
        const segments = profile.gridSegments;
        
        // Создаем основную сетку
        const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments);
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: cssToThreeColor(colorScheme.secondary),
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        // Горизонтальная сетка (пол)
        const floorGrid = new THREE.Mesh(gridGeometry, gridMaterial);
        floorGrid.rotation.x = -Math.PI / 2;
        floorGrid.position.y = -5;
        group.add(floorGrid);
        
        // Вертикальная сетка (стена)
        const wallGrid = new THREE.Mesh(gridGeometry, gridMaterial);
        wallGrid.position.z = 30;
        group.add(wallGrid);
        
        // Вторая вертикальная сетка (стена)
        const wallGrid2 = new THREE.Mesh(gridGeometry, gridMaterial);
        wallGrid2.rotation.y = Math.PI / 2;
        wallGrid2.position.x = -30;
        group.add(wallGrid2);
        
        // Добавляем линии координатной сетки
        const linesMaterial = new THREE.LineBasicMaterial({
            color: cssToThreeColor(colorScheme.main),
            transparent: true,
            opacity: 0.5
        });
        
        // Создаем линии для X, Y и Z осей
        const axisLength = 20;
        const axisGeometry = new THREE.BufferGeometry();
        const axisPositions = new Float32Array([
            // X ось (красная)
            0, 0, 0, axisLength, 0, 0,
            // Y ось (зеленая)
            0, 0, 0, 0, axisLength, 0,
            // Z ось (синяя)
            0, 0, 0, 0, 0, axisLength
        ]);
        
        axisGeometry.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3));
        const axisLines = new THREE.LineSegments(axisGeometry, linesMaterial);
        group.add(axisLines);
        
        // Добавляем специальные элементы для киберпанк стиля
        if (colorScheme.main === '#fcee0a' || document.body.classList.contains('cyberpunk2077')) {
            // Создаем яркие линии по периметру сетки (пол)
            const edgeGeometry = new THREE.BufferGeometry();
            const halfSize = gridSize / 2;
            const edgePositions = new Float32Array([
                // Контур сетки
                -halfSize, -5, -halfSize, 
                halfSize, -5, -halfSize,
                
                halfSize, -5, -halfSize, 
                halfSize, -5, halfSize,
                
                halfSize, -5, halfSize, 
                -halfSize, -5, halfSize,
                
                -halfSize, -5, halfSize, 
                -halfSize, -5, -halfSize
            ]);
            
            edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
            
            const edgeMaterial = new THREE.LineBasicMaterial({
                color: cssToThreeColor(colorScheme.main),
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            });
            
            const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            group.add(edgeLines);
            
            // Создаем диагональные "лучи" по углам
            const rayLength = 10;
            const rayGeometry = new THREE.BufferGeometry();
            const rayPositions = new Float32Array([
                // Лучи от углов
                -halfSize, -5, -halfSize, 
                -halfSize + rayLength, -5, -halfSize + rayLength,
                
                halfSize, -5, -halfSize, 
                halfSize - rayLength, -5, -halfSize + rayLength,
                
                halfSize, -5, halfSize, 
                halfSize - rayLength, -5, halfSize - rayLength,
                
                -halfSize, -5, halfSize, 
                -halfSize + rayLength, -5, halfSize - rayLength
            ]);
            
            rayGeometry.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
            
            const rayMaterial = new THREE.LineBasicMaterial({
                color: cssToThreeColor(colorScheme.secondary),
                linewidth: 2,
                transparent: true,
                opacity: 0.6
            });
            
            const rayLines = new THREE.LineSegments(rayGeometry, rayMaterial);
            group.add(rayLines);
        }
    }
    
    // Создание потоков данных (замена кибердождя)
    function createDataStreams(group) {
        const profile = QualityManager.getCurrentProfile();
        const streamCount = profile.dataStreamsCount;
        
        // Создаем геометрию для потоков данных
        const streamGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(streamCount * 3);
        const velocities = new Float32Array(streamCount);
        const sizes = new Float32Array(streamCount);
        
        // Инициализируем потоки данных
        for (let i = 0; i < streamCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 60;     // X
            positions[i3 + 1] = Math.random() * 30 - 5;     // Y
            positions[i3 + 2] = (Math.random() - 0.5) * 60; // Z
            
            velocities[i] = 0.05 + Math.random() * 0.1;
            sizes[i] = 0.05 + Math.random() * 0.15;
        }
        
        streamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        streamGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
        streamGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Создаем материал для потоков данных
        const streamMaterial = new THREE.PointsMaterial({
            color: cssToThreeColor(colorScheme.main),
            size: 0.2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        // Создаем систему частиц
        const dataStreams = new THREE.Points(streamGeometry, streamMaterial);
        dataStreams.userData.isDataStream = true;
        group.add(dataStreams);
        
        // Присваиваем dataStreams переменной matrixParticles для анимации в функции animate()
        matrixParticles = dataStreams;
        
        // Создаем линии данных
        const lineCount = Math.floor(streamCount / 10);
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(lineCount * 6); // 2 точки на линию, 3 координаты на точку
        
        for (let i = 0; i < lineCount; i++) {
            const i6 = i * 6;
            const x = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            
            linePositions[i6] = x;
            linePositions[i6 + 1] = 15;
            linePositions[i6 + 2] = z;
            
            linePositions[i6 + 3] = x;
            linePositions[i6 + 4] = -5;
            linePositions[i6 + 5] = z;
        }
        
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: cssToThreeColor(colorScheme.main),
            transparent: true,
            opacity: 0.3
        });
        
        const dataLines = new THREE.LineSegments(lineGeometry, lineMaterial);
        dataLines.userData.isDataLine = true;
        group.add(dataLines);
    }
    
    // Добавление цифровых эффектов в киберпространство
    function addDigitalEffects(group) {
        const profile = QualityManager.getCurrentProfile();
        
        // Добавляем цифровые символы (матричные символы)
        const symbolCount = Math.floor(profile.particlesCount / 2);
        const symbolGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(symbolCount * 3);
        const opacities = new Float32Array(symbolCount);
        
        for (let i = 0; i < symbolCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 50;
            positions[i3 + 1] = (Math.random() - 0.5) * 30;
            positions[i3 + 2] = (Math.random() - 0.5) * 50;
            
            opacities[i] = 0.1 + Math.random() * 0.5;
        }
        
        symbolGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        symbolGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        const symbolMaterial = new THREE.PointsMaterial({
            color: cssToThreeColor(colorScheme.main),
            size: 0.3,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        const symbols = new THREE.Points(symbolGeometry, symbolMaterial);
        symbols.userData.isDigitalSymbol = true;
        group.add(symbols);
        
        // Добавляем несколько плавающих цифровых панелей
        const panelCount = Math.min(5, Math.floor(profile.geometricObjectsCount / 3));
        
        for (let i = 0; i < panelCount; i++) {
            const panelWidth = 2 + Math.random() * 3;
            const panelHeight = 1 + Math.random() * 2;
            
            const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
            const panelMaterial = new THREE.MeshBasicMaterial({
                color: cssToThreeColor(colorScheme.main),
                wireframe: true,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.3
            });
            
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            
            panel.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 10,
                (Math.random() - 0.5) * 30
            );
            
            panel.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            panel.userData.isDigitalPanel = true;
            panel.userData.floatSpeed = {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.01
            };
            panel.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.005,
                z: (Math.random() - 0.5) * 0.005
            };
            
            group.add(panel);
        }
    }
    
    // Добавление голографических проекций в киберпространство
    function addHolographicProjections(group) {
        // Голографический шейдер
        const hologramShader = {
            uniforms: {
                time: { value: 0.0 },
                color: { value: new THREE.Color(colorScheme.accent) },
                glitchIntensity: { value: 0.05 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform float glitchIntensity;
                varying vec2 vUv;
                
                // Простая функция случайного числа
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Базовые горизонтальные линии
                    float lines = step(0.8, sin(uv.y * 50.0));
                    
                    // Мерцание
                    float flicker = 0.8 + 0.4 * sin(time * 8.0);
                    
                    // Случайные глитч-блоки
                    float glitchX = step(1.0 - glitchIntensity, random(vec2(time * 0.1, floor(uv.y * 20.0))));
                    float glitchY = step(1.0 - glitchIntensity, random(vec2(time * 0.1, floor(uv.x * 20.0))));
                    
                    // Сдвиг координат для создания эффекта глитча
                    if (glitchX > 0.0) uv.x += (random(vec2(time, uv.y)) * 2.0 - 1.0) * 0.1;
                    if (glitchY > 0.0) uv.y += (random(vec2(time, uv.x)) * 2.0 - 1.0) * 0.1;
                    
                    // Эффект сканирования (горизонтальная линия)
                    float scanline = sin(uv.y * 200.0 + time * 5.0) * 0.5 + 0.5;
                    
                    // Создаем эффект голограммы
                    float hologramEdge = pow(1.0 - abs(uv.x - 0.5) * 2.0, 0.5);
                    float alphaY = pow(1.0 - abs(uv.y - 0.5) * 2.0, 0.5);
                    float alpha = hologramEdge * alphaY * flicker;
                    
                    // Добавляем "данные" (случайные блоки)
                    float data = random(vec2(floor(uv.x * 40.0), floor(uv.y * 40.0) + time));
                    data = step(0.8, data) * step(uv.y, 0.9) * step(0.1, uv.y);
                    
                    // Собираем финальный цвет
                    vec3 finalColor = color * (0.5 + 0.5 * lines) * (0.8 + 0.2 * scanline);
                    finalColor += vec3(1.0, 1.0, 1.0) * data * 0.5;
                    
                    gl_FragColor = vec4(finalColor, alpha * 0.7);
                }
            `
        };
        
        // Создаем только несколько голограмм (ограничиваем для производительности)
        const hologramCount = 2;
        
        for (let i = 0; i < hologramCount; i++) {
            // Разные размеры для разных голограмм
            const width = 1.5 + Math.random() * 2;
            const height = 2 + Math.random() * 3;
            
            // Создаем геометрию и материал
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(i % 2 === 0 ? colorScheme.secondary : colorScheme.accent) },
                    glitchIntensity: { value: 0.03 + Math.random() * 0.05 }
                },
                vertexShader: hologramShader.vertexShader,
                fragmentShader: hologramShader.fragmentShader,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const hologram = new THREE.Mesh(geometry, material);
            
            // Распределяем голограммы в пространстве
            hologram.position.set(
                (Math.random() - 0.5) * 20,
                2 + Math.random() * 3,
                (Math.random() - 0.5) * 20
            );
            
            // Случайное вращение
            hologram.rotation.y = Math.random() * Math.PI * 2;
            
            // Добавляем временное смещение для разной анимации
            hologram.userData.timeOffset = Math.random() * Math.PI * 2;
            
            // Сохраняем материал для обновления униформы времени
            hologramMaterials.push(material);
            
            group.add(hologram);
        }
    }
    
    // Обновление и визуализация 3D сцены
    function animate() {
        if (!isActive) {
            animationId = null;
            return;
        }
        
        // Получаем время
        const time = Date.now() * 0.001;
        
        // Обновляем униформы шейдеров для киберпанк-эффектов
        if (colorScheme.main === '#fcee0a' || document.body.classList.contains('cyberpunk2077')) {
            // Обновляем время для хроматической аберрации
            if (aberrationPass) {
                aberrationPass.uniforms.time.value = time;
                
                // Делаем эффект более заметным во время глитчей
                if (glitchActive) {
                    aberrationPass.uniforms.amount.value = 0.01 + Math.random() * 0.02;
                } else {
                    aberrationPass.uniforms.amount.value = 0.003 + Math.sin(time * 2) * 0.002;
                }
            }
            
            // Обновляем голограммы редко
            if (frameCount % 5 === 0) {
                hologramMaterials.forEach(material => {
                    if (material && material.uniforms) {
                        material.uniforms.time.value = time;
                    }
                });
            }
            
            frameCount++;
        }
        
        // Обновляем позиции частиц матрицы
        if (matrixParticles) {
            const positions = matrixParticles.geometry.attributes.position.array;
            const velocities = matrixParticles.geometry.attributes.velocity.array;
            let needsUpdate = false;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= velocities[i / 3];
                
                // Если частица достигла нижней границы, возвращаем ее наверх
                if (positions[i + 1] < -10) {
                    positions[i] = (Math.random() - 0.5) * 60;
                    positions[i + 1] = 30;
                    positions[i + 2] = (Math.random() - 0.5) * 60;
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                matrixParticles.geometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Анимируем плавающие цифровые панели
        scene.traverse(object => {
            if (object.userData.isDigitalPanel) {
                const speed = object.userData.floatSpeed;
                const rotSpeed = object.userData.rotationSpeed;
                
                object.position.x += speed.x;
                object.position.y += speed.y;
                object.position.z += speed.z;
                
                object.rotation.x += rotSpeed.x;
                object.rotation.y += rotSpeed.y;
                object.rotation.z += rotSpeed.z;
                
                // Отскок от границ
                if (Math.abs(object.position.x) > 20) speed.x *= -1;
                if (Math.abs(object.position.y - 5) > 10) speed.y *= -1;
                if (Math.abs(object.position.z) > 20) speed.z *= -1;
            }
        });
        
        // Вращаем геометрические объекты
        geometricObjects.forEach(obj => {
            obj.rotation.x += 0.005;
            obj.rotation.y += 0.01;
        });
        
        // Рендеринг сцены
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
        
        // Продолжение анимации
        animationId = requestAnimationFrame(animate);
    }
    
    // Метод для активации glitch-эффекта
    function triggerGlitchEffect(duration = 1000) {
        if (glitchPass) {
            glitchPass.enabled = true;
            
            // Вместо setTimeout используем переменную для отслеживания таймера
            const glitchTimer = setTimeout(() => {
                if (glitchPass) {
                    glitchPass.enabled = false;
                }
            }, duration);
            
            // Добавляем таймер в список для очистки
            activeTimers.push(glitchTimer);
            
            // Возвращаем функцию для отмены эффекта
            return function cancelGlitch() {
                clearTimeout(glitchTimer);
                const index = activeTimers.indexOf(glitchTimer);
                if (index !== -1) {
                    activeTimers.splice(index, 1);
                }
                if (glitchPass) {
                    glitchPass.enabled = false;
                }
            };
        }
        return function() {}; // Пустая функция если glitchPass не доступен
    }
    
    // Метод для активации эффекта слияния в 3D сцене
    function trigger3DMergeEffect(x, y) {
        if (!scene) return;
        
        // Добавляем новый источник света в точке слияния
        const light = new THREE.PointLight(
            cssToThreeColor(colorScheme.main),
            2,
            5
        );
        
        // Преобразуем координаты из 2D в 3D пространство
        const vector = new THREE.Vector3(
            (x / canvas.width) * 2 - 1,
            -(y / canvas.height) * 2 + 1,
            0.5
        );
        vector.unproject(camera);
        light.position.copy(vector);
        
        scene.add(light);
        
        // Анимация затухания света
        const startTime = Date.now();
        function animateLight() {
            const elapsed = Date.now() - startTime;
            const duration = 1000; // 1 секунда
            
            if (elapsed < duration && scene.children.includes(light)) {
                const intensity = 2 * (1 - elapsed / duration);
                light.intensity = intensity;
                requestAnimationFrame(animateLight);
            } else if (scene.children.includes(light)) {
                scene.remove(light);
            }
        }
        
        animateLight();
    }
    
    // Установка цветовой схемы
    function setColorScheme(scheme) {
        switch(scheme) {
            case 'matrix':
                colorScheme = { main: '#0f0', shadow: 'rgba(0, 255, 0, 0.3)', secondary: 'rgba(0, 255, 0, 0.1)' };
                break;
            case 'cyber':
                colorScheme = { main: '#0ff', shadow: 'rgba(0, 255, 255, 0.3)', secondary: 'rgba(0, 255, 255, 0.1)' };
                break;
            case 'neon':
                colorScheme = { main: '#f0f', shadow: 'rgba(255, 0, 255, 0.3)', secondary: 'rgba(255, 0, 255, 0.1)' };
                break;
            case 'retro':
                colorScheme = { main: '#ffa500', shadow: 'rgba(255, 165, 0, 0.3)', secondary: 'rgba(255, 165, 0, 0.1)' };
                break;
            case 'gold':
                colorScheme = { main: '#ffd700', shadow: 'rgba(255, 215, 0, 0.3)', secondary: 'rgba(255, 215, 0, 0.1)' };
                break;
            case 'space':
                colorScheme = { main: '#9370db', shadow: 'rgba(147, 112, 219, 0.3)', secondary: 'rgba(147, 112, 219, 0.1)' };
                break;
            case 'cyberpunk2077':
                colorScheme = { 
                    main: '#fcee0a', // Неоново-желтый
                    shadow: 'rgba(252, 238, 10, 0.3)', 
                    secondary: '#00ffff', // Голубой 
                    accent: '#ff00ff'  // Розовый
                };
                break;
            default:
                colorScheme = { main: '#0f0', shadow: 'rgba(0, 255, 0, 0.3)', secondary: 'rgba(0, 255, 0, 0.1)' };
        }
        
        // Обновление цветов Three.js материалов
        if (gridMaterial) {
            gridMaterial.color = cssToThreeColor(colorScheme.secondary);
        }
        if (particlesMaterial) {
            particlesMaterial.color = cssToThreeColor(colorScheme.main);
        }
        
        // Обновление цветов материалов геометрических объектов
        geometricObjects.forEach(obj => {
            if (obj.material) {
                obj.material.color = cssToThreeColor(colorScheme.main);
            }
        });
    }
    
    // Остановка анимации
    function stop() {
        isActive = false;
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Очищаем все активные таймеры
        clearAllTimers();
    }
    
    // Продолжение анимации
    function resume() {
        if (!isActive) {
            isActive = true;
            if (animationId === null) {
                animate();
            }
        }
    }
    
    // Функция для очистки всех таймеров
    function clearAllTimers() {
        // Очищаем все активные таймеры
        activeTimers.forEach(timer => {
            clearTimeout(timer);
        });
        activeTimers = [];
    }
    
    // Очистка ресурсов
    function cleanup() {
        // Останавливаем анимацию
        stop();
        
        // Удаляем обработчик события resize
        window.removeEventListener('resize', resize);
        
        // Очищаем все таймеры
        clearAllTimers();
        
        // Освобождение ресурсов Three.js
        if (scene) {
            scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            disposeMaterial(material);
                        });
                    } else {
                        disposeMaterial(object.material);
                    }
                }
            });
            
            scene.remove(grid);
            scene.remove(particles);
            
            // Удаление геометрических объектов
            geometricObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) disposeMaterial(obj.material);
            });
            geometricObjects = [];
            
            if (grid && grid.geometry) grid.geometry.dispose();
            if (grid && grid.material) disposeMaterial(grid.material);
            if (particles && particles.geometry) particles.geometry.dispose();
            if (particles && particles.material) disposeMaterial(particles.material);
            
            if (composer) {
                composer.dispose();
            }
            
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
                renderer.domElement = null;
            }
            
            scene = null;
            camera = null;
            renderer = null;
            composer = null;
            bloomPass = null;
            glitchPass = null;
        }
    }
    
    // Вспомогательная функция для освобождения материалов
    function disposeMaterial(material) {
        if (!material) return;
        
        // Освобождаем текстуры
        if (material.map) material.map.dispose();
        if (material.lightMap) material.lightMap.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.specularMap) material.specularMap.dispose();
        if (material.envMap) material.envMap.dispose();
        
        // Освобождаем сам материал
        material.dispose();
    }
    
    // Публичный API
    return {
        init: init,
        setColorScheme: setColorScheme,
        stop: stop,
        resume: resume,
        cleanup: cleanup,
        triggerGlitchEffect: triggerGlitchEffect,
        trigger3DMergeEffect: trigger3DMergeEffect
    };
})();

// Визуальные эффекты для игровых событий
const GameEffects = (function() {
    const MAX_CONCURRENT_EFFECTS = 5;
    let activeEffectsCount = 0;

    function mergeEffect(x, y, size, ctx) {
        if (activeEffectsCount >= MAX_CONCURRENT_EFFECTS) return;
        activeEffectsCount++;

        // Вызываем 3D эффект слияния если доступен
        if (MatrixEffect && typeof MatrixEffect.trigger3DMergeEffect === 'function') {
            MatrixEffect.trigger3DMergeEffect(x, y);
        }

        // Оригинальный 2D эффект для совместимости
        const particles = [];
        const particleCount = 20;
        let animationId = null;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: x,
                y: y,
                radius: Math.random() * 3 + 1,
                color: document.body.classList.contains('cyber') ? '#0ff' : 
                       document.body.classList.contains('neon') ? '#f0f' : '#0f0',
                velocity: {
                    x: (Math.random() - 0.5) * 5,
                    y: (Math.random() - 0.5) * 5
                },
                alpha: 1
            });
        }

        function animateParticles() {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Создаем новый массив только с видимыми частицами
            const visibleParticles = [];

            particles.forEach((p) => {
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.alpha -= 0.02;

                if (p.alpha > 0) {
                    visibleParticles.push(p);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
                    ctx.fill();
                }
            });
            ctx.restore();

            // Обновляем массив частиц
            particles.length = 0;
            particles.push(...visibleParticles);

            if (particles.length > 0) {
                animationId = requestAnimationFrame(animateParticles);
            } else {
                activeEffectsCount--;
                animationId = null;
            }
        }

        animateParticles();

        return function stopEffect() {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
                activeEffectsCount--;
            }
        };
    }

    function disintegrationEffect(ctx, x, y) {
        if (activeEffectsCount >= MAX_CONCURRENT_EFFECTS) return;
        activeEffectsCount++;

        // Вызываем glitch-эффект если доступен
        if (MatrixEffect && typeof MatrixEffect.triggerGlitchEffect === 'function') {
            MatrixEffect.triggerGlitchEffect(800);
        }

        const centerX = x;
        const centerY = y;
        const maxRadius = 300;
        let radius = 0;
        const ringWidth = 5;
        let animationId = null;

        function animateWave() {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.lineWidth = ringWidth;
            const gradient = ctx.createRadialGradient(
                centerX, centerY, radius - ringWidth,
                centerX, centerY, radius + ringWidth
            );
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.strokeStyle = gradient;
            ctx.stroke();

            ctx.restore();

            radius += 10;

            if (radius < maxRadius) {
                animationId = requestAnimationFrame(animateWave);
            } else {
                activeEffectsCount--;
                animationId = null;
            }
        }

        animateWave();

        return function stopEffect() {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
                activeEffectsCount--;
            }
        };
    }

    function bombEffect(x, y, ctx, width, height) {
        if (activeEffectsCount >= MAX_CONCURRENT_EFFECTS) return;
        activeEffectsCount++;

        // Вызываем glitch-эффект с более длительной продолжительностью
        if (MatrixEffect && typeof MatrixEffect.triggerGlitchEffect === 'function') {
            MatrixEffect.triggerGlitchEffect(1500);
        }

        // Вызываем 3D эффект слияния с более интенсивными параметрами
        if (MatrixEffect && typeof MatrixEffect.trigger3DMergeEffect === 'function') {
            // Вызываем в нескольких точках для эффекта взрыва
            const explosionRadius = width / 6;
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * explosionRadius;
                const explosionX = x + Math.cos(angle) * distance;
                const explosionY = y + Math.sin(angle) * distance;
                
                setTimeout(() => {
                    MatrixEffect.trigger3DMergeEffect(explosionX, explosionY);
                }, i * 100); // Задержка для каждой последующей точки
            }
        }

        let radius = 0;
        const maxRadius = width / 3;
        const explosionSpeed = 15;
        let animationId = null;

        function animateExplosion() {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                x, y, radius * 0.8,
                x, y, radius
            );
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.restore();

            radius += explosionSpeed;

            if (radius < maxRadius) {
                animationId = requestAnimationFrame(animateExplosion);
            } else {
                activeEffectsCount--;
                animationId = null;
            }
        }

        animateExplosion();

        return function stopEffect() {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
                activeEffectsCount--;
            }
        };
    }

    function stopAllEffects() {
        activeEffectsCount = 0;
    }

    return {
        mergeEffect: mergeEffect,
        disintegrationEffect: disintegrationEffect,
        bombEffect: bombEffect,
        stopAllEffects: stopAllEffects
    };
})();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    // Экспортируем объекты в глобальную область видимости
    window.MatrixEffect = MatrixEffect;
    window.GameEffects = GameEffects;
    
    // Инициализируем эффект
    MatrixEffect.init();
});

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', function(event) {
    // Важно! Не возвращать true и не используем event.returnValue
    // чтобы избежать ошибки с асинхронным ответом
    if (window.MatrixEffect) {
        window.MatrixEffect.cleanup();
    }
    if (window.GameEffects) {
        window.GameEffects.stopAllEffects();
    }
});