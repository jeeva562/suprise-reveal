// ===================================
// STATE MANAGEMENT
// ===================================
const gameState = {
    currentStage: 1,
    soundEnabled: true,
    puzzleComplete: false
};

// ===================================
// SOUND MANAGEMENT
// ===================================
const sounds = {
    click: () => playTone(200, 0.1),
    success: () => playTone(400, 0.2),
    complete: () => playMelody([400, 500, 600], 0.3),
    snap: () => playTone(300, 0.15)
};

function playTone(frequency, duration) {
    if (!gameState.soundEnabled) return;

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playMelody(frequencies, duration) {
    frequencies.forEach((freq, index) => {
        setTimeout(() => playTone(freq, duration), index * 200);
    });
}

// Sound toggle
document.getElementById('soundToggle')?.addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    const toggle = document.getElementById('soundToggle');
    toggle.classList.toggle('muted');
    sounds.click();
});

// ===================================
// STAGE MANAGEMENT
// ===================================
function showStage(stageNumber) {
    // Hide all stages
    document.querySelectorAll('.stage').forEach(stage => {
        stage.classList.remove('active');
    });

    // Show target stage
    const targetStage = document.getElementById(`stage${stageNumber}`);
    if (targetStage) {
        targetStage.classList.add('active');
        gameState.currentStage = stageNumber;
        updateProgressBar();
    }
}

function nextStage(stageNumber) {
    sounds.success();
    showStage(stageNumber);

    // Initialize stage-specific logic
    if (stageNumber === 2) {
        initPuzzle();
    } else if (stageNumber === 3) {
        startCountdown();
    }
}

function updateProgressBar() {
    const progress = (gameState.currentStage / 3) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
}

// ===================================
// STAGE 2: PUZZLE LOGIC
// ===================================
let puzzleState = {
    pieces: [],
    slots: [],
    draggedPiece: null
};

