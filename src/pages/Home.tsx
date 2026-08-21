import { Link } from "react-router-dom";
import { Map, Mail, Image } from "lucide-react";
import Layout from "@/components/Layout";
import { useContent } from "@/hooks/useContent";
import PageBlocks from "@/components/PageBlocks";
import ContactCard from "@/components/ContactCard";

const ENTRIES = [
  { to: "/map", titleKey: "home.entry_map_title", descKey: "home.entry_map_desc", Icon: Map },
  { to: "/messages", titleKey: "home.entry_messages_title", descKey: "home.entry_messages_desc", Icon: Mail },
  { to: "/gallery", titleKey: "home.entry_gallery_title", descKey: "home.entry_gallery_desc", Icon: Image },
] as const;

export default function Home() {
  const { getValue } = useContent();
  const footerText = getValue("home.footer");

  return (
    <Layout>
      <PageBlocks
        pageName="home"
        blocks={{
          entry_cards: (
            <section className="mt-6 grid grid-cols-1 gap-3 pb-8 sm:grid-cols-3">
              {ENTRIES.map(({ to, titleKey, descKey, Icon }, idx) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex flex-col items-start gap-2 rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-ins active:scale-[0.98] animate-fade-up"
                  style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
                >
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-soft text-white shadow-sm transition-opacity group-hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #f09433, #dc2743, #bc1888)" }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">{getValue(titleKey)}</h3>
                    <p className="mt-0.5 text-xs text-ink-soft">{getValue(descKey)}</p>
                  </div>
                </Link>
              ))}
            </section>
          ),

          contact_card: <ContactCard />,

          footer_text: footerText ? (
            <p className="pt-2 text-center text-[11px] tracking-widest text-ink-mute/70">
              {footerText}
            </p>
          ) : null,
        }}
      />
    </Layout>
  );
}
