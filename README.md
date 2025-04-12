# 간호사 듀티 관리 프로그램 (Nurse Manager)

간호사 듀티 관리 프로그램은 병원에서 간호사들의 근무 일정을 효율적으로 관리하기 위한 데스크탑 애플리케이션입니다. Electron 기반으로 개발되어 Windows, macOS, Linux 등 다양한 플랫폼에서 사용할 수 있습니다.

## 주요 기능

- 간호사 정보 관리: 이름, 직급, 연락처, 근무 경력 등 관리
- 듀티 스케줄 작성: 일별, 주별, 월별 근무 일정 관리
- 근무 유형 설정: 주간(Day), 야간(Night), 초번(Evening) 등 다양한 근무 유형 지원
- 휴가 관리: 연차, 병가, 특별 휴가 등의 관리
- 통계 및 보고서: 근무 시간, 패턴 분석 및 보고서 생성
- 자동 스케줄링: 공정한 근무 분배를 위한 자동 스케줄링 알고리즘

## 기술 스택

- Electron: 크로스 플랫폼 데스크탑 애플리케이션 프레임워크
- TypeScript: 타입 안정성을 갖춘 JavaScript 슈퍼셋
- Vite: 빠른 개발 환경을 위한 빌드 도구
- Electron Forge: 애플리케이션 배포 도구

## 설치 및 실행

### 사전 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/nurse-manager.git
cd nurse-manager

# 의존성 설치
npm install
```

### 개발 모드 실행

```bash
npm start
```

### 애플리케이션 패키징

```bash
npm run package
```

### 설치 파일 생성

```bash
npm run make
```

## 라이센스

MIT 라이센스

## 연락처

개발자: jwjung5038@gmail.com 