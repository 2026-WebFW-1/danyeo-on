# 목 데이터 (JSON)

서버가 생기기 전까지 쓰는 데이터입니다. 컴포넌트에서 직접 import하지 말고 `services/`를 거쳐 읽어요.
이 JSON은 [my-journey](https://github.com/2026-WebFW-1/my-journey) 저장소의 `mock/`에서 스크립트로 만든 것이라, 손으로 고치면 다시 만들 때 사라집니다. 값이 이상하면 알려 주세요.

```
src/data/
├─ seed/       서버 DB에 들어갈 원본 (인물 하나 = 파일 하나)
├─ fixtures/   사진을 묶어 계산한 결과 예시 (화면이 최종적으로 받을 모양)
└─ personas/   데이터를 만든 재료 (보통은 안 봐도 됨)
```

## 인물

| 인물   | 계정                | 사진  | 여행 | 쓰임                                   |
| ------ | ------------------- | ----- | ---- | -------------------------------------- |
| seojin | `seojin@demo.local` | 333장 | 14개 | 기본 시연. 한 사람의 2년               |
| edge   | `edge@demo.local`   | 263장 | 11개 | 경계 케이스(경유, 제외, 날짜변경선 등) |
| empty  | `empty@demo.local`  | 0장   | 0개  | 빈 상태 화면                           |
| heavy  | (seed 없음)         |       | 59개 | 속도 확인용. `fixtures/heavy.*`만 있음 |

## seed/&lt;인물&gt;.json

```js
{
  user: { id: 'u_seojin', email, name, picture: null, provider: 'demo', createdAt },
  photos: [{
    id: 'p_c2a066', ownerId: 'u_seojin', fileName: 'IMG_0001.JPG',
    takenAt: '2024-03-04T18:38:50',   // 현지 시각, 시간대 없음
    offset: '+09:00' | null,          // 시간대는 따로
    timeUncertain: false,             // offset이 없으면 true
    lat, lng,                         // 없으면 null
    camera: { make, model, focal, aperture, shutter, iso } | null,
    fileKey: 'public:/photos/tokyo-1.webp' | null,   // null이면 이미지 없음(회색 칸)
    uploadedAt,
  }],
  corrections: [{ id: 'c_seojin_1', ownerId, type: 'rename', anchorPhotoId, name, createdAt }],
  posts: [{ id: 'post_seojin_1', ownerId, date: '2024-11-24', title, body, tags: [], photoIds: [], updatedAt }],
}
```

- **사진 이미지:** `fileKey`를 직접 주소로 쓰지 말고 `usePhoto(fileKey, 'thumb' | 'full')`로 바꿔요. `public:/photos/tokyo-1.webp` → `/photos/full/tokyo-1.webp`(긴 변 2048, 500KB 이하) 또는 `/photos/thumb/tokyo-1.webp`(긴 변 400).
  - 이 두 벌은 my-journey의 JPG를 이 저장소에서 따로 변환해 넣은 거예요(#15). my-journey `mock/export-danyeo.py`는 아직 한 벌짜리 WebP와 다른 폴더 구조를 만들어서, 다시 돌리면 이 구조와 어긋나요.
- **보정(corrections)** 은 사용자가 자동 결과를 고친 기록이에요. 항상 사진 ID로 가리킵니다.

  | type      | 내용                                     |
  | --------- | ---------------------------------------- |
  | `rename`  | `{ anchorPhotoId, name }` 여행 이름      |
  | `exclude` | `{ photoId }` 사진 빼기                  |
  | `transit` | `{ photoIds }` 경유 지점 표시            |
  | `mode`    | `{ fromPhotoId, mode }` 이동 수단 고치기 |
  | `split`   | `{ beforePhotoId }` 여행 나누기          |
  | `merge`   | `{ photoIds: [a, b] }` 여행 합치기       |

- **글(posts)** 은 하루에 하나, 날짜(`date`, 현지 날짜)로 붙어요.

## fixtures/

### &lt;인물&gt;.journey.json: 화면이 받을 모양

사진 + 보정을 계산한 결과예요. 서버가 주는 데이터가 아니라 **브라우저가 계산해서 만들 결과의 예시**입니다.

```js
{
  home: { lat, lng, city: '서울' } | null,
  stops: [{                       // 머문 곳 (집은 빠짐)
    id, tripId, lat, lng, city: '밴쿠버', country: '캐나다', cc: 'CA',
    from: '2025-06-28T18:30:51-07:00', to,   // 시간대 붙은 시각
    days: 57,
    chapter: true, slug: '밴쿠버-2025',      // 14일 이상 머물면 챕터. 아니면 false, null
    transit: false,                          // 경유지면 true (선·통계에서 뺌)
    photoIds: [], photoCount, coverFileKey,
  }],
  legs: [{                        // 이동 구간
    id: 'leg_1', tripId,                     // gap이면 tripId null
    kind: 'outbound' | 'between' | 'gap' | 'return',   // 집→첫 지점 | 여행 안 | 집 안 들르고 다음 여행 | →집
    from: 'home' | stopId, to,
    fromLatLng: [lat, lng], toLatLng,
    departAt, arriveAt, hours,
    timing: 'photos' | 'estimated',          // 사진 시각 | 거리로 추정
    km, mode: 'flight' | 'train' | 'car', modeSource: 'auto' | 'user',
    crossesAntimeridian: false,              // 날짜변경선을 넘는 구간
  }],
  trips: [{ id, name: '방콕 · 다낭', nameSource: 'auto' | 'user', from, to, days, stopIds, legIds, chapter }],
  unlocated: [photoId],           // 위치가 없어 지점에 못 넣은 사진
  excluded: [photoId],            // 사용자가 뺀 사진
  periods: { anchor: '2026-08-16', '1y': { from, to }, '2y': { from, to }, all: { from, to } } | null,
}
```

- 맨 위의 `personaId`·`generatedBy`·`about`은 설명용이에요. 앱에선 안 씁니다.
- 여행이 0개면 배열은 전부 비고 `periods`는 `null` (`empty.journey.json`).

| 인물   | 지점 | 구간 | 여행 | 챕터                     |
| ------ | ---- | ---- | ---- | ------------------------ |
| seojin | 19   | 33   | 14   | `밴쿠버-2025`            |
| edge   | 15   | 24   | 11   | `런던-2025`, `파리-2025` |
| heavy  | 109  | 168  | 59   | 4개                      |

### &lt;인물&gt;.group.json: 묶기 중간 결과

보정을 적용하기 전, 사진을 지점·여행으로 묶기만 한 결과예요. journey와 다른 점: 집 지점이 들어 있고, 도시 이름이 없고, 시각과 `offset`이 따로 있고, `legs`가 `trips` 안에 있어요.

### upload-edge.json: 사진 파일을 읽었을 때 나와야 하는 값

`{ cases: [{ file, why, expect: { readable, takenAt, offset, timeUncertain, lat, lng, camera, ... } }] }` 20개. EXIF가 없거나 깨진 사진 같은 예외 케이스예요.

## ID와 시각 규칙

- ID: 사진 `p_xxxxxx`, 사용자 `u_<인물>`, 보정 `c_<인물>_n`, 글 `post_<인물>_n`
- 지점·여행 ID는 그 지점·여행의 **첫 사진 ID**예요. 사진이 바뀌면 달라질 수 있어서 어디에 저장하지 않아요.
- 구간 ID(`leg_n`)는 계산할 때마다 새로 매겨요. 저장하지 않습니다.
- seed의 `takenAt`은 시간대 없는 현지 시각 + `offset` 따로, journey의 `from`·`to`·`departAt`·`arriveAt`은 시간대가 붙은 시각이에요.
