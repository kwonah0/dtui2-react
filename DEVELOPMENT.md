# DTUI2 개발 가이드

클로드 코드 스타일 AI 터미널 데스크톱 앱 개발 환경 설정 및 사용법

## 🚀 WSL에서 개발하기

### 방법 1: 브라우저에서 테스트 (권장)
```bash
npm run test:browser
# 또는
npm run dev
```
그 다음 브라우저에서 `http://localhost:3000` 접속

**장점:**
- 빠른 개발 및 테스트
- Mock API로 모든 기능 테스트 가능
- 핫 리로드 지원

### 방법 2: Electron GUI 설정 (선택사항)
```bash
npm run setup:wsl
```
이후 Electron 실행:
```bash
npm run electron:dev
```

## 🖥️ Windows에서 개발하기

Windows Terminal에서:
```cmd
cd C:\Users\user\github\dtui2-react
npm install
npm run electron:dev
```

## 🧪 테스트 가능한 기능들

### 터미널 명령
```
!ls                    # 디렉토리 목록
!pwd                   # 현재 경로
!echo "Hello World"    # 에코 명령
!npm --version         # npm 버전
cd src                 # 디렉토리 변경
pwd                    # 현재 경로 확인
```

### 파일 작업
```
read file package.json     # 파일 읽기
read file src/App.tsx      # 소스 파일 읽기
list files                 # 디렉토리 목록
ls .                      # 현재 디렉토리
```

### AI Agent 기능
```
analyze code src/App.tsx              # 코드 분석
analyze project                       # 프로젝트 분석
suggest fix TypeError: map undefined  # 에러 수정 제안
generate code React hook for counter  # 코드 생성
help                                 # 도움말
commands                            # 사용 가능한 명령 목록
```

## 📁 프로젝트 구조

```
dtui2-react/
├── src/
│   ├── components/           # React 컴포넌트
│   │   ├── ChatArea.tsx     # 채팅 영역
│   │   ├── InputArea.tsx    # 입력 영역
│   │   ├── TerminalOutput.tsx # 터미널 출력
│   │   └── ...
│   ├── services/            # 서비스 레이어
│   │   ├── AIProvider.ts    # AI 제공자 (OpenAI/Anthropic)
│   │   ├── MockAIAgent.ts   # Mock AI 에이전트
│   │   └── MockElectronAPI.ts # Mock Electron API
│   └── types.ts            # TypeScript 타입 정의
├── electron/               # Electron 메인 프로세스
│   ├── main.js            # 메인 프로세스
│   └── preload.js         # Preload 스크립트
└── scripts/               # 개발 스크립트
    └── setup-wsl.sh      # WSL 설정 스크립트
```

## 🔧 개발 팁

### 1. 브라우저 개발자 도구 활용
- F12로 개발자 도구 열기
- Console에서 `window.electronAPI` 확인
- Mock API 동작 로그 확인

### 2. 실시간 터미널 출력 확인
- 터미널 명령 실행 후 하단의 Terminal Output 창 확인
- Clear 버튼으로 출력 초기화
- Hide 버튼으로 창 숨기기

### 3. AI Agent 확장하기
`src/services/MockAIAgent.ts`에서:
- 새로운 분석 패턴 추가
- 더 정교한 코드 생성 로직 구현
- 실제 AI API로 교체 준비

### 4. 실제 AI API 연동
```typescript
// createAIAgent 함수 수정
const agent = createAIAgent('openai');  // 또는 'anthropic'
```

## 🐛 문제 해결

### WSL에서 Electron 실행 안됨
- WSLg 설정 확인: `echo $DISPLAY`
- 브라우저 테스트 사용 (권장)
- Windows에서 직접 실행

### Mock API 동작 안함
- 브라우저 Console에서 에러 확인
- `window.electronAPI` 존재 확인
- 페이지 새로고침

### 빌드 에러
```bash
npm run build
```
TypeScript 에러 확인 및 수정

## 📦 배포

### 개발 빌드
```bash
npm run build
npm run preview
```

### Electron 패키징
```bash
npm run dist:win    # Windows
npm run dist:mac    # macOS  
npm run dist:linux  # Linux
```

## 🎯 다음 단계

1. **실제 AI API 연동**: OpenAI/Anthropic API 키 설정
2. **더 정교한 터미널**: 실시간 상호작용 개선
3. **파일 편집기**: 코드 편집 기능 추가
4. **프로젝트 관리**: Git 연동, 프로젝트 템플릿
5. **플러그인 시스템**: 확장 가능한 AI Agent 아키텍처

---

💡 **팁**: 현재 Mock API로 모든 기능이 완전히 작동하므로, 브라우저에서 개발하는 것이 가장 효율적입니다!