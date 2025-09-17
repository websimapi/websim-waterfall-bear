import * as THREE from 'three';
import { audioManager } from './audio.js';

const LANES = [-1.5, 0, 1.5];
const FISH_LANE_OFFSETS = [-0.2, 0, 0.2];

class Player {
    constructor(scene) {
        this.currentLane = 1;
        
        const loader = new THREE.TextureLoader();
        const texture = loader.load('bear.png');
        
        const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.y = 1.75;
        this.mesh.position.z = 2.5;
        this.updatePosition();
        scene.add(this.mesh);
    }

    move(direction) {
        const targetLane = this.currentLane + direction;
        if (targetLane >= 0 && targetLane < LANES.length) {
            this.currentLane = targetLane;
            this.updatePosition();
        }
    }

    updatePosition() {
        this.mesh.position.x = LANES[this.currentLane];
    }

    reset() {
        this.currentLane = 1;
        this.updatePosition();
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.position.y = 1.75;
    }
}

class Fish {
    constructor(scene, onMiss) {
        this.scene = scene;
        this.onMiss = onMiss;

        const loader = new THREE.TextureLoader();
        const texture = loader.load('fish.png');
        const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
        const geometry = new THREE.BoxGeometry(1, 0.5, 0.5);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.active = false;
    }

    spawn() {
        this.lane = Math.floor(Math.random() * 3);
        const laneOffset = FISH_LANE_OFFSETS[this.lane];

        this.mesh.position.set(LANES[this.lane] + laneOffset, -2, -2);
        this.mesh.rotation.set(0, 0, 0);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            7 + Math.random() * 2,
            5 + Math.random() * 2
        );
        this.gravity = new THREE.Vector3(0, -9.8, 0);

        this.scene.add(this.mesh);
        this.active = true;
        audioManager.playSound('jump');
    }

    update(deltaTime) {
        if (!this.active) return;

        this.velocity.add(this.gravity.clone().multiplyScalar(deltaTime));
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        this.mesh.rotation.x += deltaTime * 2;
        this.mesh.rotation.y += deltaTime * 2;

        if (this.mesh.position.y < -5) {
            this.despawn(true); // Missed
        }
    }

    despawn(missed = false) {
        if (!this.active) return;
        this.active = false;
        this.scene.remove(this.mesh);
        if (missed) {
            this.onMiss();
        }
    }
}

export class Game {
    constructor(scene) {
        this.scene = scene;
        this.state = 'INIT';
        this.player = new Player(scene);
        this.fish = null;

        this.createEnvironment();
    }

    createEnvironment() {
        // Platform
        const loader = new THREE.TextureLoader();
        const rockTexture = loader.load('rock.png');
        rockTexture.wrapS = THREE.RepeatWrapping;
        rockTexture.wrapT = THREE.RepeatWrapping;
        rockTexture.repeat.set(4, 2);
        
        const platformGeo = new THREE.BoxGeometry(6, 2, 4);
        const platformMat = new THREE.MeshLambertMaterial({ map: rockTexture });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = 0;
        platform.position.z = 2;
        platform.receiveShadow = true;
        this.scene.add(platform);

        // Waterfall
        const waterGeo = new THREE.PlaneGeometry(6, 20);
        const waterMat = new THREE.MeshLambertMaterial({ color: 0x3399ff, transparent: true, opacity: 0.8 });
        const waterfall = new THREE.Mesh(waterGeo, waterMat);
        waterfall.rotation.x = -Math.PI / 3;
        waterfall.position.set(0, -5, -2);
        this.scene.add(waterfall);
    }

    reset(callbacks) {
        this.state = 'PLAYING';
        this.score = 0;
        this.streak = 0;
        this.callbacks = callbacks;
        this.player.reset();

        if (this.fish && this.fish.active) {
            this.fish.despawn();
        }
        this.fish = null;
        this.nextSpawnTime = 1;
    }

    update(deltaTime) {
        if (this.state !== 'PLAYING') return;

        // Player fall animation
        if (this.fallInfo) {
            this.player.mesh.position.y += this.fallInfo.velocity * deltaTime;
            this.player.mesh.rotation.z += this.fallInfo.rotation * deltaTime;
            this.fallInfo.velocity -= 9.8 * deltaTime;

            if(this.player.mesh.position.y < -10) {
                this.state = 'GAME_OVER';
                this.callbacks.onGameOver(this.score);
            }
            return;
        }

        // Fish spawning
        this.nextSpawnTime -= deltaTime;
        if (this.nextSpawnTime <= 0 && !this.fish) {
            this.spawnFish();
        }
        
        if (this.fish) {
            this.fish.update(deltaTime);
            this.checkCollision();
        }
    }

    spawnFish() {
        this.fish = new Fish(this.scene, () => this.handleMiss());
        this.fish.spawn();
        this.nextSpawnTime = Math.max(0.5, 2 - (this.score * 0.05));
    }
    
    checkCollision() {
        if (!this.fish || !this.fish.active) return;

        const fishBox = new THREE.Box3().setFromObject(this.fish.mesh);
        const playerBox = new THREE.Box3().setFromObject(this.player.mesh);

        if (playerBox.intersectsBox(fishBox)) {
            this.handleCatch();
        }
    }

    handleCatch() {
        this.score++;
        this.streak++;
        this.callbacks.onScoreChange(this.score);
        this.callbacks.onStreakChange(this.streak);
        audioManager.playSound('catch');
        
        if (this.fish) {
            this.fish.despawn(false);
            this.fish = null;
        }
    }
    
    handleMiss() {
        if (this.state !== 'PLAYING') return;
        this.streak = 0;
        this.callbacks.onStreakChange(this.streak);
        
        if (this.fish && this.fish.active) {
            // Only trigger game over if the missed fish was in the player's lane
            if (this.fish.lane === this.player.currentLane) {
                this.gameOver();
            } else {
                 this.fish.despawn(false); // Despawn without triggering game over
                 this.fish = null;
            }
        }
    }

    gameOver() {
        if (this.state !== 'PLAYING') return;
        this.state = 'FALLING';
        audioManager.playSound('miss');
        if (this.fish) {
            this.fish.despawn(false);
            this.fish = null;
        }
        
        // Setup fall animation
        this.fallInfo = {
            velocity: 0,
            rotation: (Math.random() - 0.5) * 5
        };
    }
}