function initPuzzle() {
    const puzzleGrid = document.getElementById('puzzleGrid');
    const puzzlePieces = document.getElementById('puzzlePieces');

    if (!puzzleGrid || !puzzlePieces) return;

    // Clear existing content
    puzzleGrid.innerHTML = '';
    puzzlePieces.innerHTML = '';
    puzzleState.pieces = [];
    puzzleState.slots = [];

    // Explicitly hide next button during init
    const nextBtn = document.getElementById('puzzleNextBtn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
        nextBtn.classList.remove('pulse');
    }

    // Create 9 puzzle slots (3x3 grid)
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'puzzle-slot';
        slot.dataset.position = i;

        // Add drop event listeners
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragleave', handleDragLeave);

        puzzleGrid.appendChild(slot);
        puzzleState.slots.push(slot);
    }

    // Create 9 puzzle pieces with shuffled positions
    const positions = [...Array(9).keys()];
    shuffleArray(positions);

    positions.forEach((pos, index) => {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.draggable = true;
        piece.dataset.correctPosition = pos;
        piece.dataset.pieceId = index;

        // Calculate background position for the piece
        // Calculate background position for the piece (3x3 grid)
        const row = Math.floor(pos / 3);
        const col = pos % 3;
        // Using standard percentages for 3x3 grid: 0%, 50%, 100%
        const xPercent = col * 50;
        const yPercent = row * 50;
        piece.style.backgroundImage = 'url(./assets/ultrasound.png)';
        piece.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
        piece.style.backgroundSize = '300% 300%';

        // Add drag event listeners
        piece.addEventListener('dragstart', handleDragStart);
        piece.addEventListener('dragend', handleDragEnd);

        // Touch support for mobile
        piece.addEventListener('touchstart', handleTouchStart, { passive: false });
        piece.addEventListener('touchmove', handleTouchMove, { passive: false });
        piece.addEventListener('touchend', handleTouchEnd);

        puzzlePieces.appendChild(piece);
        puzzleState.pieces.push(piece);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Drag and Drop handlers
function handleDragStart(e) {
    if (this.classList.contains('placed')) return;

    puzzleState.draggedPiece = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    puzzleState.slots.forEach(slot => slot.classList.remove('highlight'));
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('highlight');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('highlight');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();

    this.classList.remove('highlight');

    const piece = puzzleState.draggedPiece;
    if (!piece) return;

    const slotPosition = parseInt(this.dataset.position);
    const correctPosition = parseInt(piece.dataset.correctPosition);

    // Check if piece is in correct position
    if (slotPosition === correctPosition) {
        placePiece(piece, this);
        sounds.snap();
    } else {
        // Wrong position - shake animation
        piece.style.animation = 'shake 0.5s';
        setTimeout(() => piece.style.animation = '', 500);
    }

    return false;
}

// Touch support for mobile
let touchPiece = null;
let touchClone = null;

function handleTouchStart(e) {
    if (this.classList.contains('placed')) return;

    e.preventDefault();
    touchPiece = this;

    // Create a clone for visual feedback
    touchClone = this.cloneNode(true);
    touchClone.style.position = 'fixed';
    touchClone.style.zIndex = '1000';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.opacity = '0.8';
    touchClone.style.width = this.offsetWidth + 'px';
    touchClone.style.height = this.offsetHeight + 'px';
    document.body.appendChild(touchClone);

    updateTouchClonePosition(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchClone) return;

    updateTouchClonePosition(e.touches[0]);
}

function handleTouchEnd(e) {
    e.preventDefault();

    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }

    if (!touchPiece) return;

    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

    if (dropTarget && dropTarget.classList.contains('puzzle-slot')) {
        const slotPosition = parseInt(dropTarget.dataset.position);
        const correctPosition = parseInt(touchPiece.dataset.correctPosition);

        if (slotPosition === correctPosition) {
            placePiece(touchPiece, dropTarget);
            sounds.snap();
        } else {
            touchPiece.style.animation = 'shake 0.5s';
            setTimeout(() => touchPiece.style.animation = '', 500);
        }
    }

    touchPiece = null;
}

function updateTouchClonePosition(touch) {
    if (!touchClone) return;

    const width = touchClone.offsetWidth;
    const height = touchClone.offsetHeight;
    touchClone.style.left = `${touch.clientX - width / 2}px`;
    touchClone.style.top = `${touch.clientY - height / 2}px`;
}

function placePiece(piece, slot) {
    // Mark slot as filled
    slot.classList.add('filled');
    slot.style.backgroundImage = piece.style.backgroundImage;
    slot.style.backgroundPosition = piece.style.backgroundPosition;
    slot.style.backgroundSize = '300% 300%';

    // Mark piece as placed
    piece.classList.add('placed');

    // Check if puzzle is complete
    checkPuzzleComplete();
}

function checkPuzzleComplete() {
    const filledSlots = document.querySelectorAll('.puzzle-slot.filled').length;

    if (filledSlots === 9) {
        gameState.puzzleComplete = true;

        sounds.complete();

        // Show success message and next button
        setTimeout(() => {
            const nextBtn = document.getElementById('puzzleNextBtn');
            if (nextBtn) {
                nextBtn.style.display = 'block';
                nextBtn.classList.add('pulse');
            }
        }, 500);
    }
}

// Hint system
function showHint() {
    const hintText = document.getElementById('hintText');
    if (hintText) {
        hintText.style.display = hintText.style.display === 'none' ? 'block' : 'none';
        sounds.click();
    }
}

// ===================================
// GENDER SELECTION
// ===================================
function selectGender(gender) {
    // Store selection in sessionStorage
    sessionStorage.setItem('userGender', gender);

    // Play sound and visual feedback
    sounds.success();

    // Add selected animation to clicked card
    const selectedCard = document.querySelector(`.gender-card[data-gender="${gender}"]`);
    if (selectedCard) {
        selectedCard.style.transform = 'scale(1.1)';
        selectedCard.style.boxShadow = '0 0 60px rgba(139, 92, 246, 0.9)';
    }

    // Transition to next stage after brief delay
    setTimeout(() => {
        nextStage(2);
    }, 500);
}

// ===================================
// STAGE 3: FINAL REVEAL
// ===================================
function startCountdown() {
    const countdownEl = document.getElementById('countdown');
    const revealContent = document.getElementById('revealContent');

    if (!countdownEl || !revealContent) return;

    // Get gender selection and update messages
    const userGender = sessionStorage.getItem('userGender');
    updateRevealMessages(userGender);

    let count = 2; // Start from 2 because 3 is already visible in HTML

    const countInterval = setInterval(() => {
        const numberEl = countdownEl.querySelector('.countdown-number');
        if (numberEl) {
            numberEl.textContent = count;
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countdownPulse 1s ease-in-out', 10);
        }

        playTone(400 + (count * 100), 0.3);

        if (count === 0) {
            clearInterval(countInterval);
            setTimeout(() => {
                countdownEl.style.display = 'none';
                revealContent.style.display = 'block';
                createConfetti();
                playMelody([500, 600, 700, 800], 0.4);
            }, 1000);
        }

        count--;
    }, 1000);
}

function createConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#f43f5e'];

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

function updateRevealMessages(gender) {
    const greetingEl = document.getElementById('revealGreeting');
    const messageEl = document.getElementById('revealMessage');

    if (!greetingEl || !messageEl) return;

    if (gender === 'male') {
        greetingEl.textContent = 'Raasa!';
        messageEl.textContent = 'Eley Ne Mama Va aaita dey';
    } else if (gender === 'female') {
        greetingEl.textContent = 'Raasathi!';
        messageEl.textContent = 'Ne Aththai uh aaita pa';
    } else {
        // Fallback to default
        greetingEl.textContent = 'Friends!';
        messageEl.textContent = 'Deii Ne Mama va aaita da';
    }
}

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    updateProgressBar();
});

