// frontend/src/App.jsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

// ← 导入 Admin 页面
import UsersPage from './pages/admin/UsersPage'
import BooksPage from './pages/admin/BooksPage'

// ← 新增：导入 Toaster（用于 toast 提示）
import { Toaster } from '@/components/ui/toaster'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      {/* ← 新增：全局 Toast 容器，放在 Routes 外面 */}
      <Toaster />
      
      <Routes>
        {/* 🏠 首页：保留原有 Vite 默认页面 */}
        <Route path="/" element={
          <>
            <section id="center">
              <div className="hero">
                <img src={heroImg} className="base" width="170" height="179" alt="" />
                <img src={reactLogo} className="framework" alt="React logo" />
                <img src={viteLogo} className="vite" alt="Vite logo" />
              </div>
              <div>
                <h1>Get started</h1>
                <p>
                  Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
                </p>
              </div>
              <button
                className="counter"
                onClick={() => setCount((count) => count + 1)}
              >
                Count is {count}
              </button>
            </section>

            <div className="ticks"></div>

            {/* ← 快速导航到 Admin 页面（开发用） */}
            <section id="next-steps">
              <div id="docs">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#documentation-icon"></use>
                </svg>
                <h2>Admin 管理端</h2>
                <p>快速进入管理页面</p>
                <ul>
                  <li>
                    <Link to="/admin/users" className="text-blue-600 hover:underline">
                      👥 用户管理
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/books" className="text-blue-600 hover:underline">
                      📚 图书管理
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 原有文档链接保留 */}
              <div id="social">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#social-icon"></use>
                </svg>
                <h2>Connect with us</h2>
                <p>Join the Vite community</p>
                <ul>
                  <li>
                    <a href="https://github.com/vitejs/vite" target="_blank">GitHub</a>
                  </li>
                  <li>
                    <a href="https://chat.vite.dev/" target="_blank">Discord</a>
                  </li>
                </ul>
              </div>
            </section>

            <div className="ticks"></div>
            <section id="spacer"></section>
          </>
        } />

        {/* 🔐 Admin 路由 */}
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/books" element={<BooksPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App