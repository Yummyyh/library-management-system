import './LoginBackground.css';

// ✅ 修复：将随机值生成移到组件外部（模块级别），只在加载时执行一次
const BOOKS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  delay: `${i * 0.5}s`,
  duration: `${15 + Math.random() * 10}s`,
  left: `${10 + Math.random() * 80}%`,
  top: `${20 + Math.random() * 60}%`,
}));

const CIRCLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  left: `${5 + i * 18}%`,
  bottom: `${-50 + Math.random() * 100}px`,
  delay: `${i * 1.5}s`,
}));

export default function LoginBackground({ className = "" }) {
  return (
    <div className={`login-background ${className}`}>
      {/* 漂浮的书本 */}
      <div className="floating-books">
        {BOOKS.map((book) => (
          <div
            key={book.id}
            className={`book book-${book.id + 1}`}
            style={{
              '--delay': book.delay,
              '--duration': book.duration,
              left: book.left,
              top: book.top,
            }}
          >
            <div className="book-cover">
              <div className="book-spine"></div>
              <div className="book-pages"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 装饰性元素 */}
      <div className="decorative-circles">
        {CIRCLES.map((circle) => (
          <div
            key={circle.id}
            className={`circle circle-${circle.id + 1}`}
            style={{
              left: circle.left,
              bottom: circle.bottom,
              animationDelay: circle.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}