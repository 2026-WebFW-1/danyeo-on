# 사진 고르기·읽기 흐름 (13a″)

사진은 [폴더 고르기]·[사진만 고르기] 버튼과 화면에 끌어다 놓기(#51), 세 가지 길로 들어옵니다. 세 길 모두 `filterPhotoFiles`로 같은 거르기를 거쳐 `SelectPhotosStep`의 `handleFilteredFiles`에 모입니다. 사진이 1장 이상이면 `onSelect`로 나가고, 한 장도 없으면 넘기지 않고 고르기 화면에서 알립니다(U109).

## 끌어다 놓기

```mermaid
sequenceDiagram
    actor 사용자
    participant 브라우저 as 브라우저(window)
    participant 훅 as usePhotoDrop
    participant 덮개 as DropOverlay
    participant 펴기 as filesFromEntries
    participant 거르기 as filterPhotoFiles
    participant 화면 as SelectPhotosStep

    사용자->>브라우저: 폴더·사진을 끌고 들어옴
    브라우저->>훅: dragenter (들어간 수 +1)
    훅->>덮개: isDragging = true, 항목 N개
    loop 끄는 동안
        브라우저->>훅: dragover
        훅->>브라우저: preventDefault (놓을 수 있다고 알림)
        브라우저->>훅: 요소를 넘을 때마다 dragenter +1 / dragleave -1
    end
    opt 창 밖으로 나감 (들어간 수 0)
        훅->>덮개: isDragging = false
    end
    사용자->>브라우저: 놓기
    브라우저->>훅: drop
    훅->>브라우저: preventDefault (새 탭으로 열지 않게)
    훅->>덮개: isDragging = false (놓으면 dragleave가 안 옴)
    훅->>훅: items에서 webkitGetAsEntry()로 entries를 먼저 꺼냄

    훅->>펴기: filesFromEntries(entries)
    loop 항목마다
        alt 파일 entry
            펴기->>펴기: readFile → File
        else 폴더 entry
            loop 빈 배열이 올 때까지 (한 번에 최대 100개)
                펴기->>펴기: readChildren → 안의 entries
            end
            펴기->>펴기: 안의 entries로 filesFromEntries (재귀)
        end
    end
    펴기-->>훅: File[] (하위 폴더까지 한 줄로)

    훅->>거르기: filterPhotoFiles(files)
    거르기->>거르기: 이름마다 skipReason (숨김 파일·지원 안 하는 확장자는 skipped로)
    거르기-->>훅: { photos, skipped }

    훅->>화면: onDrop(photos, skipped) (사진이 없어도 부름)
    Note over 화면: 다음은 아래 "버튼으로 고르기"의 handleFilteredFiles와 같음
```

## 버튼으로 고르기

브라우저가 폴더를 이미 편 `input.files`를 주기 때문에 펴기 단계가 없습니다.

```mermaid
sequenceDiagram
    actor 사용자
    participant 화면 as SelectPhotosStep
    participant 거르기 as filterPhotoFiles
    participant 페이지 as UploadPage

    사용자->>화면: [폴더 고르기] 또는 [사진만 고르기]
    화면->>화면: 숨은 input.click() → 파일 창
    사용자->>화면: 고르기 (change)
    화면->>거르기: filterPhotoFiles(input.files)
    거르기-->>화면: { photos, skipped }
    화면->>화면: handleFilteredFiles(photos, skipped)
    alt photos가 1장 이상
        화면->>페이지: onSelect(photos, skipped)
        페이지->>페이지: handleSelectPhotos → start(files, skippedFiles), 모으기 단계로
    else 한 장도 없음
        화면->>화면: skippedFiles에 두고 "고른 곳에 사진이 없어요" 안내
    end
    화면->>화면: input.value 비우기 (같은 폴더를 다시 골라도 change가 오게)
```

## 촬영 정보 읽기

쌓을 때(`uploadStore.start`) 사진마다 썸네일을 만든 뒤 원본을 `readExif`로 읽어 `PilePhoto`에 둡니다.
정리 화면이 저장 전에 물어볼 사진(촬영 시각 없음)을 골라야 해서 이때 읽고, 저장(`savePicked`)은 이 값을 그대로 씁니다(#189).
300장에서 `readExif`만 따로 재면 0.34초, 썸네일 만들기는 8.2초였습니다(2026-11-20, 같은 브라우저).

```mermaid
sequenceDiagram
    participant 쌓기 as uploadStore.start
    participant 정보 as readExif
    participant exifr

    loop 한 장씩 (앞 장이 끝나야 다음 장)
        쌓기->>쌓기: resizeThumbnail(file)
        쌓기->>정보: readExif(file)
        정보->>exifr: parse(file, 필요한 태그만, 통째로)
        alt 던짐(이미지가 아님) 또는 errors 있음(잘린 파일)
            exifr-->>정보: 실패
            정보-->>쌓기: readable = false, 나머지 null
        else 읽음 (EXIF가 없는 사진도 여기)
            exifr-->>정보: tags
            정보->>정보: 촬영 시각·위치·카메라로 바꿈
            정보-->>쌓기: readable = true + 정보
        end
        쌓기->>쌓기: photos에 { id, order, filename, thumb, src, ...정보 }
    end
```

## 코드만 봐서는 알기 어려운 것

- **window에 붙인 이유**: 덮개 문구가 "화면 아무 곳에나 놓아 주세요"라서 Nav 위에 놓아도 받아야 합니다. `<main>`에만 달면 Nav 위에 놓았을 때 브라우저가 사진을 새 탭으로 엽니다. 덮개 자체는 피그마대로 Nav 아래만 덮습니다.
- **들어간 수를 세는 이유**: `dragenter`·`dragleave`는 요소를 하나 넘을 때마다 옵니다. `dragleave`만 보고 덮개를 끄면 버튼 위를 지날 때마다 깜빡여서, 들어간 수가 0이 될 때만 창 밖으로 나갔다고 봅니다.
- **`dragover` + 타이머 방식은 쓰지 않음**: `dragover`는 "아직 끄는 중"만 알려 주고 "멈췄다"는 신호가 없어서, 일정 시간 안 오면 끄는 방식도 가능합니다. 하지만 마우스를 멈추면 `dragover`가 수백 ms 간격으로 와서 0.4초쯤 기다려야 깜빡이지 않고, 그만큼 창 밖으로 나가도 덮개가 늦게 꺼집니다. 타이머 정리 코드까지 더하면 줄 수도 비슷해서, 바로 꺼지는 세기 방식을 골랐습니다.
- **덮개가 `pointer-events-none`인 이유**: 덮개가 끌기 이벤트를 가로채면 덮개가 뜨자마자 아래 화면에서 `dragleave`가 와서 덮개가 꺼졌다 켜졌다 합니다.
- **"항목 N개"가 사진 수가 아닌 이유**: 놓기 전에는 폴더 안을 열 수 없어서 맨 위 항목 수(`items.length`)만 압니다.
- **entries를 먼저 꺼내는 이유**: `dataTransfer.items`는 drop 핸들러가 첫 `await`를 만나면 비워집니다.
- **`readEntries`를 반복하는 이유**: Chrome은 폴더 안 항목을 한 번에 최대 100개만 줍니다. 한 번만 읽으면 에러 없이 100장에서 멈춥니다.
- **거르기는 이름만 봅니다**: 확장자만 jpg인 깨진 파일(`16_not-an-image.jpg`)도 통과하고, 다음 단계(`readExif`)에서 걸러집니다.
