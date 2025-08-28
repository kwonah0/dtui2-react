# 🛠️ 문제 해결 가이드

DTUI2 개발 중 자주 발생하는 문제들과 해결 방법

## 🚪 포트 관련 문제

### 문제: "Port 3000 is already in use" 에러

**원인:** 이전에 실행한 개발 서버가 백그라운드에서 계속 실행 중

#### 해결 방법 1: 포트 사용 프로세스 찾아서 종료
```bash
# 포트 3000을 사용하는 프로세스 ID 찾기
lsof -ti:3000

# 또는 더 자세한 정보
lsof -i:3000

# 프로세스 종료
kill <PID>

# 강제 종료가 필요한 경우
kill -9 <PID>
```

#### 해결 방법 2: 한 번에 포트 정리
```bash
# 포트 3000 사용하는 모든 프로세스 종료
lsof -ti:3000 | xargs kill

# 또는 강제 종료
lsof -ti:3000 | xargs kill -9
```

#### 해결 방법 3: 다른 포트 사용
```bash
# package.json 수정하거나 환경변수 사용
PORT=3001 npm run dev

# 또는 vite.config.ts에서 포트 변경
```

### 문제: 네트워크 관련 포트 에러

**증상:** `EADDRINUSE` 또는 `listen EADDRINUSE` 에러

```bash
# 모든 3000번대 포트 확인
netstat -tlnp | grep :300

# 특정 포트 상태 확인
ss -tulpn | grep :3000
```

## 🔄 백그라운드 프로세스 관리

### Claude Code에서 백그라운드 프로세스 확인
```
/bashes
```

### 백그라운드 프로세스 종료
- Claude Code에서: `KillBash` 도구 사용
- 터미널에서: `jobs` 명령으로 확인 후 `kill %1` 등

### 프로세스 상태 확인
```bash
# 현재 실행 중인 Node 프로세스들
ps aux | grep node

# 특정 명령어로 실행된 프로세스들
ps aux | grep vite
ps aux | grep electron
```

## 🖥️ WSL/Linux 관련 문제

### WSL에서 GUI 애플리케이션 실행 안됨

**문제:** Electron이 `libnspr4.so: cannot open shared object file` 에러

#### 해결 방법 1: 필요한 라이브러리 설치
```bash
sudo apt-get update
sudo apt-get install -y \
  libnspr4 \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libgtk-3-0 \
  libgbm1 \
  libxss1 \
  libasound2 \
  libxtst6 \
  xauth \
  xvfb
```

#### 해결 방법 2: 브라우저 테스트 사용 (권장)
```bash
npm run test:browser
# 브라우저에서 http://localhost:3000 접속
```

### WSL Display 설정
```bash
# DISPLAY 환경변수 확인
echo $DISPLAY

# WSLg 사용 중인지 확인
echo $WAYLAND_DISPLAY

# X11 forwarding 설정 (필요시)
export DISPLAY=:0
```

## 📦 의존성 관련 문제

### npm install 실패

#### node-gyp 관련 에러
```bash
# Python과 빌드 도구 설치
sudo apt-get install python3 python3-pip build-essential

# Windows에서는
npm install --global windows-build-tools
```

#### 권한 관련 에러
```bash
# npm 글로벌 디렉토리 권한 수정
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# 또는 nvm 사용 권장
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### TypeScript 컴파일 에러

#### 타입 정의 누락
```bash
# 필요한 @types 패키지 설치
npm install --save-dev @types/node @types/react @types/react-dom
```

#### 모듈 해상도 문제
```bash
# node_modules 초기화
rm -rf node_modules package-lock.json
npm install
```

## 🔧 빌드 관련 문제

### Vite 빌드 실패

#### 메모리 부족
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### 경로 문제
```bash
# 절대 경로 확인
pwd
# 프로젝트 루트에서 실행하는지 확인
```

### Electron 패키징 실패
```bash
# 빌드 캐시 정리
npm run build
rm -rf dist release
npm run dist
```

## 🌐 브라우저 테스팅 문제

### Mock API 동작 안함

#### 개발자 도구에서 확인
1. F12로 개발자 도구 열기
2. Console에서 확인:
```javascript
// Mock API가 로드되었는지 확인
console.log(window.electronAPI);

// Mock API 메서드 테스트
window.electronAPI.getCurrentDirectory();
```

#### Mock API 재초기화
```javascript
// 브라우저 Console에서 강제 초기화
import('/src/services/MockElectronAPI.js').then(module => {
  module.initializeMockAPI();
});
```

### CORS 에러
**브라우저에서는 일반적으로 CORS 문제가 없지만, API 호출시 발생할 수 있음**

```bash
# Vite 개발 서버에 프록시 설정
# vite.config.ts 수정하거나 --cors 플래그 사용
vite --cors
```

## 🐛 일반적인 디버깅 팁

### 로그 확인
```bash
# Vite 개발 서버 로그 확인
npm run dev --verbose

# Electron 로그 확인 (개발 중)
DEBUG=* npm run electron:dev
```

### 캐시 문제 해결
```bash
# npm 캐시 정리
npm cache clean --force

# 브라우저 캐시 정리 (Ctrl+Shift+R)

# Vite 캐시 정리
rm -rf .vite node_modules/.vite
```

### 환경 변수 문제
```bash
# .env 파일 확인
cat .env

# 환경 변수 로드 확인
echo $NODE_ENV
echo $REACT_APP_OPENAI_API_KEY
```

## 📞 추가 도움이 필요할 때

### 로그 수집 방법
```bash
# 전체 빌드 로그 저장
npm run build > build.log 2>&1

# 개발 서버 로그 저장
npm run dev > dev.log 2>&1
```

### 시스템 정보 확인
```bash
# 시스템 정보
uname -a
node --version
npm --version

# WSL 버전 확인 (Windows에서)
wsl --list --verbose
```

### 문제 보고시 포함할 정보
1. 운영체제 (Windows/WSL/Linux/macOS)
2. Node.js 버전
3. npm 버전
4. 정확한 에러 메시지
5. 실행한 명령어
6. package.json 내용

---

💡 **빠른 해결을 위한 체크리스트:**
- [ ] 포트 3000이 사용 중인가?
- [ ] Node.js/npm 버전이 호환되는가?
- [ ] 프로젝트 루트 디렉토리에서 실행하는가?
- [ ] node_modules가 제대로 설치되어 있는가?
- [ ] 환경변수가 올바르게 설정되어 있는가?