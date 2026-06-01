import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 抑制 radix-ui Portal 与 React 的 removeChild 冲突（已知兼容性问题，不影响功能）
const originalRemoveChild = Node.prototype.removeChild
Node.prototype.removeChild = function (child) {
  try {
    return originalRemoveChild.call(this, child)
  } catch {
    if (child.parentNode === this) {
      return originalRemoveChild.call(this, child)
    }
    return child
  }
}

createRoot(document.getElementById('root')).render(<App />)
