// 게임 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 상태
const game = {
    isRunning: true,
    isPaused: false,
    inBattle: false
};

// 탱크 클래스
class Tank {
    constructor(x, y, color, controls, playerNum) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.speed = 3;
        this.controls = controls;
        this.playerNum = playerNum;
        this.hp = 100;
        this.maxHp = 100;
        this.rotation = 0;
        this.isMoving = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // 탱크 몸체
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 탱크 테두리
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 탱크 포탑
        ctx.fillStyle = '#333';
        ctx.fillRect(-5, -25, 10, 25);

        // 탱크 해치
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // HP 바
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = this.width;
        const barHeight = 5;
        const barX = this.x;
        const barY = this.y - 10;

        // 배경
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP
        const hpWidth = (this.hp / this.maxHp) * barWidth;
        ctx.fillStyle = this.hp > 50 ? '#00ff00' : this.hp > 25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, hpWidth, barHeight);
    }

    move(keys) {
        let dx = 0;
        let dy = 0;
        this.isMoving = false;

        if (keys[this.controls.up]) {
            dy = -this.speed;
            this.rotation = 0;
            this.isMoving = true;
        }
        if (keys[this.controls.down]) {
            dy = this.speed;
            this.rotation = Math.PI;
            this.isMoving = true;
        }
        if (keys[this.controls.left]) {
            dx = -this.speed;
            this.rotation = -Math.PI / 2;
            this.isMoving = true;
        }
        if (keys[this.controls.right]) {
            dx = this.speed;
            this.rotation = Math.PI / 2;
            this.isMoving = true;
        }

        // 경계 체크
        const newX = this.x + dx;
        const newY = this.y + dy;

        if (newX >= 0 && newX <= canvas.width - this.width) {
            this.x = newX;
        }
        if (newY >= 0 && newY <= canvas.height - this.height) {
            this.y = newY;
        }
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        updateHealthDisplay();

        if (this.hp <= 0) {
            endGame(this.playerNum === 1 ? 2 : 1);
        }
    }
}

// 플레이어 생성
const player1 = new Tank(100, canvas.height / 2 - 20, '#4facfe', {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
}, 1);

const player2 = new Tank(canvas.width - 140, canvas.height / 2 - 20, '#fa709a', {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
}, 2);

// 키보드 입력
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 충돌 감지
function checkCollision(tank1, tank2) {
    return tank1.x < tank2.x + tank2.width &&
           tank1.x + tank1.width > tank2.x &&
           tank1.y < tank2.y + tank2.height &&
           tank1.y + tank1.height > tank2.y;
}

// 가위바위보 시스템
const rpsModal = document.getElementById('rps-modal');
const rpsResult = document.getElementById('rps-result');
const gameoverModal = document.getElementById('gameover-modal');
const winnerText = document.getElementById('winner-text');
const restartBtn = document.getElementById('restart-btn');

let rpsChoices = {
    player1: null,
    player2: null
};

// 가위바위보 버튼 이벤트
document.querySelectorAll('.rps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const player = btn.dataset.player;
        const choice = btn.dataset.choice;

        // 같은 플레이어의 다른 버튼 선택 해제
        document.querySelectorAll(`.rps-btn[data-player="${player}"]`).forEach(b => {
            b.classList.remove('selected');
        });

        btn.classList.add('selected');
        rpsChoices[`player${player}`] = choice;

        // 선택 표시
        const choiceEmoji = {
            rock: '✊ 바위',
            paper: '✋ 보',
            scissors: '✌️ 가위'
        };
        document.getElementById(`p${player}-choice`).textContent = choiceEmoji[choice];

        // 둘 다 선택했으면 결과 판정
        if (rpsChoices.player1 && rpsChoices.player2) {
            setTimeout(() => resolveRPS(), 500);
        }
    });
});

