
### 👩🏻‍⚖️ [2025 AI DATA 경진대회 ] 뉴스 및 소셜 데이터를 활용한 AI 입법 수요 분석 서비스 개발

    - 대회일정: 2025. 07.14(월) ~ 12. 03(수)
    - 주최: 국가과학기술연구회, 대전광역시, 해양경찰청, 국회도서관, 대전중구청
    - 주관: 한국과학기술정보연구원(KISTI)
    - 후원: (사)한국콘텐츠학회
    - 주제: 뉴스 및 소셜 데이터를 활용한 AI 입법 수요 분석 서비스 모델 개발


</br>

## 🕰️ 프로젝트 기간 및 인원
 
- 일정: 2025.08.29 - 2025.11.10 (총 12주)
- 인원: 4명

</br>

## 👩🏻‍🎨 역할 및 상세내용
- 역할: 프론트엔드
     - 대시보드 구조 설계 및 구현
        - Next.js 14 App Router 기반으로 대시보드 페이지 구조 설계 및 구축
        - 레이아웃과 각 section을 컴포넌트 단위로 모듈화하여 유지보수 편의성 확보
        - 컴포넌트 중심의 설계로 시각화, 네트워크 그래프, 요약 KPI 등을 논리적으로 분리
        - features/total/components/ 내부에 각 기능별 컴포넌트를 분리
        - shared/layout, shared-ui, shared/constants, shared/utils 등으로 기능적 책임 분리

    -  데이터 시각화 컴포넌트 개발 
        - Recharts, Highcharts 기반의 사용자 정의 시각화 컴포넌트 다수 제작
        - KPI 누적 트렌드, stacked area chart, heatmap, 반원 pie chart 등 다양한 유형 구현
        - SocialBarChart, LegislativeStanceArea, Heatmap, NetworkGraph 등 시각화 컴포넌트에 사용자 경험을 위한 툴팁, 강조, 애니메이션 등 세부 UX 추가
        - 색상 스케일링, 데이터 누적 처리, 자동 요약 생성 등 사용자 중심 UX 강화
        (예: 그래프 데이터 자동 요약(badge, 분석 insight 생성),
        예: 누적값 표현을 위해 수치 누산 및 비율 변환 로직 구성)
    - 동적 렌더링 및 성능 최적화
        - 클라이언트 사이드 렌더링(CSR) 기반 컴포넌트
        - next/dynamic으로 그래프, 차트, Force-Graph 등 무거운 컴포넌트 lazy load
        - loading fallback을 지정해 사용자 경험 개선
        - 네트워크 그래프의 force layout 성능 최적화
        - react-force-graph-2d에서 collide, charge, distance force 조정 및 repel 커스텀 force 직접 구성
        - 시뮬레이션 반복 조절 및 노드 간 충돌 방지로 렌더링 부하 최소화
    - 데이터 연동 로직 구현
        - 서버 API 연동 및 데이터 가공 로직을 훅(features/total/hooks/)으로 모듈화
        - useKpiSummary, useLegalTop5, useNetworkGraph, useSocialBar, useStanceArea, useHeatmap 각각 API 호출, 캐싱, 가공 처리 담당
        - API에서 수신한 원시 데이터를 누적/비율/정렬 등 목적에 맞게 가공
        (예: 시간 누적형 KPI, 의견 분포 누적, 네트워크 노드 연결 최적화 등)
    - UI 및 스타일링 (웹 대시보드, 로그인 페이지 구현)
        -TailwindCSS 기반으로 반응형 UI 설계 및 시멘틱한 클래스 네이밍 유지
        - 시각적 일관성을 위해 배경 흐림 효과(backdrop-blur), gradient, 투명도 조절 등 스타일 요소 통일
        - 모든 그래프 컴포넌트에 설명 툴팁, hover, active, legend 등 UX 강화 요소 적용
        - 사용자 행동을 유도하는 상호작용 요소 삽입 (예: 그래프 항목 클릭 시 상세 정보 표시)
        - 디자인 시스템처럼 재사용 가능한 UI 컴포넌트 구성
        (예: ChartCard, Badge, LegendSwatch, TooltipContent 등 다양한 shared 컴포넌트 정의)

</br>

## 💡 기술적 도전 / 문제 해결 사례
- '수작업의 한계' : 비정형·파편화된 여론 데이터 분석에 막대한 시간과 비용 소모
    - 해결 : 
