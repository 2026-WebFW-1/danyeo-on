import { useState } from 'react';

import { usePhoto } from '@/hooks/usePhoto';

/**
 * 05 기록 카드 하나예요. 위에 그 기록의 대표 사진을 두고, 아래에 이름 · 값 · 설명을 차례로 적어요.
 *
 * 호출: RecordsSection이 formatPassportRecords의 결과를 하나씩 넘겨요.
 * <RecordCard card={{ label: 'LONGEST STAY', value: '밴쿠버 · 57일', description: '…', coverFileKey: 'public:/photos/vancouver-6.webp' }} />
 *
 * 의도:
 *  - 피그마의 사진은 예시라서, 그 기록이 가리키는 지점의 실제 대표 사진(coverFileKey)을 써요.
 *    사진이 없거나 못 열면 회색 칸이에요(CityPhoto와 같아요). 사진은 글을 꾸미는 자리라 alt를 비워요.
 *  - 칸이 378px이라 400px 썸네일은 선명한 화면에서 흐려서 full을 쓰고, 화면 밖이면 늦게 받아요.
 *
 * @param {object} props
 * @param {import('@/types').PassportRecordCard} props.card
 */
export default function RecordCard({ card }) {
  const { label, value, description, coverFileKey } = card;
  const src = usePhoto(coverFileKey, 'full');
  // 못 연 주소만 기억하면, 주소가 바뀌었을 때 effect 없이 다시 시도해요.
  const [failedSrc, setFailedSrc] = useState(null);

  return (
    <li className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="h-62.5 overflow-hidden bg-line">
        {src && src !== failedSrc && (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(src)}
            className="size-full object-cover"
          />
        )}
      </div>
      <p className="font-serif text-xs font-bold tracking-[0.2em] text-accent uppercase">{label}</p>
      <p className="text-4xl font-bold text-ink">{value}</p>
      <p className="text-lg leading-body-lg text-body">{description}</p>
    </li>
  );
}
