/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // ============ 黑白灰阶主题 ============
        // cream 系：背景/卡片（白/浅灰）
        cream: {
          50: "#FFFFFF",   // 纯白主背景
          100: "#FAFAFA",  // 浅灰背景
          200: "#FFFFFF",  // 卡片白
          300: "#E5E5E5",  // 浅灰边框
        },
        // ink 系：文字（黑/深灰）
        ink: {
          DEFAULT: "#1A1A1A",  // 主黑文字
          soft: "#666666",     // 次灰文字
          mute: "#999999",     // 弱灰文字
        },
        // gold 系：强调色（Ins 品牌色）
        gold: {
          DEFAULT: "#E1306C",  // Ins 粉红
          deep: "#C13584",    // Ins 深粉
          soft: "#F77737",    // Ins 珊瑚
          tint: "#FCAF45",    // Ins 黄
        },
        // coffee 系：辅助强调（深灰）
        coffee: {
          DEFAULT: "#333333",  // 深灰辅助
          line: "#E5E5E5",     // 边框色
        },
        // note 系：便签色（保留彩色，用户指定便签保留彩色）
        note: {
          yellow: "#FFF4D6",
          pink: "#FCE0E6",
          blue: "#D6E6F2",
        },
        rust: {
          DEFAULT: "#D32F2F",  // 保留红色用于删除/警告
        },
      },
      fontFamily: {
        hand: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        soft: '8px',
        card: '12px',
      },
      boxShadow: {
        paper: '0 1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.05)',
        polaroid: '0 2px 12px rgba(0,0,0,0.08)',
        note: '0 1px 4px rgba(0,0,0,0.04)',
        soft: '0 1px 2px rgba(0,0,0,0.04)',
        ins: '0 8px 24px rgba(0,0,0,0.12)',
      },
      backgroundImage: {
        // Ins 品牌渐变
        'ins-gradient': 'linear-gradient(45deg, #F5853F 0%, #FCAF45 25%, #E1306C 50%, #C13584 75%, #833AB4 100%)',
        'ins-gradient-soft': 'linear-gradient(45deg, #FCAF45, #E1306C, #833AB4)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
