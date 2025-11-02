// 타입
// 트랜드프롭스

export type SubRankItem = { name: string; value: number };

export type SocialItem = {
  channel?: string;
  date?: string;   // YYYY-MM-DD
  content?: string;
  url?: string;
  subCategory?: string;
};

// 뉴스/소셜 타임라인 스키마
export type NewsTimeline = {
  [date: string]: {
    중분류목록: {
      [law: string]: {
        count: number;
        keyword?: string[];
        소분류목록?: Record<
          string,
          {
            count?: number;
            소분류?: string;
            대표뉴스?: string;
            articles?: { title: string; url: string; content: string }[];
          }
        >;
      };
    };
  };
};

export type SocialTimeline = {
  [date: string]: {
    찬성: number;
    반대: number;
    중립: number;
    [k: string]: unknown;
  };
};

// ./components/NivoTrendChart/types.ts
export type Sentiment = "찬성" | "반대";

export type TrendProps = {
  newsTimeline: Record<string, any>;
  socialTimeline: Record<string, any>;
  periodLabel?: string; 
  view: "news" | "social";
  setView: React.Dispatch<React.SetStateAction<"news" | "social">>;
  onSocialSliceClick?: (date: string, sentiment: Sentiment) => void;
};
