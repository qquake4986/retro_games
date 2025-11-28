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
    constructor(x, y, color, controls, playerNum, isAI = false) {
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
        this.isAI = isAI;
        this.aiChangeDirectionTimer = 0;
        this.aiDirectionChangeInterval = 60; // 프레임 단위
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

    // AI 이동 로직
    moveAI(target) {
        this.aiChangeDirectionTimer++;

        let dx = 0;
        let dy = 0;
        this.isMoving = false;

        // 타겟을 향해 이동 (80% 확률) 또는 랜덤 이동 (20% 확률)
        const shouldChase = Math.random() > 0.2;

        if (shouldChase) {
            // 플레이어를 추적
            const distX = target.x - this.x;
            const distY = target.y - this.y;

            // 더 큰 차이가 있는 축으로 이동
            if (Math.abs(distX) > Math.abs(distY)) {
                if (distX > 0) {
                    dx = this.speed;
                    this.rotation = Math.PI / 2;
                } else {
                    dx = -this.speed;
                    this.rotation = -Math.PI / 2;
                }
            } else {
                if (distY > 0) {
                    dy = this.speed;
                    this.rotation = Math.PI;
                } else {
                    dy = -this.speed;
                    this.rotation = 0;
                }
            }
            this.isMoving = true;
        } else {
            // 가끔 랜덤하게 움직임
            const randomDir = Math.floor(Math.random() * 4);
            switch(randomDir) {
                case 0: // 위
                    dy = -this.speed;
                    this.rotation = 0;
                    break;
                case 1: // 아래
                    dy = this.speed;
                    this.rotation = Math.PI;
                    break;
                case 2: // 왼쪽
                    dx = -this.speed;
                    this.rotation = -Math.PI / 2;
                    break;
                case 3: // 오른쪽
                    dx = this.speed;
                    this.rotation = Math.PI / 2;
                    break;
            }
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
}

// 대포 클래스
class Bullet {
    constructor(x, y, angle, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.radius = 5;
        this.owner = owner; // 누가 쏜 대포인지
        this.active = true;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // 화면 밖으로 나가면 비활성화
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.owner === 1 ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    checkHit(target) {
        const dist = Math.sqrt((this.x - (target.x + target.width/2)) ** 2 +
                               (this.y - (target.y + target.height/2)) ** 2);
        return dist < this.radius + target.width/2;
    }
}

// 플레이어 생성
const player1 = new Tank(100, canvas.height / 2 - 20, '#fa709a', {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
}, 1); // 플레이어 (방향키 사용) - 빨간색

const player2 = new Tank(canvas.width - 140, canvas.height / 2 - 20, '#4facfe', {}, 2, true); // AI - 파란색

// 대포 배열
let bullets = [];
let lastShootTime = {
    player1: 0,
    player2: 0
};
const shootCooldown = 500; // 0.5초 쿨다운

// 키보드 입력
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // 스페이스바로 대포 발사
    if (e.key === ' ' && !game.isPaused) {
        e.preventDefault();
        shootBullet(player1);
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 대포 발사 함수
function shootBullet(tank) {
    const currentTime = Date.now();
    const playerKey = tank === player1 ? 'player1' : 'player2';

    if (currentTime - lastShootTime[playerKey] > shootCooldown) {
        lastShootTime[playerKey] = currentTime;

        // 탱크 중앙에서 포탑 방향으로 대포 생성
        const bulletX = tank.x + tank.width / 2;
        const bulletY = tank.y + tank.height / 2;
        const bullet = new Bullet(bulletX, bulletY, tank.rotation, tank.playerNum);
        bullets.push(bullet);
    }
}

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
    document.getElementById('p2-choice').textContent = '???';

    updateGameStatus('⚔️ 가위바위보 대결!');

    // AI가 자동으로 선택 (즉시, 보이지 않게)
    const aiChoices = ['rock', 'paper', 'scissors'];
    const aiChoice = aiChoices[Math.floor(Math.random() * aiChoices.length)];
    rpsChoices.player2 = aiChoice;
    // AI 선택은 표시하지 않음 (비밀로 유지)
}

function resolveRPS() {
    const p1Choice = rpsChoices.player1;
    const p2Choice = rpsChoices.player2;

    // AI가 선택한 것 표시
    const choiceEmoji = {
        rock: '✊ 바위',
        paper: '✋ 보',
        scissors: '✌️ 가위'
    };
    document.getElementById('p2-choice').textContent = choiceEmoji[p2Choice];

    const damages = {
        rock: 30,      // 강한 공격
        scissors: 20,  // 빠른 공격
        paper: 10      // 방어막
    };

    let result = '';
    let winner = 0;

    if (p1Choice === p2Choice) {
        result = `무승부! AI는 ${choiceEmoji[p2Choice]}를 선택! 10 데미지씩!`;
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
        result = `플레이어 승리! AI는 ${choiceEmoji[p2Choice]}를 선택! ${damage} 데미지!`;
        player2.takeDamage(damage);
        rpsResult.className = 'rps-result win';
    } else {
        winner = 2;
        const damage = damages[p2Choice];
        result = `AI 승리! AI는 ${choiceEmoji[p2Choice]}를 선택! ${damage} 데미지!`;
        player1.takeDamage(damage);
        rpsResult.className = 'rps-result lose';
    }

    rpsResult.innerHTML = result;

    // 2초 후 모달 닫고 원래 위치로 리셋
    setTimeout(() => {
        rpsModal.classList.remove('active');
        game.isPaused = false;
        game.inBattle = false;

        // 탱크를 원래 시작 위치로 리셋
        resetTanksToStart();

        updateGameStatus('스페이스바로 대포 발사!');
    }, 2000);
}

function resetTanksToStart() {
    // 플레이어를 원래 시작 위치로 리셋
    player1.x = 100;
    player1.y = canvas.height / 2 - 20;
    player1.rotation = 0;

    // AI를 원래 시작 위치로 리셋
    player2.x = canvas.width - 140;
    player2.y = canvas.height / 2 - 20;
    player2.rotation = 0;
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
    const winnerName = winner === 1 ? '플레이어' : 'AI';
    winnerText.textContent = `🏆 ${winnerName} 승리!`;
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
let aiShootTimer = 0;
const aiShootInterval = 60; // 약 1초마다 발사

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

        // AI 이동
        if (player2.isAI) {
            player2.moveAI(player1);

            // AI 자동 발사
            aiShootTimer++;
            if (aiShootTimer > aiShootInterval) {
                aiShootTimer = 0;
                shootBullet(player2);
            }
        } else {
            player2.move(keys);
        }

        // 대포 업데이트
        bullets.forEach(bullet => {
            if (bullet.active) {
                bullet.update();

                // 대포가 탱크에 맞았는지 확인
                if (bullet.owner === 1 && bullet.checkHit(player2)) {
                    bullet.active = false;
                    if (!game.inBattle) {
                        startRPSBattle();
                    }
                } else if (bullet.owner === 2 && bullet.checkHit(player1)) {
                    bullet.active = false;
                    if (!game.inBattle) {
                        startRPSBattle();
                    }
                }
            }
        });

        // 비활성화된 대포 제거
        bullets = bullets.filter(bullet => bullet.active);
    }

    // 탱크 그리기
    player1.draw();
    player2.draw();

    // 대포 그리기
    bullets.forEach(bullet => {
        if (bullet.active) {
            bullet.draw();
        }
    });

    requestAnimationFrame(gameLoop);
}

// 게임 시작
updateHealthDisplay();
updateGameStatus('스페이스바로 대포 발사!');
gameLoop();
