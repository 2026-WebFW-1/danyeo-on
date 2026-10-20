# 다녀온.

2026 웹프레임워크1 팀 프로젝트 · 여행 기록을 동선으로 공유하는 웹 서비스

## 기술 스택

- React 19 + Vite 8 (JavaScript)
- Tailwind CSS 4
- pnpm 12
- ESLint, Prettier

## 실행 방법

**Node 26**과 **pnpm**이 필요해요. 설치 방법은 [기여 가이드](CONTRIBUTING.md#처음-세팅하기)를 참고해 주세요.

```bash
git clone https://github.com/2026-WebFW-1/danyeo-on.git
cd danyeo-on
pnpm install
pnpm dev
```

브라우저에서 http://localhost:5173 을 열면 돼요.

| 명령어        | 하는 일                     |
| ------------- | --------------------------- |
| `pnpm dev`    | 개발 서버 실행              |
| `pnpm build`  | 배포용 빌드 (`dist/`)       |
| `pnpm lint`   | ESLint 검사                 |
| `pnpm format` | 모든 파일을 Prettier로 포맷 |

## 기여하기

작업을 시작하기 전에 [기여 가이드](CONTRIBUTING.md)를 읽어 주세요.

- [Git 규칙](docs/GIT_CONVENTION.md): 브랜치, 커밋, PR
- [코드 컨벤션](docs/CODE_CONVENTION.md): 폴더 구조, 이름 규칙, 컴포넌트·상태·스타일
