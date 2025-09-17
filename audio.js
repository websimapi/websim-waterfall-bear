class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundBuffers = {};
        this.sounds = ['catch', 'miss', 'jump'];
    }

    async init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await Promise.all(this.sounds.map(sound => this.loadSound(sound)));
    }

    async loadSound(name) {
        if (!this.audioContext) return;
        try {
            const response = await fetch(`${name}.mp3`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers[name] = audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound: ${name}`, error);
        }
    }

    playSound(name) {
        if (!this.audioContext || !this.soundBuffers[name]) {
            // If context is not ready (e.g., before user interaction), do nothing.
            return;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[name];
        source.connect(this.audioContext.destination);
        source.start(0);
    }
}

export const audioManager = new AudioManager();

