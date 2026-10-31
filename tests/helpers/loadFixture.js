/**
 * <p>fixture 사진을 불러와 사용자가 input으로 고른 것과 같은 File로 만듭니다.
 * <p>주소는 프로젝트 기준(/tests/...)으로 씁니다. new URL(`../${name}`, import.meta.url)로 쓰면
 * Vite가 바로 아래 파일 목록으로 바꿔 버려서 dup/ 같은 하위 폴더 사진을 못 찾습니다.
 *
 * @param {string} name upload-edge.json의 file 값. 예: '01_full-exif.jpg'
 * @returns {Promise<File>}
 * <p>
 * <p>name: 넘긴 이름 그대로. 예: '01_full-exif.jpg'
 * <p>size: 원본 바이트 수. 예: 401531
 * <p>type: ''. new File은 blob의 형식을 물려받지 않습니다.
 * <p>lastModified: File을 만든 시각(밀리초)
 */
export async function loadFixture(name) {
  const res = await fetch(`/tests/fixtures/upload-edge/${name}`);

  // 없는 파일도 Vite가 index.html을 200으로 돌려줍니다. 그대로 두면 readable: false를
  // 기대하는 케이스(11, 16번)는 파일이 없어도 통과하므로 여기서 막습니다.
  if (res.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`fixture가 없어요: ${name}`);
  }
  /*
  res = {
    ok: true,                // status가 200~299면 true
    status: 200,
    statusText: 'OK',
    url: 'http://localhost:63315/tests/fixtures/upload-edge/01_full-exif.jpg',
    headers: Headers {       // res.headers.get('content-type') → 'image/jpeg'
      'content-type': 'image/jpeg',
      'content-length': '401531',
      ...
    },
    body: ReadableStream,    // 파일 내용. 아직 다 안 받았을 수 있음
    bodyUsed: false,         // 본문을 이미 꺼냈는지

    // 본문을 꺼내는 메서드 (전부 Promise)
    blob(),
    arrayBuffer(),
    text(),
    json(),
    formData()
  }
  */
  const blob = await res.blob();
  return new File([blob], name);
}
