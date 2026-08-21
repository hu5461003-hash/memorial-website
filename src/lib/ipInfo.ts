/**
 * 访客 IP 信息获取（留言 / 帖子点赞去重等场景共用）
 * - 优先调 https://ipapi.co/json/ 一次拿到真实 IPv4 与城市/省份/国家（精确位置）
 * - 失败回退 https://api.ipify.org 仅拿 IP（归属地未知）
 * - 最终回退 localStorage 生成唯一标识（以 "client-" 开头，前台显示时应隐藏）
 * 结果缓存到 localStorage，避免每次提交都触发外部接口限速
 */
export type IpInfo = { ip: string; ipLocation: string; userLocation: string };

export async function getMyIpInfo(): Promise<IpInfo> {
  const KEY = "visitor_ip_info";
  const cached = localStorage.getItem(KEY);
  if (cached) {
    try {
      const info = JSON.parse(cached) as IpInfo;
      if (info?.ip) return info;
    } catch {
      /* ignore */
    }
  }
  let ip = "";
  let ipLocation = "(未知)";
  let userLocation = "(未知)";
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const d = (await res.json()) as {
        ip?: string;
        city?: string;
        region?: string;
        country_name?: string;
      };
      ip = d.ip ?? "";
      const parts = [d.country_name, d.region, d.city].filter(Boolean);
      ipLocation = parts.length > 0 ? parts.join(" ") : "(未知)";
      userLocation = d.city || d.region || ipLocation;
    }
  } catch {
    /* 网络错误走回退 */
  }
  if (!ip) {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (res.ok) {
        const d = (await res.json()) as { ip?: string };
        ip = d.ip ?? "";
      }
    } catch {
      /* ignore */
    }
  }
  if (!ip) {
    let v = localStorage.getItem("visitor_ip_fallback");
    if (!v) {
      v = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("visitor_ip_fallback", v);
    }
    ip = v;
  }
  const info: IpInfo = { ip, ipLocation, userLocation };
  try {
    localStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
  return info;
}
