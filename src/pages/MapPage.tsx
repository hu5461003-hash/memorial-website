import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Calendar, MapPin, Images, X, CameraOff } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import { supabase, supabaseReady } from "@/lib/supabase";
import { FALLBACK_FOOTPRINTS } from "@/lib/config";
import { useContent } from "@/hooks/useContent";
import SectionRenderer from "@/components/SectionRenderer";
import type { Footprint, Photo } from "@/lib/types";

// 樱花粉圆形标记（divIcon）
const makeIcon = () =>
  L.divIcon({
    className: "",
    html: `<span class="fp-marker" style="display:block;width:14px;height:14px;"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });

const markerIcon = makeIcon();

// 自动适配所有点位的视野
function FitBounds({ points }: { points: Footprint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  }, [map, points]);
  return null;
}

export default function MapPage() {
  const { getValue } = useContent();
  const mapSubtitle = getValue("map.subtitle");
  const listTitle = getValue("map.list_title");
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // 城市相册弹窗：当前选中的城市（中文名）
  const [activeCity, setActiveCity] = useState<string | null>(null);
  // 全屏放大的单张照片
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabaseReady || !supabase) {
        const fallback: Footprint[] = FALLBACK_FOOTPRINTS.map((f, i) => ({
          id: `fallback-${i}`,
          name: f.name,
          lat: f.lat,
          lng: f.lng,
          visit_date: f.visit_date,
          story: f.story,
          cover_url: f.cover_url,
          sort_order: f.sort_order,
          created_at: f.visit_date,
        }));
        setFootprints(fallback);
        setPhotos([]);
        setLoading(false);
        return;
      }
      const [fpRes, photoRes] = await Promise.all([
        supabase.from("footprints").select("*").order("sort_order", { ascending: true }),
        supabase.from("photos").select("*").order("photo_date", { ascending: false }),
      ]);
      if (!active) return;
      if (fpRes.error || !fpRes.data || fpRes.data.length === 0) {
        const fallback: Footprint[] = FALLBACK_FOOTPRINTS.map((f, i) => ({
          id: `fallback-${i}`,
          name: f.name,
          lat: f.lat,
          lng: f.lng,
          visit_date: f.visit_date,
          story: f.story,
          cover_url: f.cover_url,
          sort_order: f.sort_order,
          created_at: f.visit_date,
        }));
        setFootprints(fallback);
      } else {
        setFootprints(fpRes.data as Footprint[]);
      }
      setPhotos((photoRes.data as Photo[] | null) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const linePositions: [number, number][] = footprints.map((p) => [p.lat, p.lng]);

  // 按城市（中文名）分组照片
  const photosByCity = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) {
      if (!p.city) continue;
      const arr = map.get(p.city) ?? [];
      arr.push(p);
      map.set(p.city, arr);
    }
    return map;
  }, [photos]);

  // 当前选中城市的照片
  const activeCityPhotos = activeCity ? photosByCity.get(activeCity) ?? [] : [];

  return (
    <Layout>
      <PageHeader
        title="足迹地图"
        subtitle={mapSubtitle}
        showBack={false}
      />

      {loading ? (
        <Loading tip="正在铺开地图…" />
      ) : (
        <>
          <div className="overflow-hidden rounded-card border border-coffee-line/70 shadow-paper">
            <MapContainer
              center={[28.5, 113]}
              zoom={5}
              scrollWheelZoom={false}
              style={{ height: "60vh", minHeight: 360, width: "100%" }}
              attributionControl={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO'
                subdomains="abcd"
                maxZoom={19}
              />
              {linePositions.length > 1 && (
                <Polyline
                  positions={linePositions}
                  pathOptions={{
                    color: "#D67385",
                    weight: 2,
                    opacity: 0.85,
                    dashArray: "6 8",
                    lineCap: "round",
                  }}
                />
              )}
              {footprints.map((fp) => {
                const cityPhotos = photosByCity.get(fp.name) ?? [];
                return (
                  <Marker
                    key={fp.id}
                    position={[fp.lat, fp.lng]}
                    icon={markerIcon}
                  >
                    <Popup>
                      <div className="min-w-[180px] max-w-[220px]">
                        <div className="flex items-center gap-1.5 font-hand text-base text-ink">
                          <MapPin className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                          {fp.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-mute">
                          <Calendar className="h-3 w-3" strokeWidth={1.6} />
                          {fp.visit_date}
                        </div>
                        {fp.cover_url && (
                          <img
                            src={fp.cover_url}
                            alt={fp.name}
                            className="mt-2 h-28 w-full rounded object-cover"
                            loading="lazy"
                          />
                        )}
                        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                          {fp.story}
                        </p>
                        {cityPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveCity(fp.name)}
                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-soft border border-gold/60 bg-gold/10 px-3 py-1.5 text-xs font-medium text-coffee transition-colors hover:bg-gold/20"
                          >
                            <Images className="h-3.5 w-3.5" strokeWidth={1.8} />
                            查看相册 · {cityPhotos.length}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              <FitBounds points={footprints} />
            </MapContainer>
          </div>

          {/* 城市列表（按旅程顺序） */}
          <section className="mt-5">
            <h2 className="mb-3 font-hand text-lg text-ink-soft">{listTitle}</h2>
            <ol className="space-y-2.5">
              {footprints.map((fp, idx) => {
                const count = (photosByCity.get(fp.name) ?? []).length;
                return (
                  <li
                    key={fp.id}
                    className="flex items-start gap-3 rounded-card border border-coffee-line/60 bg-cream-200/70 p-3"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold/15 font-hand text-xs text-coffee">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-hand text-base text-ink">{fp.name}</span>
                        <span className="flex-none text-[11px] text-ink-mute">
                          {fp.visit_date}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                        {fp.story}
                      </p>
                      {count > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveCity(fp.name)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-coffee transition-colors hover:text-gold"
                        >
                          <Images className="h-3 w-3" strokeWidth={1.8} />
                          查看相册 · {count} 张
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* 动态组件区 */}
          <SectionRenderer pageName="map" />
        </>
      )}

      {/* 城市相册弹窗：显示该城市（中文）的照片墙 */}
      {activeCity && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm animate-fade-in sm:items-center"
          onClick={() => setActiveCity(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-[480px] overflow-hidden rounded-t-card bg-cream-50 shadow-polaroid sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部：中文城市名 */}
            <div className="flex items-center justify-between border-b border-coffee-line/70 px-5 py-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gold" strokeWidth={1.8} />
                <h2 className="font-hand text-xl text-ink">{activeCity}</h2>
                <span className="text-xs text-ink-mute">
                  · {activeCityPhotos.length} 张
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCity(null)}
                aria-label="关闭"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
              >
                <X className="h-4.5 w-4.5" strokeWidth={1.8} />
              </button>
            </div>

            {/* 照片网格（拍立得风格） */}
            <div className="max-h-[calc(88vh-56px)] overflow-y-auto p-4">
              {activeCityPhotos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-ink-mute">
                  <CameraOff className="h-6 w-6" strokeWidth={1.4} />
                  <p className="mt-2 text-xs">这里还没有照片</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeCityPhotos.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePhoto(p)}
                      className="group flex flex-col bg-cream-50 p-2 pb-4 shadow-polaroid transition-transform hover:scale-[1.03] active:scale-[0.98]"
                      style={{ transform: `rotate(${(idx % 2 === 0 ? -1 : 1) * 2}deg)` }}
                    >
                      <div className="aspect-square overflow-hidden bg-cream-200">
                        <img
                          src={p.public_url}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="mt-1.5 px-1 text-center font-hand text-xs text-ink-soft">
                        {p.title}
                      </p>
                      {p.photo_date && (
                        <p className="text-center text-[10px] text-ink-mute">
                          {p.photo_date}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 全屏放大单张照片 */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/30"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[85vh] max-w-[90vw] bg-cream-50 p-3 pb-6 shadow-polaroid"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePhoto.public_url}
              alt={activePhoto.title}
              className="max-h-[70vh] max-w-full object-contain"
            />
            <figcaption className="mt-3 flex items-center justify-center gap-2 font-hand text-sm text-ink-soft">
              {activePhoto.city && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
                  {activePhoto.city}
                </span>
              )}
              <span>{activePhoto.title}</span>
              {activePhoto.photo_date && (
                <span className="text-xs text-ink-mute">· {activePhoto.photo_date}</span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </Layout>
  );
}
