# 사진 저장·이미지 올리기·보기·지우기 흐름 (#26)

## 한눈에

```
저장:    [저장하기] → 촬영 정보 읽기 → DB에 저장 → 올릴 사진 골라 올리기 시작
올리기:  보기용으로 줄임 → 버킷에 올림 (3장씩, 실패하면 다시)
보기:    'photos:' 키는 서명 주소를 받아 와서 보여 줌 (받기 전엔 회색 칸)
지우기:  DB에서 지움 → 버킷 파일도 지움
키:      DB엔 'photos:내id/사진id' 하나만 적고, 실제 파일 경로는 필요할 때 계산
```

아래 다이어그램은 이 줄기에 재시도·취소·건너뛰기 같은 예외 처리를 더한 것입니다.

저장 버튼과 진행 줄은 03 화면과 #27이 생기기 전까지 모으기 화면(`SavePhotos`)에 임시로 둡니다.

## 1. 저장 (`save`)

같은 폴더를 다시 넣어도 두 벌로 저장되지 않습니다. 이미 저장한 사진의 이미지는 다시 올리지 않습니다.
창을 닫으면 JS가 멈추면서 올리기도 멈춥니다. 그때 못 올린 이미지를 이어서 올리는 기능은 #26에 남겨 두었습니다(코드가 커서 뺐음).

```mermaid
sequenceDiagram
    autonumber
    participant UI as SavePhotos
    participant Store as uploadStore
    participant Read as readPhotos
    participant Svc as photoService
    participant DB as Supabase DB
    participant S3 as Supabase Storage<br/>(photos 버킷)

    UI->>Store: save(ownerId)
    Store->>Store: saveStatus = 'saving'
    Store->>Read: readPhotos(files) (원본에서 촬영 정보)
    Read-->>Store: 사진마다 { order, dedupeKey, 촬영 정보 }
    Store->>Store: 사진마다 id = createPhotoId()<br/>미리 볼 수 있으면 fileKey = 'photos:ownerId/id', 없으면 null
    Store->>Svc: savePhotos(rows)
    Svc->>DB: rpc('save_photos')
    DB-->>Store: { saved, skipped } (skipped = 같은 이름·촬영 시각이 이미 있음)

    alt 실패
        Store->>Store: saveStatus = 'failed' (다시 누르면 처음부터, 저장은 두 벌이 되지 않음)
    else 성공
        Store->>Store: jobId 바뀌었으면 멈춤 (그사이 다시 고른 것)
        Store->>Store: saveStatus = 'saved', saveResult = { saved, existing }
        Store-)Store: uploadImages(새로 저장한 사진 중 fileKey 있는 것) (기다리지 않음)
    end
```

## 2. 올리기 (`uploadImages`)

```mermaid
sequenceDiagram
    autonumber
    participant UI as save
    participant Store as uploadStore
    participant One as uploadImage<br/>(한 장 담당)
    participant Resize as resizePhoto
    participant Svc as photoService
    participant S3 as Supabase Storage<br/>(photos 버킷)

    UI->>Store: uploadImages(targets)
    Store->>Store: imageUpload = { total: N, uploaded: 0, skipped: 0, failed: 0 }

    par 같은 줄을 보는 async 함수 3개 (메인 스레드, IMAGE_UPLOAD_CONCURRENCY)
        loop 줄(queue)이 빌 때까지, jobId가 그대로인 동안
            Store->>One: queue.shift() → { order, fileKey }
            alt 화면에 이미 쌓인 사진
                One->>One: 쌓을 때 만든 thumb 재사용
            else 아직 안 쌓인 사진
                One->>Resize: resizeThumbnail(file)
                Resize-->>One: thumb | null
            end
            One->>Resize: resizeFull(file) (thumb가 있을 때만)
            Resize-->>One: full | null

            alt full이 null (HEIC 등 브라우저가 못 여는 사진)
                One-->>Store: 'skipped'
            else 줄이기 성공
                loop 최대 3번 (처음 + 재시도 2번)
                    One->>One: jobId 바뀌었으면 'cancelled' (줄이거나 기다리는 사이 reset된 것)
                    One->>Svc: savePhotoImage(fileKey, { full, thumb })
                    Svc->>S3: upload full (upsert)
                    Svc->>S3: upload thumb (upsert)
                    S3-->>Svc: 결과
                    alt 성공
                        Svc-->>One: OK
                    else 실패
                        Svc-->>One: throw
                        One->>One: 1초 대기 → 다음엔 3초 대기
                    end
                end
                One-->>Store: 'uploaded' / 'failed' / 'cancelled'
            end

            Store->>Store: jobId 바뀌었으면 멈춤 (reset된 것)
            Store->>Store: imageUpload[결과] += 1 (cancelled는 위에서 멈춰서 세지 않음)
        end
    end

    Store-->>UI: 끝 (Promise resolve)
```

## 3. 보기 (`usePhoto`)

```mermaid
sequenceDiagram
    autonumber
    participant Cell as PhotoGridCell / Lightbox
    participant Hook as usePhoto
    participant Svc as photoService
    participant S3 as Supabase Storage<br/>(photos 버킷)

    Cell->>Hook: usePhoto(fileKey, size)
    alt 데모 사진 (public:, demo:)
        Hook-->>Cell: 바로 주소 (photoSource)
    else 직접 올린 사진 (photos:)
        Hook-->>Cell: null (회색 칸)
        Hook->>Svc: getPhotoImageUrl(fileKey, size)
        Svc->>S3: createSignedUrl(경로, 1시간)
        S3-->>Svc: 서명 주소 (아직 안 올라간 이미지면 오류 → 회색 칸 유지)
        Svc-->>Hook: 서명 주소
        Hook-->>Cell: 서명 주소 (fileKey가 그대로일 때만)
    end
```

## 4. 지우기 (`deletePhotos`)

```mermaid
sequenceDiagram
    autonumber
    participant Caller as 호출자
    participant Svc as photoService
    participant Key as photoFileKey
    participant DB as Supabase DB<br/>(photos 테이블)
    participant S3 as Supabase Storage<br/>(photos 버킷)

    Caller->>Svc: deletePhotos(ids)
    Svc->>DB: delete().in('id', ids).select('id, file_key')
    DB-->>Svc: 실제로 지워진 행들

    loop 지워진 행마다
        Svc->>Key: toUploadedImagePaths(file_key)
        Key-->>Svc: { full, thumb } 또는 null (데모 사진)
    end

    opt 지울 경로가 1개 이상
        Svc->>S3: remove(경로들)
        S3-->>Svc: 결과
        opt 실패
            Svc->>Svc: console.error만 (throw 안 함)
        end
    end

    Svc-->>Caller: 지운 id 목록
```
