// 게임 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 상태
const game = {
    isRunning: true,
    isPaused: false,
    inBattle: false,
    hitBy: null // 누가 맞췄는지 추적
};

// 장애물 클래스
class Obstacle {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'box' or 'barrel'
    }

    draw() {
        if (this.type === 'box') {
            // 나무 상자
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // 상자 무늬
            ctx.strokeStyle = '#654321';
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y + 5);
            ctx.lineTo(this.x + this.width - 5, this.y + this.height - 5);
            ctx.moveTo(this.x + this.width - 5, this.y + 5);
            ctx.lineTo(this.x + 5, this.y + this.height - 5);
            ctx.stroke();
        } else {
            // 배럴
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width/2, this.y + this.height/2,
                       this.width/2, this.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#505050';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 배럴 링
            ctx.strokeStyle = '#404040';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width/2, this.y + this.height/2,
                       this.width/3, this.height/3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    checkCollision(obj) {
        return obj.x < this.x + this.width &&
               obj.x + obj.width > this.x &&
               obj.y < this.y + this.height &&
               obj.y + obj.height > this.y;
    }

    checkBulletCollision(bullet) {
        const dist = Math.sqrt((bullet.x - (this.x + this.width/2)) ** 2 +
                               (bullet.y - (this.y + this.height/2)) ** 2);
        return dist < bullet.radius + Math.min(this.width, this.height)/2;
    }
}

// 장애물 생성 함수
function generateObstacles() {
    const obstacles = [];
    const numObstacles = 8 + Math.floor(Math.random() * 5); // 8-12개

    for (let i = 0; i < numObstacles; i++) {
        let x, y, width, height, type;
        let attempts = 0;
        let validPosition = false;

        while (!validPosition && attempts < 50) {
            type = Math.random() > 0.5 ? 'box' : 'barrel';
            width = type === 'box' ? 40 : 35;
            height = type === 'box' ? 40 : 35;

            x = 100 + Math.random() * (canvas.width - 200);
            y = 50 + Math.random() * (canvas.height - 100);

            // 시작 위치와 너무 가까우면 안됨
            const tooCloseToStart =
                (x < 200 && y > canvas.height/2 - 100 && y < canvas.height/2 + 100) ||
                (x > canvas.width - 200 && y > canvas.height/2 - 100 && y < canvas.height/2 + 100);

            if (!tooCloseToStart) {
                validPosition = true;
                // 다른 장애물과 겹치지 않는지 확인
                for (let obs of obstacles) {
                    if (Math.abs(x - obs.x) < width + 20 && Math.abs(y - obs.y) < height + 20) {
                        validPosition = false;
                        break;
                    }
                }
            }
            attempts++;
        }

        if (validPosition) {
            obstacles.push(new Obstacle(x, y, width, height, type));
        }
    }

    return obstacles;
}

// 탱크 클래스
class Tank {
    constructor(x, y, color, controls, playerNum, isAI = false) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.speed = 1.5; // 속도 대폭 감소
        this.controls = controls;
        this.playerNum = playerNum;
        this.hp = 100;
        this.maxHp = 100;
        this.rotation = 0; // 탱크 몸체 회전
        this.turretRotation = 0; // 포탑 회전 (별도)
        this.isMoving = false;
        this.isAI = isAI;
        this.aiChangeDirectionTimer = 0;
        this.aiDirectionChangeInterval = 60;
        this.aiStrategy = 'hunt'; // 'hunt', 'dodge', 'strafe'
        this.aiStrategyTimer = 0;
        this.aiStuckTimer = 0; // 막혔을 때 타이머
        this.aiLastX = x;
        this.aiLastY = y;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 탱크 바디는 이동 방향으로 회전
        ctx.rotate(this.rotation);

        // 탱크 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width, this.height);

        // 탱크 트랙 (무한궤도)
        ctx.fillStyle = '#222';
        ctx.fillRect(-this.width / 2 - 2, -this.height / 2, 4, this.height); // 왼쪽 트랙
        ctx.fillRect(this.width / 2 - 2, -this.height / 2, 4, this.height); // 오른쪽 트랙

