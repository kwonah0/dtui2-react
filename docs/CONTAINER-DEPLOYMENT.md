# DTUI2 Container Deployment Guide

이 가이드는 DTUI2를 Docker 및 Singularity 컨테이너로 배포하고 실행하는 방법을 설명합니다.

## 📋 목차

- [Docker 배포](#docker-배포)
- [Singularity 배포](#singularity-배포)
- [HPC 환경에서 사용](#hpc-환경에서-사용)
- [문제 해결](#문제-해결)

## 🐳 Docker 배포

### 이미지 빌드

```bash
# 기본 빌드
docker build -t dtui2-react .

# 태그와 함께 빌드
docker build -t dtui2-react:v1.2.1 .

# 빌드 스크립트 사용
./scripts/build-containers.sh v1.2.1
```

### Docker 실행

```bash
# 기본 실행 (headless 모드)
docker run -it dtui2-react

# 설정 디렉토리와 로그 디렉토리 바인드
docker run -it \
  -v $(pwd)/config:/app/data \
  -v $(pwd)/logs:/app/logs \
  dtui2-react

# GUI 모드 (X11 forwarding)
docker run -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  dtui2-react npm run electron

# 대화형 셸
docker run -it dtui2-react /bin/bash
```

## 🎯 Singularity 배포

### 이미지 빌드

```bash
# Definition 파일에서 빌드
singularity build dtui2.sif dtui2.def

# Docker 이미지에서 빌드 (선택사항)
singularity build dtui2.sif docker://dtui2-react:latest

# 빌드 스크립트 사용
./scripts/build-containers.sh
```

### Singularity 실행

#### 기본 사용법

```bash
# Headless 모드 (기본)
singularity run dtui2.sif

# 또는 명시적으로
singularity run dtui2.sif headless

# GUI 모드
singularity run --bind /tmp/.X11-unix:/tmp/.X11-unix dtui2.sif gui

# 대화형 셸
singularity run dtui2.sif shell
```

#### 헬퍼 스크립트 사용

```bash
# Headless 모드
./scripts/run-singularity.sh --mode headless

# GUI 모드
./scripts/run-singularity.sh --mode gui

# 설정 및 로그 디렉토리 바인드
./scripts/run-singularity.sh \
  --mode headless \
  --config-dir ./config \
  --log-dir ./logs

# 추가 바인드 마운트
./scripts/run-singularity.sh \
  --mode headless \
  --bind /scratch:/scratch \
  --bind /home/user/data:/data
```

#### 직접 실행

```bash
# 특정 명령 실행
singularity exec dtui2.sif npm run electron:headless

# 환경변수와 함께 실행
singularity exec \
  --env DTUI_CONFIG_DIR=/app/data \
  --env DTUI_LOG_DIR=/app/logs \
  dtui2.sif npm run electron:headless
```

## 🖥️ HPC 환경에서 사용

### SLURM 작업 스크립트 예제

```bash
#!/bin/bash
#SBATCH --job-name=dtui2
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --time=02:00:00

# 모듈 로드 (필요한 경우)
module load singularity

# 작업 디렉토리 설정
cd $SLURM_SUBMIT_DIR

# Singularity로 DTUI2 실행
singularity run \
  --bind $SCRATCH:/scratch \
  --bind $HOME/dtui2-config:/app/data \
  --bind $HOME/dtui2-logs:/app/logs \
  dtui2.sif headless
```

### PBS/Torque 작업 스크립트 예제

```bash
#!/bin/bash
#PBS -N dtui2
#PBS -l nodes=1:ppn=4
#PBS -l mem=8gb
#PBS -l walltime=02:00:00

cd $PBS_O_WORKDIR

singularity run \
  --bind $SCRATCH:/scratch \
  --bind $HOME/dtui2-config:/app/data \
  dtui2.sif headless
```

## ⚙️ 환경 변수

컨테이너에서 사용할 수 있는 주요 환경 변수:

- `NODE_ENV`: 실행 모드 (production/development)
- `DTUI_CONFIG_DIR`: 설정 파일 디렉토리 (기본: /app/data)
- `DTUI_LOG_DIR`: 로그 파일 디렉토리 (기본: /app/logs)
- `DTUI_USER_CONFIGFILE`: 사용자 설정 파일 경로
- `ELECTRON_DISABLE_SANDBOX`: Electron 샌드박스 비활성화 (필수)
- `DISPLAY`: X11 디스플레이 설정

## 📁 디렉토리 구조

컨테이너 내부 구조:

```
/app/
├── src/                 # 소스 코드
├── electron/           # Electron 메인 프로세스
├── dist/               # 빌드된 파일
├── data/               # 설정 파일 (바인드 마운트 권장)
├── logs/               # 로그 파일 (바인드 마운트 권장)
└── node_modules/       # 의존성
```

## 🔧 문제 해결

### GUI 모드에서 화면이 안 보이는 경우

```bash
# X11 forwarding 확인
echo $DISPLAY
xauth list

# Docker에서
docker run -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v $HOME/.Xauthority:/home/node/.Xauthority \
  dtui2-react npm run electron

# Singularity에서
singularity run \
  --bind /tmp/.X11-unix:/tmp/.X11-unix \
  --env DISPLAY=$DISPLAY \
  dtui2.sif gui
```

### 권한 문제

```bash
# 설정 및 로그 디렉토리 권한 확인
chmod 755 config logs

# SELinux 컨텍스트 (Red Hat 계열)
chcon -Rt container_file_t config logs
```

### 메모리 부족

```bash
# Docker 메모리 제한 증가
docker run -it --memory=4g dtui2-react

# SLURM에서 메모리 증가
#SBATCH --mem=16G
```

### 네트워크 연결 문제

```bash
# Docker 네트워크 모드
docker run -it --network=host dtui2-react

# Singularity에서는 기본적으로 호스트 네트워크 사용
```

## 📝 추가 정보

- [Docker 공식 문서](https://docs.docker.com/)
- [Singularity 공식 문서](https://docs.sylabs.io/)
- [DTUI2 HPC 배포 가이드](./HPC-DEPLOYMENT.md)

## 🆘 지원

문제가 발생하면 다음 정보와 함께 이슈를 제출해 주세요:

- 컨테이너 유형 (Docker/Singularity)
- 실행 환경 (로컬/HPC/클라우드)
- 에러 메시지
- 사용한 명령어