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
        // 马卡龙色系：粉色为主，辅以薄荷/淡蓝/奶黄
        cream: {
          50: "#FFF5F7",   // 淡粉奶油背景
          100: "#FCEAEE",  // 略深粉
          200: "#FFF0F3",  // 淡粉卡片
          300: "#F5D5DD",  // 粉描边
        },
        ink: {
          DEFAULT: "#4A3B47",  // 深紫灰文字
          soft: "#8A7A85",     // 次级文字
          mute: "#B5A5B0",     // 弱化文字
        },
        gold: {
          DEFAULT: "#E8919F",  // 樱花粉强调色（token 名保留）
          deep: "#D67385",     // 深粉，虚线连接色
          soft: "#F4C2CC",     // 浅粉
          tint: "#FCEAEE",     // 极浅粉底
        },
        coffee: {
          DEFAULT: "#C77B8A",  // 暖粉
          line: "#F5D5DD",     // 粉描边
        },
        note: {
          yellow: "#FFF4D6",   // 马卡龙奶黄便签
          pink: "#FCE0E6",     // 马卡龙粉便签
          blue: "#D6E6F2",     // 马卡龙蓝便签
        },
        rust: {
          DEFAULT: "#D8788A",  // 暖红删除
        },
      },
      fontFamily: {
        // 标题：手写感衬线；正文：温润衬线
        hand: ['"LXGW WenKai TC"', '"LXGW WenKai"', '"Noto Serif SC"', 'serif'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        soft: '8px',
        card: '12px',
      },
      boxShadow: {
        paper: '0 2px 12px -2px rgba(74, 59, 71, 0.08), 0 1px 3px -1px rgba(74, 59, 71, 0.06)',
        polaroid: '0 6px 20px -4px rgba(74, 59, 71, 0.18), 0 2px 6px -2px rgba(74, 59, 71, 0.12)',
        note: '0 3px 10px -2px rgba(74, 59, 71, 0.12)',
        soft: '0 1px 4px rgba(74, 59, 71, 0.06)',
      },
      backgroundImage: {
        'paper-noise': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
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
        'fade-up': 'fade-up 0.7s ease-out both',
        'fade-in': 'fade-in 0.6s ease-out both',
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
