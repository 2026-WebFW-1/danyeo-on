# 코드 컨벤션

> JavaScript + React(Vite) 기준입니다.
> 포맷(들여쓰기, 따옴표 등)은 Prettier가, 문법 실수는 ESLint가 잡아 줍니다. 이 문서는 **도구가 잡아 주지 못하는 규칙**을 정리합니다.

## 한눈에 보기

| 대상          | 규칙                            | 예시                              |
| ------------- | ------------------------------- | --------------------------------- |
| 컴포넌트      | PascalCase, `.jsx`              | `TripCard.jsx`                    |
| 커스텀 훅     | `use` + camelCase, `.js`        | `useWeather.js`                   |
| 일반 JS 파일  | camelCase, `.js`                | `formatDate.js`                   |
| 변수·함수     | camelCase                       | `tripList`, `getTrips()`          |
| 상수          | UPPER_SNAKE_CASE                | `MAX_PHOTO_COUNT`                 |
| boolean       | `is` / `has` / `can`으로 시작   | `isLoading`, `hasPhotos`          |
| 이벤트 핸들러 | 함수는 `handle~`, props는 `on~` | `handleClick`, `onClick`          |
| 스타일        | Tailwind 클래스, 조건부는 `cn`  | `cn('p-4', isActive && 'bg-ink')` |

---

## 1. 폴더 구조

```
src/
├─ pages/            라우트 하나 = 폴더 하나
│  └─ MapPage/
│     ├─ MapPage.jsx
│     └─ RouteLine.jsx     이 페이지에서만 쓰는 컴포넌트는 여기에
├─ components/       2개 이상의 페이지에서 쓰는 공통 컴포넌트
│  ├─ common/        Button, Tabs, Toast, Skeleton ...
│  └─ layout/        Nav, Layout ...
├─ hooks/            커스텀 훅
├─ stores/           전역 상태 (Zustand)
├─ services/         데이터 읽기, API 호출
├─ data/             목업 JSON
├─ utils/            순수 함수 (날짜 변환, 거리 계산, cn ...)
├─ constants/        상수
├─ styles/           global.css (Tailwind 불러오기), tokens.css (디자인 토큰)
├─ types.js          데이터 구조 정의 (JSDoc)
├─ App.jsx
└─ main.jsx
```

### 파일을 어디에 둘지 헷갈릴 때

- 한 페이지에서만 쓰는 컴포넌트 → 그 페이지 폴더
- 두 번째 페이지에서도 쓰게 되면 → `components/`로 옮기기
- 화면과 상관없는 계산 → `utils/`
- 데이터를 가져오는 코드 → `services/`

---

## 2. 이름 규칙

### 파일과 폴더

- 컴포넌트 파일과 그 폴더는 **PascalCase**: `pages/MapPage/MapPage.jsx`
- 그 외 파일과 폴더는 **camelCase**: `utils/formatDate.js`, `stores/uploadStore.js`
- 컴포넌트 이름과 파일 이름을 **똑같이** 맞춥니다.
- 페이지 컴포넌트는 끝에 `Page`를 붙입니다: `MapPage`, `PassportPage`

### 변수와 함수

```js
// ✅ 좋은 예
const trips = []; // 배열은 복수형
const selectedTrip = trips[0];
const isLoading = true; // boolean은 is/has/can
const hasPhotos = photos.length > 0;
function getTripById(id) {} // 함수는 동사로 시작
function calcTotalDistance(stops) {}

// ❌ 나쁜 예
const data = []; // 무슨 데이터인지 알 수 없음
const flag = true;
const tripList2 = [];
function trip(id) {} // 동사가 없음
```

### 자주 쓰는 동사

| 동사           | 의미                                     |
| -------------- | ---------------------------------------- |
| `get~`         | 값을 가져옴 (`getTrips`)                 |
| `calc~`        | 계산해서 반환 (`calcTotalDays`)          |
| `format~`      | 보여주기 좋은 형태로 변환 (`formatDate`) |
| `is~` / `has~` | true/false 반환 (`isDomestic`)           |
| `handle~`      | 이벤트 처리 (`handleUpload`)             |

