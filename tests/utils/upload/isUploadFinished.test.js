import { expect, test } from 'vitest';

import { isUploadFinished } from '@/utils/upload/isUploadFinished';

const FINISHED = {
  saveStatus: 'saved',
  imageUpload: { total: 3, uploaded: 1, skipped: 1, failed: 1 },
  journeyStatus: 'saved',
};

test('저장하고 이미지를 다 올리고 Journey까지 저장했으면 끝났어요', () => {
  // when
  const finished = isUploadFinished(FINISHED);

  // then: 못 올린 장과 회색 칸으로 둔 장도 끝난 것으로 셈
  expect(finished).toBe(true);
});

test('올릴 이미지가 없으면 이미지는 끝난 것으로 봐요', () => {
  // given
  const state = { ...FINISHED, imageUpload: { total: 0, uploaded: 0, skipped: 0, failed: 0 } };

  // when
  const finished = isUploadFinished(state);

  // then
  expect(finished).toBe(true);
});

test.each([
  ['저장 중', { saveStatus: 'saving' }],
  ['이미지 올리는 중', { imageUpload: { total: 3, uploaded: 2, skipped: 0, failed: 0 } }],
  ['Journey 만드는 중', { journeyStatus: 'building' }],
  ['Journey 실패', { journeyStatus: 'failed' }],
])('%s이면 끝나지 않았어요', (_, change) => {
  // when
  const finished = isUploadFinished({ ...FINISHED, ...change });

  // then
  expect(finished).toBe(false);
});
