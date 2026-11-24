/**
 * 사진 저장 · 이미지 올리기 · Journey 저장이 다 끝났는지예요.
 *
 * 호출: SavePhotos가 03 · 07로 넘어갈 때를, UploadPage가 다 끝난 작업이 남았는지를 봐요.
 * isUploadFinished(useUploadStore.getState())
 *
 * 의도: 두 곳이 같은 조건을 봐야 해서 한곳에 뒀어요. 넘어가는 조건만 바뀌고 UploadPage가 모르면,
 * 다시 들어왔을 때 저장 없이 곧바로 넘어가는 문제가 돌아와요.
 * 올릴 이미지가 없으면(다 빼 뒀거나 미리 볼 수 없는 사진뿐) 이미지는 바로 끝난 것으로 봐요.
 *
 * @param {Pick<import('@/stores/upload/uploadStore').UploadState, 'saveStatus' | 'imageUpload' | 'journeyStatus'>} state
 * @returns {boolean}
 */
export function isUploadFinished({ saveStatus, imageUpload, journeyStatus }) {
  const done = imageUpload.uploaded + imageUpload.skipped + imageUpload.failed;
  return saveStatus === 'saved' && done >= imageUpload.total && journeyStatus === 'saved';
}
