// frontend/src/components/ui/StudentBackground.jsx
import './DashboardBackground.css';

// 🔹 [P0] 修复：随机位置改为确定性生成，避免 SSR 水合不匹配
const DOTS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${15 + (i * 7) % 85}%`,      // 确定性分布，范围 15% ~ 99%
  top: `${8 + (i * 9) % 84}%`,       // 确定性分布，范围 8% ~ 92%
  delay: `${i * 0.3}s`,
}));

// 🔹 [P0] 修改：解构接收 className 参数
export default function StudentBackground({ className = "" }) {
  return (
    // 🔹 [P0] 修改：将 className 透传到根 div
    <div className={`dashboard-background student-bg ${className}`}>
      <div className="bg-shapes">
        {/* 书本堆叠 */}
        <div className="stack books-stack-1">
          <div className="book-shape"></div>
          <div className="book-shape"></div>
          <div className="book-shape"></div>
        </div>
        
        {/* 学习图标 */}
        <div className="icon-shape graduation-cap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        
        {/* 装饰线条 */}
        <div className="decorative-line line-1"></div>
        <div className="decorative-line line-2"></div>
        
        {/* 圆点装饰 */}
        {DOTS.map((dot) => (
          <div
            key={dot.id}
            className="dot"
            style={{
              left: dot.left,
              top: dot.top,
              animationDelay: dot.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}