# 사진 쌓기 흐름 (#87 · #89)

13a″에서 사진을 고르면 사진을 쌓은 뒤 13h″~13k″ 정리를 거쳐 13d″ 전체 기록으로 이어집니다. 13b″·13c″는 사진 쌓기로 대체했습니다(#23·#25).

## 상태 트리

### 전 (#87): 화면이 상태를 들고 있음

```
UploadPage            photoFiles: File[]                      useState
└─ PilePhotosStep     props.files
   │                  usePhotoThumbnails(files)
   │                    { files, photos, noPreviewCount, isDone }  useState
   │                    urls[], isCancelled                        effect 안 지역 변수
   └─ PhotoPile       props.photos
```

- 단계는 따로 없고 `photoFiles.length`로 갈랐습니다. 0이면 고르기, 아니면 쌓기.
- 줄이기는 `usePhotoThumbnails`의 effect가 시작했습니다. `PilePhotosStep`이 사라지면 effect 정리 함수가 줄이기를 멈추고 blob: 주소를 해제했습니다.
- 썸네일 Blob은 주소만 만들고 버렸습니다.

이 구조의 문제:

- **페이지를 떠나면 사라짐.** 13d″ 전체 기록과 #26 저장에서 같은 원본·썸네일을 다시 써야 하는데, 페이지를 옮기면 처음부터 다시 골라 줄여야 합니다.
- **줄이기가 화면 수명에 묶임.** StrictMode에서 effect가 두 번 돌면 첫 작업을 버리고 처음부터 다시 줄였습니다. `files` 배열이 바뀌어도 다시 시작해서, 부르는 쪽이 매번 같은 배열을 넘겨야 하는 약속이 있었습니다.

### 후 (#89): 스토어가 상태를 들고, 화면은 구독만 함

```
useUploadStore        files, photos, noPreviewCount, isDone   상태
                      start(files), reset()                   액션
                      jobId                                   모듈 변수 (상태 밖)

App                   세션 주인이 바뀌면 reset()
UploadPage            step: 'select' | 'pile'                 useState
├─ SelectPhotosStep   onPick → start(files)
└─ PilePhotosStep     photos.length, files.length, noPreviewCount, isDone 구독
   └─ PhotoPile       photos 구독
```

| 값                  | 전                             | 후                                                    |
| ------------------- | ------------------------------ | ----------------------------------------------------- |
| 고른 원본           | `UploadPage`의 `photoFiles`    | 스토어 `files`                                        |
| 썸네일 목록·수·완료 | `usePhotoThumbnails`의 상태    | 스토어 `photos`·`noPreviewCount`·`isDone`             |
| 썸네일 Blob         | 버림                           | `photos[].thumb`. #26에서 다시 인코딩하지 않고 저장   |
| 해제할 blob: 주소   | effect 지역 변수 `urls`        | `reset()`이 `photos[].src`를 해제                     |
| 이전 작업 취소 표시 | effect 지역 변수 `isCancelled` | 모듈 변수 `jobId`. 화면에 안 쓰는 값이라 상태 밖에 둠 |
| 지금 단계           | `photoFiles.length`로 추론     | `UploadPage`의 `step`. 이 페이지에서만 의미가 있음    |

단계를 스토어에 넣지 않은 이유: 13h″가 생기면 "원본은 있는데 단계는 정리"인 경우가 생겨 개수로는 단계를 가를 수 없고, 단계는 다른 페이지가 알 필요가 없습니다.

## Zustand를 쓴 이유

- **유지 범위가 페이지를 넘습니다.** 페이지 컴포넌트는 주소가 바뀌면 사라지므로 `UploadPage`로 끌어올려도 해결되지 않습니다. 컨벤션 5절의 "여러 페이지가 같이 쓰는 값"에 해당합니다.
- **사진 한 장마다 값이 바뀝니다.** 300장이면 `photos`가 300번 바뀝니다. Context에 두면 그 Context를 읽는 컴포넌트가 매번 모두 다시 그려지지만, Zustand는 selector로 고른 값이 바뀐 컴포넌트만 다시 그립니다.
- **줄이기를 React 수명 밖으로 뺄 수 있습니다.** 선택 이벤트에서 `start(files)`를 부르므로 StrictMode·다시 그리기·화면 해제와 상관없이 한 번만 돕니다. 컴포넌트가 아닌 곳(`App`의 세션 구독 콜백)에서도 `getState().reset()`으로 정리할 수 있습니다.
- **주소나 저장소에는 둘 수 없습니다.** File·Blob은 URL이나 localStorage에 넣을 수 없어 메모리 스토어를 쓰고, `persist`는 쓰지 않습니다.

## 언제 비우나

- [다시 고르기]와 새 선택: 이전 작업을 중단하고 원본·썸네일·blob: 주소를 정리합니다.
- 페이지 이동: 유지합니다. 전체 기록으로 넘어가는 것과 업로드 취소를 페이지 해제만으로 구분할 수 없기 때문입니다.
- 로그아웃·세션 만료·계정 변경: `App`의 세션 구독에서 정리합니다. 같은 계정의 세션 갱신은 유지합니다.
- 저장 후: #26·#27에서 업로드와 전체 기록의 썸네일 사용이 모두 끝난 뒤 `reset()`을 부릅니다. 사진 정보 저장 직후 지우면 다음 화면의 이미지도 사라지므로 지금 자동 초기화를 넣지 않습니다.
- 새로고침·창 닫기: 메모리만 쓰므로 유지되지 않습니다.

#26의 이미지 업로드 진행 상태도 같은 스토어에 둡니다. 지금은 저장 기능이 없어 진행률 필드를 미리 만들지 않습니다.

## 남은 결정

- 일부러 늦추지 않고 준비되는 대로 쌓습니다. 실제 원본은 디코딩 자체가 느려 별도 지연을 뒀을 때 도움이 없었습니다.
- 13h″로 넘어가는 연결은 해당 화면 작업에서, 캡션의 촬영 시각은 #22에서 이어갑니다. 촬영 정보는 축소 전에 원본에서 읽어야 합니다.
