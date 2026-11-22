# 다녀온.

2026 웹프레임워크1 팀 프로젝트 · 여행 기록을 동선으로 공유하는 웹 서비스

사진을 올리면 촬영 시각과 위치를 읽어 여행으로 묶고, 그 동선을 지도 · 기록 · 여권 화면으로 보여 줘요.

- 배포: https://danyeo-on.vercel.app (`main` 기준)
- 백엔드(Supabase): [danyeo-on-be](https://github.com/2026-WebFW-1/danyeo-on-be)

## 화면

| 주소             | 화면        | 하는 일                                                          |
| ---------------- | ----------- | ---------------------------------------------------------------- |
| `/`              | 홈          | 지구본과 전체 합계, 1년 전 이맘때                                |
| `/map`           | 지도 재생   | 동선을 지도에서 재생. 기간 고르기, 확대 · 이동, 이동 수단 고치기 |
| `/places`        | 전체 기록   | 여행 탭으로 보는 도시별 기록                                     |
| `/chapter/:slug` | 챕터        | 오래 머문 곳의 사진 콜라주와 글 쓰기                             |
| `/passport`      | Passport    | 통계 · 입국 스탬프 · 여행 캘린더 · 기록                          |
| `/upload`        | 사진 올리기 | 사진을 골라 촬영 정보를 읽고 여행으로 묶어 저장                  |
| `/edit/photos`   | 사진 정리   | 여행 이름 바꾸기 · 나누기, 사진 빼기 · 복구, 위치 없는 사진 확인 |
| `/credits`       | 출처        | 밖에서 받아 쓰는 데이터와 데모 사진의 출처 · 라이선스            |
| `/login`         | 로그인      | 이메일 로그인. 나머지 화면은 로그인한 뒤에만 볼 수 있어요        |

## 기술 스택

- React 19 + Vite 8 (JavaScript)
- React Router 8, Zustand 5
- Tailwind CSS 4
- Supabase (로그인 · DB · 사진 저장)
- Vitest 5 (브라우저 모드, Playwright Chromium)
- pnpm 12
- ESLint, Prettier

## 실행 방법

**Node 26**과 **pnpm**이 필요해요. 설치 방법은 [기여 가이드](CONTRIBUTING.md#처음-세팅하기)를 참고해 주세요.

```bash
git clone https://github.com/2026-WebFW-1/danyeo-on.git
cd danyeo-on
pnpm install
cp .env.example .env.local
pnpm dev
```

브라우저에서 http://localhost:5173 을 열면 돼요.

### 환경 변수

`.env.local`에 Supabase 주소와 publishable 키를 넣어요. 이 파일은 git에 올라가지 않아요.

| 이름                            | 값                                                |
| ------------------------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase 프로젝트 주소                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable 키 (브라우저에 그대로 보이는 공개 키) |

값은 Supabase 대시보드에서 확인해요. 대시보드 주소는 [danyeo-on-be README](https://github.com/2026-WebFW-1/danyeo-on-be#readme)에 있어요.
값이 없으면 로그인과 데이터 요청이 실패해요.

### 데모 계정

| 계정                | 내용                                    |
| ------------------- | --------------------------------------- |
| `seojin@demo.local` | 기본 시연. 한 사람의 2년 (여행 14개)    |
| `edge@demo.local`   | 경계 케이스 (경유, 제외, 날짜변경선 등) |
| `empty@demo.local`  | 여행이 없는 빈 상태                     |

비밀번호는 모두 `demo1234`예요. `pnpm dev`로 띄운 로그인 화면에는 계정을 바로 고르는 버튼이 있고, 배포본에서는 이메일과 비밀번호를 직접 입력해요.

> 데모 계정에서 이름 바꾸기 · 사진 빼기 같은 보정을 저장하면 그 계정의 여행이 다시 계산되어 저장돼요. 모두가 같이 보는 데이터라서, 확인이 끝나면 되돌려 주세요.

데이터 모양은 [src/data/README.md](src/data/README.md)에 있어요.

## 외부 데이터와 출처

앱 안에서는 `/credits`(01 지도 오른쪽 아래의 [출처])에서 볼 수 있어요.

| 데이터                 | 출처                                                                                                             | 라이선스 · 표기                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 지점 이름(도시 · 나라) | OpenStreetMap의 공개 [Nominatim](https://nominatim.org/) 서버 (`src/constants/geocode.js`)                       | ODbL. [`© OpenStreetMap contributors`](https://www.openstreetmap.org/copyright)     |
| 세계 지도 모양         | [Natural Earth](https://www.naturalearthdata.com/)를 담은 [world-atlas](https://github.com/topojson/world-atlas) | Natural Earth는 퍼블릭 도메인(표기 의무 없음), world-atlas는 ISC(© Michael Bostock) |
| 데모 사진              | 위키미디어 공용(출처가 적힌 사진 기준)                                                                           | 사진마다 달라요(CC0 · CC BY · CC BY-SA · 퍼블릭 도메인)                             |

데모 사진의 저작자 · 라이선스 · 원본 주소는 아래 파일에 있고, `/credits`가 로그인한 데모 계정이 쓰는 사진만 골라 보여 줘요.

- 추가 확보한 사진: Supabase Storage `demo-assets`의 `<uuid>/<인물>/coverage-credits.json`
- 처음부터 있던 사진: `public/photos/credits.json`. 109장 가운데 12장은 원본을 찾지 못해 저작자 · 라이선스가 비어 있고 `/credits`에 나오지 않아요. 지금 쓰는 사진은 그중 3장(`sokcho-4`, `istanbul-4`, `sydney-2`)이에요. 나머지 9장은 사진 파일이 없는 항목이에요.

CC BY · CC BY-SA 사진은 저작자 표시가 있어야 쓸 수 있어요. 사진을 바꾸거나 다른 곳에 다시 올릴 때는 이 파일들도 같이 맞춰 주세요.

## 명령어

| 명령어               | 하는 일                        |
| -------------------- | ------------------------------ |
| `pnpm dev`           | 개발 서버 실행                 |
| `pnpm build`         | 배포용 빌드 (`dist/`)          |
| `pnpm preview`       | 빌드한 결과를 로컬에서 띄우기  |
| `pnpm lint`          | ESLint 검사                    |
| `pnpm format`        | 모든 파일을 Prettier로 포맷    |
| `pnpm format:check`  | 포맷이 맞는지만 검사           |
| `pnpm test`          | 테스트 실행 (고치면 다시 실행) |
| `pnpm test --run`    | 테스트를 한 번만 실행          |
| `pnpm test:coverage` | 테스트 한 번 실행 + 커버리지   |

테스트는 실제 Chromium에서 돌아요. 처음 한 번 브라우저를 받아 주세요.

```bash
pnpm exec playwright install chromium
```

PR을 올리면 CI가 lint → 테스트 → 빌드를 순서대로 검사해요.

## 기여하기

작업을 시작하기 전에 [기여 가이드](CONTRIBUTING.md)를 읽어 주세요.

- [Git 규칙](docs/GIT_CONVENTION.md): 브랜치, 커밋, PR
- [코드 컨벤션](docs/CODE_CONVENTION.md): 폴더 구조, 이름 규칙, 컴포넌트·상태·스타일
