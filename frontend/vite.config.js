import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 这行代码是关键：它告诉 Vite 把 "@" 指向 "src" 文件夹
      // 这样才能和你的 jsconfig.json 匹配上
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
