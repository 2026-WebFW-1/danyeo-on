import { useEffect, useState } from 'react';

import { useUploadStore } from '@/stores/upload/uploadStore';
import { isUploadFinished } from '@/utils/upload/isUploadFinished';

import PassPhotosStep from './pass/PassPhotosStep';
import PilePhotosStep from './pile/PilePhotosStep';
import SelectPhotosStep from './select/SelectPhotosStep';

/**
 * 사진 올리기 페이지. 13a″ 고르기 > 포개지며 쌓이기(#87) > 13h″ 지나가며 정리(#129)
 *
 * 단계는 이 페이지에, 다음 페이지에서도 쓸 원본·썸네일은 스토어에 둡니다.
 * 화면 모양은 그리지 않습니다. 각 단계 컴포넌트(SelectPhotosStep, PilePhotosStep …)가 그립니다.
 *
 * 호출: App의 Routes가 /upload 주소에서 그립니다. 지금은 /로 와도 여기로 보냅니다.
 *
 * 의도: 단계는 주소를 바꾸지 않고 이 안에서 상태로 넘깁니다.(#21)
 * 새로고침하면 처음부터, 페이지 이동 후 돌아오면 보관한 사진을 이어서 보여 줍니다.
 * 저장까지 다 끝난 뒤 돌아오면 스토어를 비우고 고르기부터 합니다. 남겨 두면 [다음] 뒤 SavePhotos가
 * 끝난 상태를 보고 저장 없이 곧바로 넘어가요.
 * 13b″(읽으면서 미리보기)·13c″(다 읽음)는 없애고 포개지며 쌓이는 화면으로 대신합니다.(#87)
 */
export default function UploadPage() {
  const [step, setStep] = useState(() => {
    const state = useUploadStore.getState();
    return state.files.length > 0 && !isUploadFinished(state) ? 'pile' : 'select';
  });
  const start = useUploadStore((state) => state.start);
  const reset = useUploadStore((state) => state.reset);
  const totalCount = useUploadStore((state) => state.files.length);

  // 다 끝난 작업의 사진 주소를 놓아줘요. 렌더링 중에 스토어를 바꾸지 않게 그린 뒤에 비워요.
  useEffect(() => {
    if (isUploadFinished(useUploadStore.getState())) reset();
  }, [reset]);

  const handleSelectPhotos = (files, skippedFiles) => {
    void start(files, skippedFiles);
    setStep('pile');
  };

  const handleReset = () => {
    reset();
    setStep('select');
  };

  if (step === 'select' || totalCount === 0) {
    return <SelectPhotosStep onSelect={handleSelectPhotos} />;
  }

  if (step === 'pass') {
    return <PassPhotosStep />;
  }

  return <PilePhotosStep onReset={handleReset} onNext={() => setStep('pass')} />;
}