// Reset function (for testing)
function resetGame() {
    location.reload();
}

// Expose reset to console for testing
window.resetGame = resetGame;


// ========================================
// RIGHT-CLICK PROTECTION & SECURITY
// ========================================

// Disable right-click context menu
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();

    // Optional: Show custom message
    showProtectionMessage('');

    return false;
});

// Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
document.addEventListener('keydown', function (e) {
    // F12 (Developer Tools)
    if (e.keyCode === 123) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }

    // Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }

    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }

    // Ctrl+Shift+C (Element Inspector)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }
});

// Disable text selection (optional)
document.addEventListener('selectstart', function (e) {
    e.preventDefault();
    return false;
});

// Disable drag and drop (allowing puzzle pieces)
document.addEventListener('dragstart', function (e) {
    if (e.target.classList.contains('puzzle-piece')) return;
    e.preventDefault();
    return false;
});

// Custom protection message display
function showProtectionMessage(message) {
    // Remove existing message if any
    const existingMessage = document.getElementById('protection-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create and show new message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'protection-message';
    messageDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        ">
            <i class="fas fa-shield-alt mr-2"></i>
            ${message}
        </div>
    `;

    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// Add CSS for the slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    /* Disable text selection globally */
    * {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    
    /* Allow selection for input fields */
    input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
    }
`;
document.head.appendChild(style);

// Advanced protection: Detect developer tools opening
let devtools = {
    open: false,
    orientation: null
};

// Check if developer tools are open
setInterval(function () {
    if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
            devtools.open = true;
            // Optional: Redirect or show warning
            showProtectionMessage('');
            // Uncomment to redirect: window.location.href = "about:blank";
        }
    } else {
        devtools.open = false;
    }
}, 500);

// Console warning message
console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold;');
console.log('%cThis is a browser feature intended for developers. Content on this page is protected.', 'color: red; font-size: 16px;');

// Disable print
window.addEventListener('beforeprint', function (e) {
    e.preventDefault();
    showProtectionMessage('');
    return false;
});

// Disable save shortcut
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
        e.preventDefault();
        showProtectionMessage('');
        return false;
    }
});

// Protection for mobile devices (allowing puzzle interactions)
document.addEventListener('touchstart', function (e) {
    if (e.target.closest('.puzzle-container')) return;
    if (e.touches.length > 1) {
        e.preventDefault(); // Disable multi-touch gestures for non-game areas
    }
});

// Disable image dragging
document.addEventListener('DOMContentLoaded', function () {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('dragstart', function (e) {
            e.preventDefault();
        });
    });
});


// ========================================
// FIREWORKS ANIMATION
// ========================================
class Firework {
    constructor(canvas, x, y) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = x;
        this.y = y;
        this.particles = [];
        this.hue = Math.random() * 360;

        this.explode();
    }

    explode() {
        const particleCount = 50 + Math.random() * 50;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(this.ctx, this.x, this.y, this.hue));
        }
    }

    update() {
        this.particles = this.particles.filter(particle => particle.alpha > 0);
        this.particles.forEach(particle => particle.update());
    }

    draw() {
        this.particles.forEach(particle => particle.draw());
    }

    isDead() {
        return this.particles.length === 0;
    }
}

class Particle {
    constructor(ctx, x, y, hue) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 2 + Math.random() * 5;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.alpha = 1;
        this.decay = 0.015 + Math.random() * 0.015;
        this.size = 2 + Math.random() * 2;
        this.brightness = 50 + Math.random() * 50;
    }

    update() {
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.vy += 0.1; // gravity
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
}

function initFireworks() {
    const canvas = document.getElementById('fireworksCanvas');
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const fireworks = [];
    let animationId;

    function animate() {
        // Use transparent background so content shows through
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Add new fireworks randomly
        if (Math.random() < 0.1) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height * 0.5;
            fireworks.push(new Firework(canvas, x, y));
        }

        // Update and draw fireworks
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update();
            fireworks[i].draw();

            if (fireworks[i].isDead()) {
                fireworks.splice(i, 1);
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Stop after 30 seconds
    setTimeout(() => {
        cancelAnimationFrame(animationId);
        canvas.style.display = 'none';
    }, 30000);

    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Start fireworks when reveal content is shown
const originalStartCountdown = startCountdown;
startCountdown = function () {
    originalStartCountdown.call(this);

    // Start fireworks after countdown
    setTimeout(() => {
        initFireworks();
    }, 4000); // Start fireworks 4 seconds after reveal
};

