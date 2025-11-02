// 로그인 

'use client'
import React, { useState } from 'react';
import BackgroundGradient from '@/shared/layout/BackgroundGradient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!email || !password) {
        alert('이메일과 비밀번호를 입력하세요.');
        return;
      }

      const dummyToken = 'dummy-token';
      localStorage.setItem('token', dummyToken);
      alert('로그인 성공!');
      window.location.href = '/';
    } catch (error) {
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full relative min-h-screen flex items-center justify-center text-[#2D2928] overflow-hidden">
      {/* ===== 배경 레이어: 대시보드와 동일 팔레트 ===== */}
      <BackgroundGradient
             stops={["#ced7dc", "#eaebed", "#f6efec", "#f8e7e0"]}
             highlights
             glass
           />

      {/* ===== 로그인 카드 ===== */}
      <div className="relative z-10 flex min-h-full flex-col justify-center px-8 py-20 lg:px-20 shadow-xl border border-white/40 rounded-xl bg-white/60 backdrop-blur-md">
        <div className="w-100">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-[#2D2928]">
            Team name
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-[#2D2928]">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md bg-white/80 px-3 py-1.5 text-base text-[#2D2928] outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-[#2D2928]">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md bg-white/80 px-3 py-1.5 text-base text-[#2D2928] outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-[#2D2928] px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-[#4b4745] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                Sign in
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm/6 text-[#2D2928]/70">
            Not a member?{' '}
            <a href="/join" className="font-semibold text-indigo-600 hover:text-indigo-500">
              회원가입
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
