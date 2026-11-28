import { useState } from 'react';

/**
 * 사진 하나에 붙은 동작 버튼들의 요청 중 · 실패 상태예요.
 * 07a 펼친 여행 사진 칸(SortPhotoCard)과 제외한 사진 줄(ExcludedPhotoRow)이 같은 방식으로 버튼을 다뤄서 뺐어요.
 * 요약 줄의 [사진 모두 삭제](SortSummary)도 버튼 하나짜리로 써요.
 * 상태는 부른 컴포넌트마다 따로예요(사진 한 장의 값이에요).
 *
 * const { runningLabel, failMessage, run } = usePhotoActions();
 * <button onClick={() => run(action)} disabled={runningLabel !== null}>...</button>
 *
 * 의도:
 *  - 요청이 끝날 때까지 runningLabel이 남아 있어, 그동안 이 사진의 버튼을 모두 막을 수 있어요.
 *  - 실패하면 그 동작의 failMessage를 남겨요. 같은 버튼을 다시 누르면 지워요.
 *
 * @returns {{
 *   runningLabel: string | null,
 *   failMessage: string | null,
 *   run: (action: import('@/pages/PhotoSortPage/SortPhotoCard').SortPhotoAction) => Promise<void>,
 * }}
 */
export function usePhotoActions() {
  const [runningLabel, setRunningLabel] = useState(null);
  const [failMessage, setFailMessage] = useState(null);

  const run = async (action) => {
    setRunningLabel(action.label);
    setFailMessage(null);
    try {
      await action.onAction();
    } catch (error) {
      console.error(error);
      setFailMessage(action.failMessage);
    } finally {
      setRunningLabel(null);
    }
  };

  return { runningLabel, failMessage, run };
}