- '단순 분석의 한계' : 단순 찬반 분류로는 구체적인 정책 방향성 파악 불가
    - 해결
- '객관성의 부재' : 이슈의 중요도와 시급성을 객관적으로 평가하기 어려움
    - 해결

</br>

## 🔧 개발 환경, 주요 기술 스택
- 개발환경
    - 프레임워크: Next.js (React 18, TypeScript)
    - 렌더링: 클라이언트 사이드 렌더링(CSR, Client-Side Rendering)
    - 효과: 사용자 상호작용 시 빠른 화면 전환 및 부드러운 인터페이스 제공
- 주요 기술 스택
    - 데이터 시각화: Recharts, Highcharts, react-force-graph-2d
    - UI/스타일링: TailwindCSS, Lucide Icons
    - 상태 및 데이터 관리: Fetch API, React Hooks (useEffect, useMemo)
    - 렌더링 최적화: Dynamic Import, Suspense (로딩 중 대체 UI 표시)

</br>


## 🔗 코드 및 리소스 링크
- FrontEnd
https://github.com/pzsluna26/dashboard.git
- Backend
https://github.com/Young6575/Dashboard-Backed.git
https://github.com/Young6575/Dashboard-backed_security.git
- DataAnalysis
https://github.com/heeaayoon/data
    
</br>

## 📽️ 시연영상

https://youtu.be/rvLSk8aTsyQ

</br>

## 📸 대시보드 미리보기
![프로젝트 미리보기](./public/preview/dashboard.png)
- KPI Summary
    -  사용자 지정 기간 단위로 뉴스/여론 지표 누적 추이 시각화
    -  Recharts AreaChart 기반의 시계열 그래프 구성
-LegalTop5
    -  여론분포(개정강화/폐지완화/현상유지) 중 가장 뜨거운 관심을 받은 상위 5개 법조항 기준으로 시각화
    -  자동 슬라이드 애니메이션으로 랭킹 순위 강조
- NetworkGraph
    -  법조항-사건 관계를 2D 네트워크 그래프로 표시
    -  React-force-graph-2d 의 Force Simulation 으로 노드 간 관계를 동적으로 표현
- SocialBarChart
    -  법안별 여론 입장(개정강화/폐지완화/현상유지)을 누적 막대그래프로 표시
    -  비율/건수 모드를 토글하여 시각화 방식 전환 가능
- LegislativeStanceArea
    -  기간별 여론성향의 비율 변화를 시계열 면적 그래프로 시각화
    -  Highcharts의 Percent Stacked Area Chart를 활용하여 각 입장의 상대적 비중 변화를 직관적으로 표현
    -  useMEmo로 증감률 및 요약 인사이트를 계산하여 렌더링 성능을 최적화
    -  차트 하단에는 항목별 증감률 및 주요 인사이트를 텍스트로 요약 표시
- Heatmap
    -   법안별 입장 분포를 색상강도로 시각화
    -  HighCharts  Heatmap 모듈 기반

</br>

## ⚙️ 기술 스택
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)

</br>

## 🧬 프로젝트 구조
```
 src/
 ├─ app/
 │   └─ page.tsx
 │
 ├─ features/
 │   └─ total/
 │       ├─ components/
 │       │   ├─ KpiSummary.tsx
 │       │   ├─ LegalTop5.tsx
 │       │   ├─ NetworkGraph.tsx
 │       │   ├─ NetworkGraphContainer.tsx
 │       │   ├─ SocialBarChart.tsx
 │       │   ├─ LegislativeStanceArea.tsx
 │       │   └─ Heatmap.tsx
 │       └─ hooks/
 │           ├─ useKpiSummary.ts
 │           ├─ useLegalTop5.ts
 │           ├─ useNetworkGraph.ts
 │           ├─ useSocialBar.ts
 │           ├─ useStanceArea.ts
 │           └─ useHeatmap.ts
 │
 ├─ shared/
 │   ├─ api/
 │   │   ├─ client.ts
 │   │   └─ dashboard.ts
 │   ├─ constants/
 │   │   └─ mapping.ts
 │   ├─ types/
 │   │   ├─ common.ts
 │   │   └─ dashboard.ts
 │   └─ utils/
 │       ├─ date.ts
 │       ├─ format.ts
 │       └─ insights.ts
 │
 └─ shared-ui/
     └─ HalfPieChart.tsx 
```
</br>

