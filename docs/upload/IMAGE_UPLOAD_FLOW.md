# 사진 이미지 올리기·지우기 흐름 (#26)

## 한눈에

```
올리기:  사진 고름 → 보기용으로 줄임 → 버킷에 올림 (3장씩, 실패하면 다시)
지우기:  DB에서 지움 → 버킷 파일도 지움
키:      DB엔 'photos:내id/사진id' 하나만 적고, 실제 파일 경로는 필요할 때 계산
```

아래 다이어그램은 이 줄기에 재시도·취소·건너뛰기 같은 예외 처리를 더한 것입니다.

`uploadImages`를 부르는 화면은 아직 없어서, "화면"은 앞으로 붙을 호출자입니다.

## 1. 올리기 (`uploadImages`)

```mermaid
sequenceDiagram
    autonumber
    participant UI as 화면(미구현)
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
                One-->>Store: 'uploaded' 또는 'failed'
            end

            Store->>Store: jobId 바뀌었으면 멈춤 (reset된 것)
            Store->>Store: imageUpload[결과] += 1
        end
    end

    Store-->>UI: 끝 (Promise resolve)
```

## 2. 지우기 (`deletePhotos`)

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
