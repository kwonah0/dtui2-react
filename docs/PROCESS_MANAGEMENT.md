# 🔄 프로세스 및 서비스 관리 가이드

개발 중 프로세스 관리, 포트 관리, 백그라운드 작업 제어 방법

## 📡 포트 관리

### 포트 사용 현황 확인

#### Linux/WSL/macOS
```bash
# 특정 포트 확인
lsof -i :3000
lsof -ti :3000  # PID만 출력

# 모든 리스닝 포트 확인
netstat -tlnp | grep LISTEN
ss -tlnp | grep LISTEN

# 포트 범위 확인
lsof -i :3000-3010
```

#### Windows
```cmd
# 포트 사용 현황
netstat -ano | findstr :3000

# 프로세스 정보 포함
netstat -ano | findstr LISTENING
```

### 포트 해제 방법

#### 단일 프로세스 종료
```bash
# PID로 종료
kill <PID>
kill -9 <PID>  # 강제 종료

# 포트로 직접 종료
lsof -ti:3000 | xargs kill
```

#### 여러 프로세스 한번에 종료
```bash
# 특정 포트의 모든 프로세스
lsof -ti:3000 | xargs kill -9

# 패턴으로 프로세스 찾아서 종료
pkill -f "vite"
pkill -f "node.*3000"
```

### 포트 충돌 방지

#### 다른 포트 사용
```bash
# 환경변수로 포트 변경
PORT=3001 npm run dev

# 직접 지정
npm run dev -- --port 3001
```

#### 사용 가능한 포트 찾기
```bash
# 포트 스캔
for port in {3000..3010}; do
  if ! lsof -i:$port > /dev/null; then
    echo "Port $port is available"
    break
  fi
done
```

## 🔧 백그라운드 프로세스 관리

### 백그라운드 실행 방법

#### 기본 백그라운드 실행
```bash
# & 사용
npm run dev &

# nohup 사용 (터미널 종료해도 계속 실행)
nohup npm run dev > dev.log 2>&1 &

# 스크린 세션 사용
screen -S devserver
npm run dev
# Ctrl+A, D로 detach
```

#### 프로세스 관리자 사용
```bash
# pm2 설치 및 사용
npm install -g pm2
pm2 start "npm run dev" --name "dtui2-dev"
pm2 list
pm2 stop dtui2-dev
pm2 restart dtui2-dev
```

### 백그라운드 프로세스 확인

#### 작업 목록 확인
```bash
# 현재 셸의 백그라운드 작업
jobs
jobs -l  # PID 포함

# 전체 프로세스에서 검색
ps aux | grep node
ps aux | grep vite
pgrep -f "npm run dev"
```

#### 프로세스 트리 확인
```bash
# 프로세스 트리
pstree -p <PID>

# 특정 사용자의 프로세스
ps -u $(whoami) -f
```

### 프로세스 종료 방법

#### 작업 번호로 종료
```bash
jobs           # 작업 번호 확인
kill %1        # 작업 번호 1 종료
kill %+        # 현재 작업 종료
kill %-        # 이전 작업 종료
```

#### PID로 종료
```bash
# 일반 종료 (SIGTERM)
kill <PID>

# 강제 종료 (SIGKILL)
kill -9 <PID>
kill -KILL <PID>

# 프로세스 그룹 종료
kill -TERM -<PGID>
```

#### 이름으로 종료
```bash
# 프로세스 이름으로 종료
pkill node
pkill -f "npm run dev"

# 패턴 매칭으로 종료
killall node  # 모든 node 프로세스
```

## 📊 시스템 모니터링

### 리소스 사용량 확인

#### CPU/메모리 사용량
```bash
# 실시간 모니터링
top
htop  # 더 보기 좋은 인터페이스

# 특정 프로세스
top -p <PID>

# 프로세스별 리소스 사용량
ps aux --sort=-%cpu | head -10  # CPU 사용률 Top 10
ps aux --sort=-%mem | head -10  # 메모리 사용률 Top 10
```

#### 네트워크 연결 확인
```bash
# 네트워크 연결 상태
netstat -tulpn
ss -tulpn

# 특정 포트의 연결
netstat -an | grep :3000
ss -tulpn | grep :3000
```

### 로그 모니터링

#### 실시간 로그 확인
```bash
# 백그라운드 프로세스 로그 실시간 확인
tail -f dev.log

# 여러 로그 파일 동시 모니터링
multitail dev.log error.log

# journalctl 사용 (systemd)
journalctl -f -u your-service
```

## 🚀 개발 서버 관리 베스트 프랙티스

### 1. 개발 환경 스크립트

#### 서버 시작 스크립트
```bash
#!/bin/bash
# scripts/start-dev.sh

# 기존 프로세스 종료
echo "🛑 Stopping existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 새 서버 시작
echo "🚀 Starting development server..."
npm run dev
```

#### 서버 중지 스크립트
```bash
#!/bin/bash
# scripts/stop-dev.sh

echo "🛑 Stopping development server..."

# 포트로 프로세스 찾아서 종료
PIDS=$(lsof -ti:3000)
if [ ! -z "$PIDS" ]; then
    echo "Killing processes: $PIDS"
    kill -9 $PIDS
    echo "✅ Stopped development server"
else
    echo "ℹ️ No processes found on port 3000"
fi
```

### 2. 환경별 포트 관리

#### package.json 스크립트 확장
```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "dev:alt": "vite --port 3001",
    "dev:test": "vite --port 3002",
    "dev:clean": "scripts/stop-dev.sh && npm run dev",
    "check-port": "lsof -i:3000 || echo 'Port 3000 is free'"
  }
}
```

### 3. 프로세스 그룹 관리

#### 프로세스 그룹으로 실행
```bash
# 새 세션으로 실행
setsid npm run dev &

# 프로세스 그룹 ID로 모든 하위 프로세스 종료
PGID=$(ps -o pgid= -p $PID | tr -d ' ')
kill -TERM -$PGID
```

## 🔍 트러블슈팅 체크리스트

### 포트 사용 중일 때
1. `lsof -i:3000`으로 프로세스 확인
2. `kill <PID>`로 종료 시도
3. `kill -9 <PID>`로 강제 종료
4. 다른 포트 사용 고려

### 프로세스가 안 죽을 때
1. `ps aux | grep <process>`로 상태 확인
2. `kill -9 <PID>` 강제 종료
3. 부모 프로세스까지 확인 (`pstree`)
4. 시스템 재부팅 (최후의 수단)

### 성능 문제
1. `top`, `htop`로 리소스 사용량 확인
2. 메모리 누수 체크
3. CPU 사용률이 높은 프로세스 확인
4. 네트워크 연결 상태 점검

---

💡 **프로세스 관리 명령어 치트시트:**
```bash
# 확인
jobs                    # 백그라운드 작업
ps aux | grep <name>    # 프로세스 검색
lsof -i:<port>         # 포트 사용 프로세스
pstree -p <pid>        # 프로세스 트리

# 종료
kill <pid>             # 일반 종료
kill -9 <pid>          # 강제 종료
kill %<job>            # 작업 번호로 종료
pkill <name>           # 이름으로 종료

# 모니터링
top                    # 실시간 모니터링
netstat -tulpn         # 네트워크 상태
tail -f <logfile>      # 로그 실시간 확인
```