---

## 3. 컴포넌트

### 기본 형태

```jsx
import { useState } from 'react';

import Button from '@/components/common/Button';
import { formatDate } from '@/utils/formatDate';

export default function TripCard({ trip }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <article className="bg-surface rounded-2xl p-4">
      <h3 className="text-lg font-bold text-ink">{trip.city}</h3>
      <p className="text-sm text-muted">{formatDate(trip.start)}</p>
      <Button onClick={handleToggle}>{isOpen ? '접기' : '더 보기'}</Button>
    </article>
  );
}
```

### 규칙

- 컴포넌트는 **함수 선언식 + `export default`** 로 작성합니다.
- **파일 하나에 컴포넌트 하나**를 원칙으로 합니다.
- props는 매개변수에서 바로 **구조 분해**합니다.
- 컴포넌트가 **200줄을 넘으면** 작은 컴포넌트로 나눕니다.
- 리스트를 그릴 때 `key`에 **배열 index를 쓰지 않습니다.** 데이터의 `id`를 씁니다.

  ```jsx
  // ✅
  {
    trips.map((trip) => <TripCard key={trip.id} trip={trip} />);
  }

  // ❌
  {
    trips.map((trip, i) => <TripCard key={i} trip={trip} />);
  }
  ```

- 조건부 렌더링에서 숫자를 `&&` 앞에 두지 않습니다. 0이 화면에 그대로 찍힙니다.

  ```jsx
  // ❌ photos.length가 0이면 화면에 "0"이 보임
  {
    photos.length && <Gallery photos={photos} />;
  }

  // ✅
  {
    photos.length > 0 && <Gallery photos={photos} />;
  }
  ```

---

## 4. 훅

