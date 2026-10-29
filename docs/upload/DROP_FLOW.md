# 사진 고르기 흐름 (13a″)

사진은 [폴더 고르기]·[사진만 고르기] 버튼과 화면에 끌어다 놓기(#51), 세 가지 길로 들어옵니다. 세 길 모두 `filterPhotoFiles`로 같은 거르기를 거쳐 `onPick` 하나로 나갑니다.

## 끌어다 놓기

```mermaid
sequenceDiagram
    actor 사용자
    participant 브라우저 as 브라우저(window)
    participant 훅 as usePhotoDrop
    participant 펴기 as filesFromEntries
    participant 거르기 as filterPhotoFiles
    participant 페이지 as UploadPage

    사용자->>브라우저: 폴더·사진을 끌고 들어옴
    브라우저->>훅: dragover
    훅->>브라우저: preventDefault (놓을 수 있다고 알림)
    사용자->>브라우저: 놓기
    브라우저->>훅: drop
    훅->>브라우저: preventDefault (새 탭으로 열지 않게)
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
    거르기->>거르기: filter(isPhotoFile)
    거르기-->>훅: photos

    opt photos가 1장 이상
        훅->>페이지: onPick(photos)
    end
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
    거르기-->>화면: photos
    opt photos가 1장 이상
        화면->>페이지: onPick(photos)
    end
    화면->>화면: input.value 비우기 (같은 폴더를 다시 골라도 change가 오게)
```

## 코드만 봐서는 알기 어려운 것

- **window에 붙인 이유**: 화면 어디에 놓아도 받아야 해서입니다. `<main>`에만 달면 Nav 위에 놓았을 때 브라우저가 사진을 새 탭으로 엽니다.
- **entries를 먼저 꺼내는 이유**: `dataTransfer.items`는 drop 핸들러가 첫 `await`를 만나면 비워집니다.
- **`readEntries`를 반복하는 이유**: Chrome은 폴더 안 항목을 한 번에 최대 100개만 줍니다. 한 번만 읽으면 에러 없이 100장에서 멈춥니다.
- **거르기는 이름만 봅니다**: 확장자만 jpg인 깨진 파일(`16_not-an-image.jpg`)도 통과하고, 다음 단계(`readExif`)에서 걸러집니다.
