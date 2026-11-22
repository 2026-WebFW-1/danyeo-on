import ExternalLink from '@/components/common/ExternalLink';
import {
  NATURAL_EARTH_URL,
  OSM_ATTRIBUTION,
  OSM_COPYRIGHT_URL,
  WORLD_ATLAS_URL,
} from '@/constants/credits';
import { usePhotoCredits } from '@/hooks/usePhotoCredits';

import PhotoCreditList from './PhotoCreditList';

const SECTION_CLASS = 'flex flex-col gap-3';
const HEADING_CLASS = 'text-2xl font-bold text-ink';
const BODY_CLASS = 'text-md leading-body-md text-body';

/**
 * 밖에서 받아 쓰는 데이터의 출처를 모은 페이지(#205)
 *
 * 책임: 지점 이름(OpenStreetMap) · 세계 지도(Natural Earth) · 데모 사진의 출처와 라이선스를 보여 줍니다.
 * 호출: App의 Routes가 /credits 주소에서 그립니다. 01 지도 구석의 [출처]로 들어옵니다(MapAttribution).
 *
 * 의도:
 *  - 지점 이름은 01 · 02 · 03 · 05에 다 나와서 화면마다 적지 않고 한 곳에 모읍니다. 01에는 OSM 표기를 따로 둡니다.
 *  - 데모 사진은 로그인한 계정이 실제로 쓰는 사진만 보여 줍니다(usePhotoCredits).
 *    직접 올린 사진만 있는 계정은 밝힐 출처가 없어서 사진 영역을 그리지 않습니다.
 *  - CC BY · CC BY-SA는 고친 내용도 밝혀야 해서, 크기 · 형식을 바꾸고 촬영 정보를 새로 붙였다고 적습니다.
 *
 * 주의할 점: 피그마에 디자인이 없는 화면입니다. 03 · 05의 글자 크기와 여백을 따랐습니다.
 */
export default function CreditsPage() {
  const { credits, status } = usePhotoCredits();

  return (
    <main className="flex-1 bg-canvas">
      <div className="mx-auto flex w-full max-w-360 flex-col gap-14 px-30 py-24">
        <header className="flex flex-col gap-3">
          <p className="text-xs text-muted">CREDITS</p>
          <h1 className="text-5xl font-bold text-ink">출처</h1>
          <p className={BODY_CLASS}>이 서비스가 밖에서 받아 쓰는 데이터와 그 출처예요.</p>
        </header>

        <section aria-labelledby="credits-place" className={SECTION_CLASS}>
          <h2 id="credits-place" className={HEADING_CLASS}>
            지점 이름
          </h2>
          <p className={BODY_CLASS}>
            사진 위치의 도시 · 나라 이름은 OpenStreetMap 데이터를 Nominatim으로 찾아요.{' '}
            <ExternalLink href={OSM_COPYRIGHT_URL}>{OSM_ATTRIBUTION}</ExternalLink> · ODbL
          </p>
        </section>

        <section aria-labelledby="credits-map" className={SECTION_CLASS}>
          <h2 id="credits-map" className={HEADING_CLASS}>
            세계 지도
          </h2>
          <p className={BODY_CLASS}>
            나라 모양은 <ExternalLink href={NATURAL_EARTH_URL}>Natural Earth</ExternalLink>(퍼블릭
            도메인)의 데이터이고, <ExternalLink href={WORLD_ATLAS_URL}>world-atlas</ExternalLink>
            (ISC · © Michael Bostock)로 받아요.
          </p>
        </section>

        {status === 'loading' && (
          <p role="status" className="text-md text-muted">
            사진 출처를 불러오는 중이에요.
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="text-md text-body">
            사진 출처를 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {credits.length > 0 && (
          <section aria-labelledby="credits-photo" className={SECTION_CLASS}>
            <h2 id="credits-photo" className={HEADING_CLASS}>
              데모 사진 <span className="text-lg font-medium text-muted">{credits.length}장</span>
            </h2>
            <p className={BODY_CLASS}>
              아래 사진은 위키미디어 공용에서 받았어요. 크기를 줄여 WebP로 바꿨고, 촬영 시각 ·
              위치는 시연용으로 만든 값이에요. 제목을 누르면 원본으로 가요.
            </p>
            <PhotoCreditList credits={credits} />
          </section>
        )}
      </div>
    </main>
  );
}