- 여러 컴포넌트에서 반복되는 로직은 **커스텀 훅**으로 뺍니다: `useWeather`, `useExif`
- 커스텀 훅은 **로직을 재사용**합니다. 훅 내부의 `useState`는 호출한 컴포넌트마다 별개이므로, 같은 상태를 공유해야 한다면 [5. 상태 관리](#5-상태-관리)를 따릅니다.
- `useEffect`는 **외부와 동기화할 때만** 씁니다 (API 호출, 이벤트 리스너, 타이머 등). props나 state로 계산할 수 있는 값은 `useEffect` 없이 바로 계산합니다.

  ```jsx
  // ❌ 불필요한 useEffect
  const [totalDays, setTotalDays] = useState(0);
  useEffect(() => {
    setTotalDays(stops.reduce((sum, s) => sum + s.days, 0));
  }, [stops]);

  // ✅ 렌더링 중에 바로 계산
  const totalDays = stops.reduce((sum, s) => sum + s.days, 0);
  ```

- ESLint의 의존성 배열 경고(`react-hooks/exhaustive-deps`)를 **주석으로 끄지 않습니다.** 경고가 나면 코드 구조를 고칩니다.

---

## 5. 상태 관리

상태의 성격에 따라 둘 곳을 정합니다.

| 상태                          | 어디에            | 예시                                  |
| ----------------------------- | ----------------- | ------------------------------------- |
| 한 컴포넌트에서만 쓰는 값     | `useState`        | 드롭다운 열림 여부                    |
| 같은 화면의 여러 컴포넌트가 공유하는 값 | 가장 가까운 공통 부모의 상태 | 사진 목록과 미리보기의 선택 상태 |
| URL에 남아야 하는 값          | `useSearchParams` | 아카이브 필터(1Y/2Y/ALL), 선택한 여행 |
| 여러 페이지가 같이 쓰는 값    | Zustand 스토어    | 업로드 → 초안 → 사진 정리 진행 상태   |
| 서버·목업에서 가져오는 데이터 | `services/` 함수  | 여행 목록, 날씨                       |

### 규칙

- **전역 스토어는 최소한으로** 씁니다. 먼저 로컬 `useState`, 공통 부모로 상태 끌어올리기, URL로 해결할 수 있는지 생각합니다. URL에 남아야 하는 값은 공유 범위와 관계없이 URL을 기준으로 둡니다.
- 스토어는 **기능 단위로 파일 하나**씩 만들고, 이름은 `use~Store`로 짓습니다: `useUploadStore`
- 스토어에서 값을 꺼낼 때는 **필요한 값만 골라서** 꺼냅니다. 스토어 전체를 꺼내면 아무 값이 바뀌어도 리렌더링됩니다.

  ```js
  // ✅
  const photos = useUploadStore((state) => state.photos);

  // ❌
  const { photos } = useUploadStore();
  ```

### 데이터 접근

- 컴포넌트에서 `data/*.json`을 **직접 import하지 않습니다.** 반드시 `services/`의 함수를 거칩니다. 나중에 실제 API로 바꿀 때 `services/`만 고치면 되도록 하기 위해서입니다.

  ```js
  // services/tripService.js
  import tripsData from '@/data/trips.json';

  export async function getTrips() {
    return tripsData.trips;
  }
  ```

---

## 6. 스타일

- **Tailwind CSS v4**를 사용합니다. 클래스는 `className`에 바로 적습니다. 클래스 순서는 저장할 때 Prettier가 정렬해 줍니다.
- 색, 글꼴, 둥근 모서리 같은 디자인 값은 `styles/tokens.css`의 `@theme`에 정의하고, **정의한 토큰 클래스만** 씁니다. 색상 코드를 직접 적지 않습니다.

  ```css
  /* styles/tokens.css */
  @theme {
    --color-ink: #000;
    --color-accent: #e6007e;
  }
  ```

  ```jsx
  // ✅ 토큰에서 만들어진 클래스
  <p className="text-ink">

  // ❌ 대괄호로 값을 직접 적기
  <p className="text-[#111]">
  ```

- 토큰 이름과 값은 피그마 Foundations가 기준입니다. 피그마를 먼저 고치고 `tokens.css`를 따라 고칩니다.
- 글자 크기(`text-*`)와 모서리(`rounded-*`)는 Tailwind 기본값을 지우고 피그마 이름·값으로 다시 정의했습니다. **이 프로젝트에서 `text-sm`은 13px입니다** (Tailwind 문서의 14px과 다름). `text-base`는 없고 16px은 `text-lg`입니다.

  | 클래스     | 크기 | 클래스                          | 크기          |
  | ---------- | ---- | ------------------------------- | ------------- |
  | `text-2xs` | 11px | `text-4xl`                      | 28px          |
  | `text-xs`  | 12px | `text-5xl`                      | 36px          |
  | `text-sm`  | 13px | `text-6xl`                      | 44px          |
  | `text-md`  | 14px | `text-7xl`                      | 56px          |
  | `text-lg`  | 16px | `text-8xl`                      | 72px          |
  | `text-xl`  | 18px | `text-display-sm`               | 76px          |
  | `text-2xl` | 20px | `text-display-md`               | 128px         |
  | `text-3xl` | 24px | `text-display-lg` / `text-hero` | 136px / 150px |

- 줄 높이는 크기 클래스에 들어 있어서 따로 적지 않습니다. 14·16px Regular 본문만 `leading-body-md`(1.7), `leading-body-lg`(1.8)를 크기 **뒤에** 붙입니다: `text-md leading-body-md`
- 새 크기·줄 높이·모서리 이름을 `tokens.css`에 더하면, Tailwind 기본에 없는 이름은 `utils/cn.js`의 `extendTailwindMerge`에도 등록합니다. 등록하지 않으면 `cn`이 같이 쓴 클래스를 지울 수 있습니다.

- 간격은 Tailwind 기본 단위(`p-4` = 16px)를 씁니다. `p-[13px]`처럼 대괄호 값은 피그마 수치를 맞추려고 꼭 필요할 때만 씁니다.
- 여러 클래스를 조건에 따라 붙일 때는 `@/utils/cn`의 `cn`을 씁니다. 같은 종류 클래스가 겹치면 뒤의 것이 이깁니다.

  ```jsx
  <li className={cn('px-3 py-1 text-muted', isActive && 'bg-ink text-white')}>
  ```

- 공통 컴포넌트는 `className` props를 받아 `cn`으로 합칩니다. 쓰는 쪽에서 여백이나 크기를 바꿀 수 있게 하기 위해서입니다.

  ```jsx
  export default function Button({ className, children, ...props }) {
    return (
      <button className={cn('rounded-full bg-ink px-4 py-2 text-white', className)} {...props}>
        {children}
      </button>
    );
  }
  ```

- 클래스가 너무 길어지면 `@apply`로 묶지 말고 **컴포넌트로 나눕니다.**
- `@keyframes` 애니메이션은 `tokens.css`의 `@theme`에 `--animate-*`와 함께 정의하고 `animate-*` 클래스로 씁니다.
- 인라인 스타일(`style={{ }}`)은 **값이 계속 바뀌는 경우에만** 씁니다 (지도 좌표, 애니메이션 진행률 등).

---

## 7. JavaScript 문법

- `const`를 기본으로 쓰고, 값을 다시 할당해야 할 때만 `let`을 씁니다. `var`는 쓰지 않습니다.
- 비교는 항상 `===`, `!==`를 씁니다.
- 비동기 처리는 `.then()` 대신 **`async` / `await`** 를 씁니다.
- 값이 없을 수 있는 객체는 **옵셔널 체이닝**으로 접근합니다: `trip?.pano?.src`
- 문자열을 이어 붙일 때는 **템플릿 문자열**을 씁니다: `` `${city} · ${days}일` ``
- 숫자나 문자열을 코드에 바로 쓰지 말고, 의미 있는 이름의 **상수**로 뺍니다.

  ```js
  // ❌
  if (photos.length > 50) {
  }

  // ✅ constants/upload.js
  export const MAX_PHOTO_COUNT = 50;
  ```

### export 방식

| 파일                              | 방식             |
| --------------------------------- | ---------------- |
| 컴포넌트, 페이지                  | `export default` |
| utils, services, constants, hooks | `export` (named) |

### import 순서

그룹 사이에는 한 줄을 띄웁니다.

```js
// 1. React, 외부 라이브러리
import { useState } from 'react';
import { useNavigate } from 'react-router';

// 2. 프로젝트 내부 (@/ 절대경로)
import Button from '@/components/common/Button';
import { getTrips } from '@/services/tripService';

// 3. 같은 폴더 (상대경로)
import RouteLine from './RouteLine';
```

- 다른 폴더의 파일은 `../../`가 아니라 **`@/` 절대경로**로 불러옵니다.

---

## 8. 주석과 데이터 구조

- 주석에는 **무엇을 하는지보다 왜 그렇게 했는지**를 적습니다. 무엇을 하는지는 코드와 이름으로 드러나게 합니다.

  ```js
  // ❌ 일수를 더한다
  // ✅ 같은 도시에 두 번 간 경우도 각각 따로 센다
  const totalDays = stops.reduce((sum, s) => sum + s.days, 0);
  ```

- 나중에 할 일은 `TODO(이름):` 형식으로 남깁니다.

  ```js
  // TODO(홍길동): 사진이 100장 넘으면 가상 스크롤 적용
  ```

- 여행, 경유지, 포스트처럼 **여러 사람이 같이 쓰는 데이터 구조**는 `src/types.js`에 JSDoc으로 정의합니다. 타입스크립트가 없어도 VS Code가 자동완성을 해 줍니다.

  ```js
  /**
   * @typedef {Object} Stop
   * @property {string} id
   * @property {string} tripId
   * @property {string} city
   * @property {number} lat
   * @property {number} lng
   * @property {string} start   YYYY-MM-DD
   * @property {number} days
   */
  ```

  사용하는 쪽:

  ```js
  /** @param {import('@/types').Stop[]} stops */
  export function calcTotalDays(stops) {}
  ```

- `utils/`와 `services/`의 함수에는 JSDoc으로 **매개변수와 반환값**을 적습니다.
