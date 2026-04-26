// frontend/src/components/ui/LibrarianBackground.jsx
import './DashboardBackground.css';

// 固定浮动元素位置，避免 SSR 水合不匹配
const FLOATING_ELEMENTS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${10 + i * 12}%`,
  delay: `${i * 0.5}s`,
}));

// 🔹 [P0] 修改：解构接收 className 参数
export default function LibrarianBackground({ className = "" }) {
  return (
    // 🔹 [P0] 修改：将 className 透传到根 div
    <div className={`dashboard-background librarian-bg ${className}`}>
      <div className="bg-shapes">
        {/* 图书馆图标 */}
        <div className="icon-shape library-building">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4 8 4v14"/>
            <path d="M9 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            <path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"/>
          </svg>
        </div>
        
        {/* 书架 */}
        <div className="bookshelf">
          <div className="shelf"></div>
          <div className="shelf"></div>
          <div className="shelf"></div>
        </div>
        
        {/* 装饰波浪 */}
        <div className="wave wave-1"></div>
        <div className="wave wave-2"></div>
        
        {/* 浮动元素 */}
        {FLOATING_ELEMENTS.map((el) => (
          <div
            key={el.id}
            className="floating-element"
            style={{
              left: el.left,
              animationDelay: el.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}