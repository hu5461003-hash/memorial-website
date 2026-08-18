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
        // ============ Ins 风配色 ============
        // 重新定义原有 token 名，颜色值改为 Ins 风
        // cream 系：背景/卡片
        cream: {
          50: "#FFFFFF",   // 主背景白
          100: "#FAFAFA",  // 浅灰背景
          200: "#FFFFFF",  // 卡片白
          300: "#DBDBDB",  // Ins 标志性浅灰边框
        },
        // ink 系：文字
        ink: {
          DEFAULT: "#262626",  // Ins 主黑
          soft: "#8E8E8E",     // Ins 次灰
          mute: "#C7C7C7",     // Ins 弱灰
        },
        // gold 系：强调色（保留 token 名，改为 Ins 红粉渐变色阶）
        gold: {
          DEFAULT: "#E1306C",  // Ins 主红粉
          deep: "#C13584",    // Ins 深紫红
          soft: "#F5853F",    // Ins 橙
          tint: "#FCAF45",    // Ins 黄
        },
        // coffee 系：辅助强调（改为 Ins 紫）
        coffee: {
          DEFAULT: "#833AB4",  // Ins 紫
          line: "#DBDBDB",     // Ins 浅灰边框（与 cream-300 一致）
        },
        // note 系：便签色（柔和 ins 风）
        note: {
          yellow: "#FFF4D6",
          pink: "#FCE0E6",
          blue: "#D6E6F2",
        },
        rust: {
          DEFAULT: "#ED4956",  // Ins 危险红
        },
      },
      fontFamily: {
        // 全部统一为 Ins 现代无衬线
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
        // Ins 经典渐变（紫→粉→橙黄）
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
