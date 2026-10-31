// "넣으면 이렇게 묶여요" 예시 카드.

import { photoSource } from '@/hooks/usePhoto';

// 실제 계산 결과가 아니라 고정적인 예시입니다.
const EXAMPLE_TRIPS = [
  {
    name: '밴쿠버 · 밴프',
    meta: '2025.08.20 – 08.27 · 사진 142장',
    fileKeys: [
      'public:/photos/vancouver-1.webp',
      'public:/photos/banff-1.webp',
      'public:/photos/banff-2.webp',
    ],
  },
  {
    name: '오사카 · 교토',
    meta: '2025.03.11 – 03.15 · 사진 96장',
    fileKeys: [
      'public:/photos/osaka-2.webp',
      'public:/photos/osaka-1.webp',
      'public:/photos/kyoto-2.webp',
    ],
  },
  {
    name: '전주',
    meta: '2024.10.03 – 10.04 · 사진 38장',
    fileKeys: [
      'public:/photos/jeonju-3.webp',
      'public:/photos/jeonju-4.webp',
      'public:/photos/jeonju-5.webp',
    ],
  },
];

/**
 * 13a″ 아래쪽 "넣으면 이렇게 묶여요" 예시
 *
 * 책임: 사진을 넣으면 여행별로 묶인다는 걸 흐린 예시 카드 세 장으로 보여 줍니다.
 * 호출: SelectPhotosStep
 */
export default function ExampleTripCards() {
  return (
    <section>
      <p className="text-xs leading-normal font-medium tracking-[0.04em] text-dim">
        넣으면 이렇게 묶여요 . 예시
      </p>
      <ul className="mt-5 grid gap-6 md:grid-cols-3">
        {EXAMPLE_TRIPS.map((trip) => (
          <li key={trip.name} className="bg-white p-3 opacity-55">
            <div className="grid grid-cols-3 gap-1.5">
              {trip.fileKeys.map((fileKey) => (
                <img
                  key={fileKey}
                  src={photoSource(fileKey, 'thumb')}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ))}
            </div>
            <p className="mt-3.5 text-lg font-bold text-ink">{trip.name}</p>
            <p className="mt-1.5 text-sm text-muted">{trip.meta}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
