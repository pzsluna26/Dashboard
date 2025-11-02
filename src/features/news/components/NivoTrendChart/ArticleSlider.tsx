// 뉴스분석
// 기사슬라이드

'use client';

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y, Keyboard, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import InfoTooltip from "@/shared/layout/InfoTooltip";
import { MutableRefObject } from "react";
import { formatPeriodDate } from "@/shared/utils/period";

type Article = {
  title: string;
  url: string;
  content: string;
  thumbnail?: string;
};

type Props = {
  slideRef: MutableRefObject<HTMLDivElement | null>;
  date: string;
  mid: string;
  sub: string;
  articles: Article[];
  onClose: () => void;
  periodLabel: string;
  slug: string;
};

export default function ArticleSlider({
  slideRef,
  date,
  mid,
  sub,
  articles,
  onClose,
  periodLabel,
  slug,
}: Props) {
  const displayDate = formatPeriodDate(periodLabel, date);

  // 🔹 slug별 이미지 매핑
  const imageMap: { [key: string]: string[] } = {
    privacy: ['slug1-1.jpg', 'slug1-2.jpg', 'slug1-3.jpg', 'slug1-4.jpg', 'slug1-5.jpg', 'slug1-6.jpg'],
    child: ['slug2-1.jpg', 'slug2-2.jpg', 'slug2-3.jpg', 'slug2-4.jpg', 'slug2-5.jpg', 'slug2-6.jpg'],
    finance: ['slug3-1.jpg', 'slug3-2.jpg', 'slug3-3.jpg', 'slug3-4.jpg', 'slug3-5.jpg', 'slug3-6.jpg'],
    safety: ['slug4-1.jpg', 'slug4-2.jpg', 'slug4-3.jpg', 'slug4-4.jpg', 'slug4-5.jpg', 'slug4-6.jpg'],
  };


  const fallbackImages = imageMap[slug] || [];
  console.log(fallbackImages)
  // ✅ 썸네일이 없으면 이미지 매핑

  const articlesWithThumbnails = articles.map((article, index) => ({
    ...article,
    thumbnail: article.thumbnail || `/article/${fallbackImages[index % fallbackImages.length]}`,
  }));



  return (
    <div
      ref={slideRef}
      className="w-full p-5 mt-6 bg-white backdrop-blur-md border border-white/20 rounded-xl text-neutral-700
      backdrop-blur-md p-6 rounded-xl shadow-md border border-white/50"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-2xl"
              style={{ fontFamily: "'Black Han Sans', sans-serif" }}
            >{periodLabel}간 브리핑</h4>
            {/* <InfoTooltip iconSize={24}>
              <p>
                선택한 <strong>{periodLabel} 기준</strong>의 피크일 기사들을 확인할 수 있습니다.
              </p>
              <p className="mt-1">
                카드 하단의 <strong>원문 보기</strong>를 클릭하면 해당 뉴스 페이지로 이동합니다.
              </p>
            </InfoTooltip> */}
          </div>
          <p className="text-sm text-neutral-600">
            {displayDate ?? date} / 테마: {mid} / 사건: {sub}
          </p>
        </div>
      </div>

      {/* 슬라이드 */}
      <Swiper
        modules={[A11y, Keyboard, Autoplay]}
        pagination={{ clickable: false }}
        keyboard={{ enabled: true }}
        spaceBetween={24}
        slidesPerView={4}
        breakpoints={{
          0: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 4 },
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        loop
        className="pb-8"
      >
        {articlesWithThumbnails.map((a, idx) => (

          <SwiperSlide key={idx}>
            <div
              className="group flex flex-col h-[400px] bg-white/80 border border-white/10 backdrop-blur-md 
               rounded-xl overflow-hidden shadow-xl hover:shadow-xl active:shadow-2xl 
               transition-transform duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {/* 썸네일 */}
              {a.thumbnail ? (
                <>
                  {console.log("📸 이미지 src:", a.thumbnail)}
                  <div className="h-[160px] w-full overflow-hidden">
                    <img
                      src={a.thumbnail}
                      alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </>
              ) : (
                <div className="h-[160px] w-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                  이미지 없음
                </div>
              )}


              {/* 내용 */}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <h5 className="text-base font-semibold mb-2 line-clamp-2 group-hover:text-sky-700 transition-colors">
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.title}
                    </a>
                  </h5>
                  <p className="text-sm text-neutral-700 line-clamp-4">{a.content}</p>
                </div>

                <div className="mt-4">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-[#5E936C] hover:text-[#3E5F44] hover:underline underline-offset-2"
                  >
                    원문 보기
                  </a>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
