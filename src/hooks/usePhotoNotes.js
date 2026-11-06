import { useEffect, useState } from 'react';

import { getPhotoNotes } from '@/services/noteService';

// 못 받았을 때 줄 빈 값이에요. 같은 객체를 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_NOTES = {};
const LOADING = { notes: NO_NOTES, status: 'loading', error: null };
const NOTHING_TO_READ = { notes: NO_NOTES, status: 'ready', error: null };

/**
 * 사진 몇 장의 사진별 글을 읽어서 사진 id로 찾을 수 있게 줘요. 02 챕터가 콜라주의 메모 카드를 채울 때 써요.
 *
 * const { notes, status, error } = usePhotoNotes(photoIds);
 * notes['p_3c1060'] // 그 사진의 글 본문. 글이 없는 사진은 undefined예요
 *
 * 오류를 던지지 않아요. 못 받으면 status가 'error'이고 notes는 빈 객체라서, 메모 카드만 빼고 그리면 돼요.
 * 사진 id가 바뀌면 곧바로 'loading'이 돼요. 앞 사진들의 글이 그 사이에 보이지 않고, 늦게 도착한 앞 결과는 버려요.
 * 읽을 사진이 없으면 요청하지 않고 바로 'ready'예요.
 *
 * @param {string[]} photoIds
 * @returns {{
 *   notes: Record<string, string>,
 *   status: 'loading' | 'ready' | 'error',
 *   error: unknown,
 * }}
 */
export function usePhotoNotes(photoIds) {
  // 배열은 렌더링마다 새로 만들어지므로 내용이 같은지 보려고 글자로 바꿔요.
  const key = JSON.stringify(photoIds);
  // 결과가 어느 사진들의 것인지 같이 들고 있어서, 사진이 바뀐 직후 앞 결과를 내보내지 않아요.
  const [result, setResult] = useState({ key: null, notes: NO_NOTES, error: null });

  useEffect(() => {
    const ids = JSON.parse(key);
    if (ids.length === 0) return undefined;

    let isCurrent = true;
    getPhotoNotes(ids).then(
      (rows) => {
        if (!isCurrent) return;
        const notes = Object.fromEntries(rows.map((row) => [row.photoId, row.body]));
        setResult({ key, notes, error: null });
      },
      (error) => isCurrent && setResult({ key, notes: NO_NOTES, error }),
    );
    return () => {
      isCurrent = false;
    };
  }, [key]);

  if (photoIds.length === 0) return NOTHING_TO_READ;
  if (result.key !== key) return LOADING;
  if (result.error) return { notes: NO_NOTES, status: 'error', error: result.error };
  return { notes: result.notes, status: 'ready', error: null };
}
