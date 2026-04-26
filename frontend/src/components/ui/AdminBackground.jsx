// frontend/src/components/ui/AdminBackground.jsx (Librarian/Student 同理替换)
import './DashboardBackground.css';

// 🔹 [P0] 修改：解构接收 className 参数
export default function AdminBackground({ className = "" }) {
  return (
    // 🔹 [P0] 修改：将 className 透传到根 div，外层样式会注入 pointer-events-none
    <div className={`dashboard-background admin-bg ${className}`}>
      <div className="bg-shapes">
        <div className="icon-shape admin-crown">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="shape users-group">
          <div className="user-circle"></div>
          <div className="user-circle"></div>
          <div className="user-circle"></div>
        </div>
        <div className="geometric-shape square-1"></div>
        <div className="geometric-shape circle-1"></div>
        <div className="geometric-shape triangle-1"></div>
        <div className="grid-pattern"></div>
      </div>
    </div>
  );
}