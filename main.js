import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game } from './game.js';
import { setupControls } from './controls.js';
import { audioManager } from './audio.js';

let scene, camera, renderer, game;

const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const streakDisplay = document.getElementById('streak-display');

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6bb6ff);
    scene.fog = new THREE.Fog(0x6bb6ff, 10, 50);

    // Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(scene.position);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Game instance
    game = new Game(scene);

    // Event Listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    window.addEventListener('resize', onWindowResize, false);
}

function startGame() {
    audioManager.init();
    game.reset({
        onGameOver,
        onScoreChange: (score) => scoreDisplay.textContent = `SCORE: ${score}`,
        onStreakChange: (streak) => {
            streakDisplay.textContent = streak > 2 ? `🔥 ${streak}x` : '';
        }
    });
    setupControls(game.player, game);
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    scoreDisplay.textContent = 'SCORE: 0';
    streakDisplay.textContent = '';
    animate();
}

function onGameOver(score) {
    gameOverScreen.style.display = 'flex';
    finalScoreDisplay.textContent = `FINAL SCORE: ${score}`;
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -5 * aspect;
    camera.right = 5 * aspect;
    camera.top = 5;
    camera.bottom = -5;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = 0;
function animate(time = 0) {
    if (game.state === 'GAME_OVER') return;

    requestAnimationFrame(animate);

    const deltaTime = (time - lastTime) * 0.001;
    lastTime = time;

    game.update(deltaTime);
    renderer.render(scene, camera);
}

init();

