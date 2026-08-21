import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 从 IP 归属地字符串中提取省份/州级别（前台显示用）
 * ipapi.co 返回格式："国家 省份 城市"，如 "China Hunan Changsha"
 * - 中国：返回省份名（如 湖南）
 * - 国外：返回州/省名（如 California），若无则返回国家名
 * - 未知或为空：返回空字符串
 */
export function extractProvince(ipLocation: string | null | undefined): string {
  if (!ipLocation || ipLocation === "(未知)") return "";
  const parts = ipLocation.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  // 只有国家名时返回国家
  if (parts.length === 1) return parts[0];
  // 中国省份映射（英文 → 中文）
  const cnProvinces: Record<string, string> = {
    "Beijing": "北京", "Tianjin": "天津", "Shanghai": "上海", "Chongqing": "重庆",
    "Hebei": "河北", "Shanxi": "山西", "Liaoning": "辽宁", "Jilin": "吉林",
    "Heilongjiang": "黑龙江", "Jiangsu": "江苏", "Zhejiang": "浙江", "Anhui": "安徽",
    "Fujian": "福建", "Jiangxi": "江西", "Shandong": "山东", "Henan": "河南",
    "Hubei": "湖北", "Hunan": "湖南", "Guangdong": "广东", "Hainan": "海南",
    "Sichuan": "四川", "Guizhou": "贵州", "Yunnan": "云南", "Shaanxi": "陕西",
    "Gansu": "甘肃", "Qinghai": "青海", "Taiwan": "台湾",
    "Inner Mongolia": "内蒙古", "Guangxi": "广西", "Tibet": "西藏",
    "Ningxia": "宁夏", "Xinjiang": "新疆", "Hong Kong": "香港", "Macau": "澳门",
  };
  const province = parts[1];
  // 如果是中国省份，返回中文名
  if (parts[0] === "China" && cnProvinces[province]) {
    return cnProvinces[province];
  }
  // 否则返回省份/州原名
  return province;
}
