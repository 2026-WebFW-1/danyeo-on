import { useLocation } from 'react-router';

import ErrorToast from '@/components/common/ErrorToast';
import { PHOTO_SORT_PATH } from '@/constants/photoSort';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { clearMyPhotos } from '@/services/myPhotosService';
import { useCorrectionStore } from '@/stores/correctionStore';
import { usePostStore } from '@/stores/postStore';

const MESSAGE = '서버에 연결하지 못했어요';
// 토스트를 띄우지 않는 화면이에요. 01 지도는 아래 가운데에 재생 막대가 있어 토스트가 가리고,
// 글을 쓰지 않고, 여행 다시 계산 실패는 자기 안내(JourneyRefreshNotice)가 있어요.
const NO_TOAST_PATHS = ['/map'];
// 여행 다시 계산 실패를 자기 화면에서 알려 주는 곳이에요(07 JourneyStatusNotice).
const JOURNEY_NOTICE_PATHS = [PHOTO_SORT_PATH];
// 내 사진 목록을 늘 읽으면서 실패를 알려 주지 않는 화면이에요(03 도시 블록).
// 00 홈(1년 전 이맘때)과 01 지도(도착 카드)는 그 부분이 있을 때만 읽어서, 여기서 읽으면 없던 요청이 생겨요.
// 02 챕터는 사진 목록이 실패하면 자기 화면에서 알려 줘요.
const PHOTO_SCREEN_PATHS = ['/places'];

function isUnder(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * 화면 뒤에서 불러오는 데이터가 실패하면 15b 토스트를 하나 띄워요
 *
 * 책임: 글 불러오기, 여행 다시 계산, 내 사진 목록 중 하나라도 실패해 있으면 "서버에 연결하지 못했어요"를 띄우고,
 * [다시 시도]로 실패한 것을 모두 다시 불러요. 다 성공하면 사라져요.
 *
 * 호출: AppLayout이 모든 페이지 위에 한 번 그려요. 받는 값은 없어요.
 * <BackgroundErrorToast />
 *
 * 의도:
 *  - 이 실패들은 화면에 안내 자리가 없어서, 실패해도 글·사진이 그냥 빠져 "원래 없는 것"처럼 보였어요(#200).
 *    피그마 15b는 원래 http 클라이언트 한 곳에서 띄우는 계획이었는데, Supabase로 바뀌며 그 한 곳이 없어져서
 *    실패 상태를 들고 있는 스토어·훅을 여기서 지켜봐요.
 *  - 여러 개가 실패해도 토스트는 하나예요. 사용자가 할 수 있는 일은 [다시 시도] 하나라 나눠 말하지 않아요.
 *
 * 주의할 것들:
 *  - 자기 화면에서 이미 알려 주는 실패는 그 화면에서 띄우지 않아요(겹치지 않게). JOURNEY_NOTICE_PATHS, PHOTO_SCREEN_PATHS를 보세요.
 *  - 01 지도에서는 아예 띄우지 않아요. 아래 재생 막대를 가리고, 지도는 알려 줄 실패가 없어요(NO_TOAST_PATHS).
 *  - 내 사진 목록은 스토어가 없어서 useMyPhotos를 직접 불러요. 사진을 늘 읽는 03에서만 불러서 요청이 늘지 않아요
 *    (myPhotosService가 계정마다 한 번만 읽어 둬요). 그래서 00 홈·01 도착 카드에서 사진만 실패하면 띄우지 않아요.
 *  - 저절로 사라지지 않아요. 실패가 남아 있는 동안 [다시 시도]를 누를 수 있어야 해서요.
 *  - 앱을 열 때 세션 확인 실패는 여기서 다루지 않아요(로그인 화면으로 가요).
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-266
 */
export default function BackgroundErrorToast() {
  const { pathname } = useLocation();
  if (NO_TOAST_PATHS.some((path) => isUnder(pathname, path))) return null;
  const watchesPhotos = PHOTO_SCREEN_PATHS.some((path) => isUnder(pathname, path));

  return watchesPhotos ? (
    <WithPhotos pathname={pathname} />
  ) : (
    <FailureToast pathname={pathname} isPhotosFailed={false} />
  );
}

function WithPhotos({ pathname }) {
  const { status } = useMyPhotos();
  return <FailureToast pathname={pathname} isPhotosFailed={status === 'error'} />;
}

function FailureToast({ pathname, isPhotosFailed }) {
  const isPostsFailed = usePostStore((state) => state.status === 'error');
  const fetchPosts = usePostStore((state) => state.fetch);
  const isJourneyFailed = useCorrectionStore((state) => state.journeyStatus === 'failed');
  const refreshJourney = useCorrectionStore((state) => state.refreshJourney);
  const showsJourney =
    isJourneyFailed && !JOURNEY_NOTICE_PATHS.some((path) => isUnder(pathname, path));

  if (!isPostsFailed && !showsJourney && !isPhotosFailed) return null;

  const handleRetry = () => {
    if (isPostsFailed) fetchPosts();
    if (showsJourney) refreshJourney();
    if (isPhotosFailed) clearMyPhotos();
  };

  return <ErrorToast message={MESSAGE} onRetry={handleRetry} />;
}
