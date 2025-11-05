"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  title: string;
  showSearch?: boolean;
}

// const categoryList = [
//   { key: "privacy", name: "개인정보보호법" },
//   { key: "child", name: "아동복지법" },
//   { key: "safety", name: "중대재해처벌법" },
//   { key: "finance", name: "자본시장법" },
// ];

export default function Nav({
  title,
 
  showSearch = true,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"news" | "social" | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleCategoryClick = (
    basePath: string,
    categoryKey: string,
    categoryName: string
  ) => {
    const fullPath = `/${basePath}/category/${categoryKey}`;
    router.push(fullPath);
    setSelectedPath(
      `${basePath === "news" ? "뉴스분석" : "여론분석"} > ${categoryName}`
    );
    setActiveTab(null);
  };

  return (
    <div
      className="relative z-50"
      onMouseLeave={() => setActiveTab(null)} 
    >
   
      <nav
        className="fixed top-0 left-0 w-full h-[60px] bg-gray-900/10 flex justify-center shadow z-50 overflow-visible backdrop-blur-md"
        onMouseEnter={() => {}}
      >
        <div className="relative w-full h-full flex items-center px-6">
          <div className="absolute left-6 flex items-center">
            <img src="/icons/logo.png" alt="Logo" className="h-30 object-contain" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10">
            <Link
              href="/"
              className={`transition-colors rounded-lg p-1 text-xl ${
                pathname === "/"
                  ? "text-white font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              종합분석
            </Link>

            {/* 뉴스분석 */}
            {/* <button
              onMouseEnter={() => setActiveTab("news")}
              className={`transition-colors rounded-lg p-1 text-xl ${
                activeTab === "news"
                  ? "text-white font-semibold"
                  : pathname.startsWith("/news/category")
                  ? "text-white font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              뉴스분석
            </button> */}

            {/* 여론분석 */}
            {/* <button
              onMouseEnter={() => setActiveTab("social")}
              className={`transition-colors rounded-lg p-1 text-xl ${
                activeTab === "social"
                  ? "text-white font-semibold"
                  : pathname.startsWith("/social/category")
                  ? "text-white font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              여론분석
            </button> */}
          </div>

          
          <div className="absolute right-6 flex items-center space-x-4">
            {showSearch && (
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색"
                  className="pl-10 pr-3 py-2 rounded-2xl border border-white/30 bg-white/10 
                             text-white placeholder:text-white/50 
                             focus:outline-none focus:ring-2 focus:ring-white/30 
                             backdrop-blur-md transition w-52 shadow-sm"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="white"
                  className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-70"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
                  />
                </svg>
              </form>
            )}

            <Link
              href="/login"
              className="w-10 h-10 rounded-full bg-white/10 border border-white/30 
                         hover:bg-white/20 transition flex items-center justify-center shadow-sm"
              title="로그인 페이지로 이동"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.6}
                stroke="white"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0"
                />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      
      {activeTab === "news" && (
        <div
          className="fixed top-[60px] left-0 w-screen bg-white/80 border-t border-gray-200 shadow backdrop-blur-md z-40 transition-all duration-300 ease-in-out"
          onMouseEnter={() => setActiveTab("news")}
          onMouseLeave={() => setActiveTab(null)}
        >
          <div className="w-9/10 mx-auto flex overflow-x-auto gap-4 px-6 py-3">
            {categoryList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick("news", cat.key, cat.name)}
                className="px-4 py-2 text-sm rounded-full font-medium hover:text-black text-gray-600 whitespace-nowrap transition"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "social" && (
        <div
          className="fixed top-[60px] left-0 w-screen bg-white/80 border-t border-gray-200 shadow backdrop-blur-md z-40 transition-all duration-300 ease-in-out"
          onMouseEnter={() => setActiveTab("social")}
          onMouseLeave={() => setActiveTab(null)}
        >
          <div className="w-9/10 mx-auto flex overflow-x-auto gap-4 px-6 py-3">
            {categoryList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick("social", cat.key, cat.name)}
                className="px-4 py-2 text-sm rounded-full font-medium hover:text-black text-gray-600 whitespace-nowrap transition"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

  
      {selectedPath && (
        <div className="fixed top-[150px] right-8 text-sm text-gray-600 z-40 px-3 py-1 bg-white/80 rounded shadow">
          {selectedPath}
        </div>
      )}
    </div>
  );
}
