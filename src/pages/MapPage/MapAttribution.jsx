import { Link } from 'react-router';

import ExternalLink from '@/components/common/ExternalLink';
import { CREDITS_PATH, OSM_ATTRIBUTION, OSM_COPYRIGHT_URL } from '@/constants/credits';

/**
 * 01 오른쪽 아래 구석의 데이터 출처 표기예요(#205).
 *
 * 호출: MapPage
 *
 * 의도:
 *  - 지점 이름을 OpenStreetMap 데이터로 찾아서 OSM 표기와 저작권 안내 링크를 둬요.
 *    세계 지도 모양은 OSM이 아니라서(Natural Earth) 무엇의 출처인지 앞에 '지점 이름'을 붙여요.
 *  - 지도 · 사진의 출처는 [출처]로 가는 페이지(/credits)에 모았어요.
 *  - 피그마 01에 자리가 없어서, 타임라인과 도착 카드 아래 빈 줄에 작은 글자로 둬요.
 */
export default function MapAttribution() {
  return (
    <p className="absolute right-8 bottom-2 flex gap-1.5 text-2xs whitespace-nowrap text-muted">
      <span>지점 이름</span>
      <ExternalLink href={OSM_COPYRIGHT_URL}>{OSM_ATTRIBUTION}</ExternalLink>
      <span aria-hidden="true">·</span>
      <Link to={CREDITS_PATH} className="underline underline-offset-2 hover:text-accent">
        출처
      </Link>
    </p>
  );
}
