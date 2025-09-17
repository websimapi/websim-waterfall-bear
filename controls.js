let player, game;
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

function handleKeyDown(event) {
    if (!player || game.state !== 'PLAYING') return;
    if (event.key === 'ArrowLeft') {
        player.move(-1);
    } else if (event.key === 'ArrowRight') {
        player.move(1);
    }
}

function handlePointerDown(event) {
    if (!player || game.state !== 'PLAYING') return;
    touchStartX = event.clientX || event.touches[0].clientX;
    touchStartY = event.clientY || event.touches[0].clientY;
}

function handlePointerUp(event) {
    if (!player || game.state !== 'PLAYING' || touchStartX === 0) return;

    const touchEndX = event.clientX || event.changedTouches[0].clientX;
    const touchEndY = event.clientY || event.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal swipe
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
                player.move(1); // Swipe Right
            } else {
                player.move(-1); // Swipe Left
            }
        } else {
            // It's a tap
            handleTap(touchEndX);
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
}

function handleTap(x) {
    if (x < window.innerWidth / 2) {
        player.move(-1); // Tap Left
    } else {
        player.move(1); // Tap Right
    }
}

export function setupControls(playerInstance, gameInstance) {
    player = playerInstance;
    game = gameInstance;

    // Clear previous listeners to avoid duplicates on restart
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);

    // Add new listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
}