function startRPSBattle() {
    game.isPaused = true;
    game.inBattle = true;
    rpsModal.classList.add('active');
    rpsChoices = { player1: null, player2: null };
    rpsResult.innerHTML = '';
    rpsResult.className = 'rps-result';

    // 선택 초기화
    document.querySelectorAll('.rps-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('p1-choice').textContent = '선택 대기...';
    document.getElementById('p2-choice').textContent = '선택 대기...';

    updateGameStatus('⚔️ 가위바위보 대결!');
}

function resolveRPS() {
    const p1Choice = rpsChoices.player1;
    const p2Choice = rpsChoices.player2;

    const damages = {
        rock: 30,      // 강한 공격
        scissors: 20,  // 빠른 공격
        paper: 10      // 방어막
    };

    let result = '';
    let winner = 0;

    if (p1Choice === p2Choice) {
        result = '무승부! 10 데미지씩!';
        player1.takeDamage(10);
        player2.takeDamage(10);
        rpsResult.className = 'rps-result draw';
    } else if (
        (p1Choice === 'rock' && p2Choice === 'scissors') ||
        (p1Choice === 'scissors' && p2Choice === 'paper') ||
        (p1Choice === 'paper' && p2Choice === 'rock')
    ) {
        winner = 1;
        const damage = damages[p1Choice];
        result = `플레이어 1 승리! ${damage} 데미지!`;
        player2.takeDamage(damage);
        rpsResult.className = 'rps-result win';
    } else {
        winner = 2;
        const damage = damages[p2Choice];
        result = `플레이어 2 승리! ${damage} 데미지!`;
        player1.takeDamage(damage);
        rpsResult.className = 'rps-result lose';
    }

    rpsResult.innerHTML = result;

    // 1.5초 후 모달 닫기
    setTimeout(() => {
        rpsModal.classList.remove('active');
        game.isPaused = false;
        game.inBattle = false;

        // 탱크를 서로 밀어내기
        separateTanks();

        updateGameStatus('탱크를 움직여 충돌하세요!');
    }, 1500);
}

function separateTanks() {
    // 탱크들을 반대 방향으로 밀어냄
    const pushDistance = 60;

    if (player1.x < player2.x) {
        player1.x = Math.max(0, player1.x - pushDistance);
        player2.x = Math.min(canvas.width - player2.width, player2.x + pushDistance);
    } else {
        player1.x = Math.min(canvas.width - player1.width, player1.x + pushDistance);
        player2.x = Math.max(0, player2.x - pushDistance);
    }

    if (player1.y < player2.y) {
        player1.y = Math.max(0, player1.y - pushDistance);
        player2.y = Math.min(canvas.height - player2.height, player2.y + pushDistance);
    } else {
        player1.y = Math.min(canvas.height - player1.height, player1.y + pushDistance);
        player2.y = Math.max(0, player2.y - pushDistance);
    }
}

// UI 업데이트
function updateHealthDisplay() {
    document.getElementById('player1-hp').textContent = player1.hp;
    document.getElementById('player2-hp').textContent = player2.hp;
    document.getElementById('player1-health').style.width = `${(player1.hp / player1.maxHp) * 100}%`;
    document.getElementById('player2-health').style.width = `${(player2.hp / player2.maxHp) * 100}%`;
}

function updateGameStatus(message) {
    document.getElementById('game-status').textContent = message;
}

// 게임 오버
function endGame(winner) {
    game.isRunning = false;
    winnerText.textContent = `🏆 플레이어 ${winner} 승리!`;
    gameoverModal.classList.add('active');
}

// 게임 재시작
restartBtn.addEventListener('click', () => {
    location.reload();
});

// 배경 그리기
function drawBackground() {
    // 그리드 패턴
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;

    const gridSize = 50;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // 중앙선
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// 게임 루프
let lastCollisionTime = 0;
const collisionCooldown = 2000; // 2초 쿨다운

function gameLoop() {
    if (!game.isRunning) return;

    // 화면 지우기
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 배경 그리기
    drawBackground();

    if (!game.isPaused) {
        // 탱크 이동
        player1.move(keys);
        player2.move(keys);

        // 충돌 체크
        const currentTime = Date.now();
        if (checkCollision(player1, player2) && !game.inBattle) {
            if (currentTime - lastCollisionTime > collisionCooldown) {
                lastCollisionTime = currentTime;
                startRPSBattle();
            }
        }
    }

    // 탱크 그리기
    player1.draw();
    player2.draw();

    requestAnimationFrame(gameLoop);
}

// 게임 시작
updateHealthDisplay();
updateGameStatus('탱크를 움직여 충돌하세요!');
gameLoop();
