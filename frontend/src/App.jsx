import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// ======================
// 1. 页面组件导入
// ======================

// 统一登录页
import LoginPage from './pages/LoginPage'

// Admin 页面
import AdminDashboard from './pages/admin/AdminDashboard'
import UsersPage from './pages/admin/UsersPage'
import SettingsPage from './pages/admin/SettingsPage'

// Librarian 页面
import LibrarianDashboard from './pages/librarian/LibrarianDashboard'
import BorrowBook from './pages/librarian/BorrowBook'
import ReturnBook from './pages/librarian/ReturnBook'
import LibrarianBooksPage from './pages/librarian/BooksPage' // 对应文件名 BooksPage.jsx
import OverduePage from './pages/librarian/OverduePage'
import LibrarianHoldsPage from './pages/librarian/LibrarianHoldsPage'

// Student 页面
import StudentDashboard from './pages/student/StudentDashboard'
import StudentBooksPage from './pages/student/StudentBooksPage'
import StudentRegisterPage from './pages/student/StudentRegisterPage'
import StudentLoansPage from './pages/student/StudentLoansPage'
import BookDetailPage from './pages/BookDetailPage'
import StudentFinePage from './pages/student/StudentFinePage'
import StudentHoldsPage from './pages/student/StudentHoldsPage'

// UI 组件
import { Toaster } from '@/components/ui/toaster'

// ======================
// 2. 路由守卫 (Guards)
// ======================
const AdminGuard = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  return token ? children : <Navigate to="/login" replace />;
};

const LibrarianGuard = ({ children }) => {
  const token = localStorage.getItem('librarian_token');
  return token ? children : <Navigate to="/login" replace />;
};

const StudentGuard = ({ children }) => {
  const token = localStorage.getItem('student_token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* 🏠 首页默认跳转登录 */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 🔐 登录与注册 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student/register" element={<StudentRegisterPage />} />

        {/* 👑 Admin 路由 */}
        <Route path="/admin" element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        } />
        <Route path="/admin/users" element={
          <AdminGuard>
            <UsersPage />
          </AdminGuard>
        } />
        <Route path="/admin/settings" element={
          <AdminGuard>
            <SettingsPage />
          </AdminGuard>
        } />
        {/* ✅ 已移除 /admin/books，Admin 不再有图书管理权限 */}

        {/* 📖 Librarian 路由 */}
        <Route path="/librarian" element={
          <LibrarianGuard>
            <LibrarianDashboard />
          </LibrarianGuard>
        } />
        <Route path="/librarian/borrow" element={
          <LibrarianGuard>
            <BorrowBook />
          </LibrarianGuard>
        } />
        <Route path="/librarian/return" element={
          <LibrarianGuard>
            <ReturnBook />
          </LibrarianGuard>
        } />
        <Route path="/librarian/books" element={
          <LibrarianGuard>
            <LibrarianBooksPage />
          </LibrarianGuard>
        } />
        <Route path="/librarian/books/:bookId" element={
          <LibrarianGuard>
            <BookDetailPage />
          </LibrarianGuard>
        } />
        <Route path="/librarian/overdue" element={
          <LibrarianGuard>
            <OverduePage />
          </LibrarianGuard>
        } />
        <Route path="/librarian/holds" element={
          <LibrarianGuard>
            <LibrarianHoldsPage />
          </LibrarianGuard>
        } />

        {/* 🎓 Student 路由 */}
        <Route path="/student" element={
          <StudentGuard>
            <StudentDashboard />
          </StudentGuard>
        } />
        <Route path="/student/books" element={
          <StudentGuard>
            <StudentBooksPage />
          </StudentGuard>
        } />
        <Route path="/student/books/:bookId" element={
          <StudentGuard>
            <BookDetailPage />
          </StudentGuard>
        } />
        <Route path="/student/my-loans" element={
           <StudentGuard>
            <StudentLoansPage />
           </StudentGuard>
        } />
        <Route path="/student/fine" element={
           <StudentGuard>
            <StudentFinePage />
          </StudentGuard>
        } />
        <Route path="/student/holds" element={
           <StudentGuard>
            <StudentHoldsPage />
           </StudentGuard>
        } />

        {/* 404 处理 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