        // 트랙 디테일
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        for (let i = -this.height/2; i < this.height/2; i += 5) {
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 - 2, i);
            ctx.lineTo(-this.width / 2 + 2, i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.width / 2 - 2, i);
            ctx.lineTo(this.width / 2 + 2, i);
            ctx.stroke();
        }

        // 탱크 메인 바디
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2 + 3, -this.height / 2 + 5, this.width - 6, this.height - 10);

        // 탱크 바디 테두리
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2 + 3, -this.height / 2 + 5, this.width - 6, this.height - 10);

        ctx.restore();

        // 포탑은 별도 회전 (마우스/AI 조준 방향)
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.turretRotation);

        // 탱크 포탑 (더 크고 현실적으로)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 탱크 포신 (대포)
        ctx.fillStyle = '#333';
        ctx.fillRect(-3, -28, 6, 28);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-3, -28, 6, 28);

        // 포탑 상단 해치
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
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

    move(keys, obstacles = []) {
        let dx = 0;
        let dy = 0;
        this.isMoving = false;

        // 대각선 이동 지원
        if (keys[this.controls.up]) {
            dy = -this.speed;
            this.isMoving = true;
        }
        if (keys[this.controls.down]) {
            dy = this.speed;
            this.isMoving = true;
        }
        if (keys[this.controls.left]) {
            dx = -this.speed;
            this.isMoving = true;
        }
        if (keys[this.controls.right]) {
            dx = this.speed;
            this.isMoving = true;
        }

        // 대각선 이동 시 속도 정규화 (√2로 나눔)
        if (dx !== 0 && dy !== 0) {
            const diagonal = Math.sqrt(2);
            dx /= diagonal;
            dy /= diagonal;
        }

        // 이동 방향으로 탱크 바디 회전
        if (dx !== 0 || dy !== 0) {
            this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        }

        // 새 위치 계산
        const newX = this.x + dx;
        const newY = this.y + dy;

        // 경계 체크
        if (newX < 0 || newX > canvas.width - this.width) return;
        if (newY < 0 || newY > canvas.height - this.height) return;

        // 장애물 충돌 체크
        const tempTank = { x: newX, y: newY, width: this.width, height: this.height };
        for (let obstacle of obstacles) {
            if (obstacle.checkCollision(tempTank)) {
                return; // 충돌하면 이동 취소
            }
        }

        // 충돌이 없으면 이동
        this.x = newX;
        this.y = newY;
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        updateHealthDisplay();

        if (this.hp <= 0) {
            endGame(this.playerNum === 1 ? 2 : 1);
        }
    }

    // AI 전략적 이동 로직
    moveAI(target, obstacles = []) {
        this.aiChangeDirectionTimer++;
        this.aiStrategyTimer++;

        // 전략 변경 (5초마다)
        if (this.aiStrategyTimer > 300) {
            this.aiStrategyTimer = 0;
            const strategies = ['hunt', 'dodge', 'strafe'];
            this.aiStrategy = strategies[Math.floor(Math.random() * strategies.length)];
        }

        // 막혔는지 감지 (3프레임 동안 위치 변화 없음)
        const moved = Math.abs(this.x - this.aiLastX) > 0.1 || Math.abs(this.y - this.aiLastY) > 0.1;
        if (!moved) {
            this.aiStuckTimer++;
            if (this.aiStuckTimer > 3) {
                // 막혔으면 90도 회전해서 다른 방향으로
                this.aiStrategy = 'dodge';
                this.aiStrategyTimer = 0;
                this.aiStuckTimer = 0;
            }
        } else {
            this.aiStuckTimer = 0;
        }
        this.aiLastX = this.x;
        this.aiLastY = this.y;

        let dx = 0;
        let dy = 0;
        this.isMoving = false;

        const distX = target.x - this.x;
        const distY = target.y - this.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // 적을 향해 포탑 회전 (항상)
        this.turretRotation = Math.atan2(distY, distX);

        // 전략에 따른 이동
        if (this.aiStrategy === 'hunt') {
            // 적에게 접근
            if (distance > 200) {
                // 직선으로 접근 (대각선 포함)
                dx = (distX / distance) * this.speed;
                dy = (distY / distance) * this.speed;
            }
            this.isMoving = distance > 200;
        } else if (this.aiStrategy === 'dodge') {
            // 좌우로 회피하면서 이동
            const perpAngle = Math.atan2(distY, distX) + Math.PI / 2;
            if (Math.random() > 0.5) {
                dx = Math.cos(perpAngle) * this.speed;
                dy = Math.sin(perpAngle) * this.speed;
            } else {
                dx = Math.cos(perpAngle - Math.PI) * this.speed;
                dy = Math.sin(perpAngle - Math.PI) * this.speed;
            }
            this.isMoving = true;
        } else if (this.aiStrategy === 'strafe') {
            // 원을 그리며 이동
            const circleAngle = Math.atan2(distY, distX) + Math.PI / 2;
            dx = Math.cos(circleAngle) * this.speed;
            dy = Math.sin(circleAngle) * this.speed;
            this.isMoving = true;
        }

        // 이동 방향으로 탱크 바디 회전
        if (dx !== 0 || dy !== 0) {
            this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        }

        // 새 위치 계산
        const newX = this.x + dx;
        const newY = this.y + dy;

        // 경계 체크 - 막히면 다른 방향으로
        if (newX < 0 || newX > canvas.width - this.width ||
            newY < 0 || newY > canvas.height - this.height) {
            this.aiStrategy = 'dodge';
            this.aiStrategyTimer = 0;
            return;
        }

        // 장애물 충돌 체크
        const tempTank = { x: newX, y: newY, width: this.width, height: this.height };
        for (let obstacle of obstacles) {
            if (obstacle.checkCollision(tempTank)) {
                // 충돌 시 우회 시도 - 좌우 중 하나로 이동
                const avoidAngle = Math.atan2(dy, dx) + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                const avoidX = this.x + Math.cos(avoidAngle) * this.speed;
                const avoidY = this.y + Math.sin(avoidAngle) * this.speed;

                const avoidTank = { x: avoidX, y: avoidY, width: this.width, height: this.height };
                let canAvoid = true;

                // 우회 경로도 막혔는지 확인
                for (let obs of obstacles) {
                    if (obs.checkCollision(avoidTank)) {
                        canAvoid = false;
                        break;
                    }
                }

                if (canAvoid && avoidX >= 0 && avoidX <= canvas.width - this.width &&
                    avoidY >= 0 && avoidY <= canvas.height - this.height) {
                    // 우회 가능하면 우회
                    this.x = avoidX;
                    this.y = avoidY;
                    this.rotation = Math.atan2(Math.sin(avoidAngle), Math.cos(avoidAngle)) + Math.PI / 2;
                }
                return;
            }
        }

        // 충돌이 없으면 이동
        this.x = newX;
        this.y = newY;
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

// 장애물 생성
const obstacles = generateObstacles();

// 키보드 입력
const keys = {};

document.addEventListener('keydown', (e) => {
    // 방향키와 스페이스바 스크롤 방지
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    keys[e.key] = true;

    // 스페이스바로 대포 발사
    if (e.key === ' ' && !game.isPaused) {
        shootBullet(player1);
    }
});

document.addEventListener('keyup', (e) => {
    // 방향키 스크롤 방지
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    keys[e.key] = false;
});

// 마우스 위치 추적
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 플레이어 포탑을 마우스 방향으로 회전
    const dx = mouseX - (player1.x + player1.width / 2);
    const dy = mouseY - (player1.y + player1.height / 2);
    player1.turretRotation = Math.atan2(dy, dx);
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
        const bullet = new Bullet(bulletX, bulletY, tank.turretRotation, tank.playerNum);
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

    let result = '';
    let winner = 0;

    // 누가 대포를 맞췄는지 확인 (1: 플레이어가 맞춤, 2: AI가 맞춤)
    const attacker = game.hitBy;
    const victim = attacker === 1 ? 2 : 1;

    if (p1Choice === p2Choice) {
        // 무승부: 맞춘 캐릭에게 체력 +5
        result = `무승부! AI는 ${choiceEmoji[p2Choice]}를 선택! 맞춘 쪽에게 체력 +5!`;
        if (attacker === 1) {
            player1.hp = Math.min(player1.maxHp, player1.hp + 5);
            result = `무승부! AI는 ${choiceEmoji[p2Choice]}를 선택! 플레이어 체력 +5!`;
        } else {
            player2.hp = Math.min(player2.maxHp, player2.hp + 5);
            result = `무승부! AI는 ${choiceEmoji[p2Choice]}를 선택! AI 체력 +5!`;
        }
        updateHealthDisplay();
        rpsResult.className = 'rps-result draw';
    } else if (
        (p1Choice === 'rock' && p2Choice === 'scissors') ||
        (p1Choice === 'scissors' && p2Choice === 'paper') ||
        (p1Choice === 'paper' && p2Choice === 'rock')
    ) {
        // 플레이어 승리
        winner = 1;
        if (attacker === 1) {
            // 맞춘 캐릭(플레이어)이 이김 -> 맞은 캐릭(AI) 10 추가 데미지
            result = `플레이어 승리! AI는 ${choiceEmoji[p2Choice]}를 선택! AI에게 10 추가 데미지!`;
            player2.takeDamage(10);
        } else {
            // 맞은 캐릭(플레이어)이 이김 -> 추가 효과 없음
            result = `플레이어 승리! AI는 ${choiceEmoji[p2Choice]}를 선택!`;
        }
        rpsResult.className = 'rps-result win';
    } else {
        // AI 승리
        winner = 2;
        if (attacker === 2) {
            // 맞춘 캐릭(AI)이 이김 -> 맞은 캐릭(플레이어) 10 추가 데미지
            result = `AI 승리! AI는 ${choiceEmoji[p2Choice]}를 선택! 플레이어에게 10 추가 데미지!`;
            player1.takeDamage(10);
        } else {
            // 맞은 캐릭(AI)이 이김 -> 추가 효과 없음
            result = `AI 승리! AI는 ${choiceEmoji[p2Choice]}를 선택!`;
        }
        rpsResult.className = 'rps-result lose';
    }

    rpsResult.innerHTML = result;

    // 2초 후 모달 닫고 게임 재시작
    setTimeout(() => {
        rpsModal.classList.remove('active');
        game.isPaused = false;
        game.inBattle = false;
        game.hitBy = null; // 리셋

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
    player1.turretRotation = 0;

    // AI를 원래 시작 위치로 리셋
    player2.x = canvas.width - 140;
    player2.y = canvas.height / 2 - 20;
    player2.rotation = 0;
    player2.turretRotation = Math.PI; // AI는 왼쪽 방향
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

    // 장애물 그리기
    obstacles.forEach(obstacle => obstacle.draw());

    if (!game.isPaused) {
        // 탱크 이동 (장애물 전달)
        player1.move(keys, obstacles);

        // AI 이동
        if (player2.isAI) {
            player2.moveAI(player1, obstacles);

            // AI 자동 발사
            aiShootTimer++;
            if (aiShootTimer > aiShootInterval) {
                aiShootTimer = 0;
                shootBullet(player2);
            }
        } else {
            player2.move(keys, obstacles);
        }

        // 대포 업데이트
        bullets.forEach(bullet => {
            if (bullet.active) {
                bullet.update();

                // 장애물과 충돌 확인
                for (let obstacle of obstacles) {
                    if (obstacle.checkBulletCollision(bullet)) {
                        bullet.active = false;
                        break;
                    }
                }

                // 대포가 탱크에 맞았는지 확인
                if (bullet.owner === 1 && bullet.checkHit(player2)) {
                    bullet.active = false;
                    if (!game.inBattle) {
                        // 대포 맞으면 10 체력 감소
                        player2.takeDamage(10);
                        // 누가 맞췄는지 기록
                        game.hitBy = 1;
                        startRPSBattle();
                    }
                } else if (bullet.owner === 2 && bullet.checkHit(player1)) {
                    bullet.active = false;
                    if (!game.inBattle) {
                        // 대포 맞으면 10 체력 감소
                        player1.takeDamage(10);
                        // 누가 맞췄는지 기록
                        game.hitBy = 2;
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
