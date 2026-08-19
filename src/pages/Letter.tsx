import { PenLine } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import { useContent } from "@/hooks/useContent";
import { LETTER_DATE } from "@/lib/config";
import PageBlocks from "@/components/PageBlocks";

export default function Letter() {
  const { getParagraphs, getValue } = useContent();
  const paragraphs = getParagraphs("letter.body");
  const signature = getValue("letter.signature");
  const sideText = getValue("letter.side_text");

  return (
    <Layout>
      <PageHeader
        title={getValue("letter.title")}
        subtitle={getValue("letter.subtitle")}
        showBack={false}
      />

      <PageBlocks
        pageName="letter"
        blocks={{
          letter_body: (
            <article className="relative overflow-hidden rounded-card border border-coffee-line/70 bg-cream-50/90 p-6 shadow-paper">
              {/* 左侧樱花粉竖线装饰 */}
              <span className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-gold/40" />

              <div className="pl-3">
                <div className="mb-5 flex items-center gap-2 text-gold">
                  <PenLine className="h-4 w-4" strokeWidth={1.6} />
                  <span className="font-hand text-sm tracking-widest">{sideText}</span>
                </div>

                <div className="space-y-5 font-serif text-[15px] leading-[2] text-ink">
                  {paragraphs.map((para, idx) => (
                    <p
                      key={idx}
                      className={
                        idx === 0
                          ? "font-hand text-lg text-ink"
                          : "indent-[2em]"
                      }
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* 落款 */}
                {signature && (
                  <div className="mt-8 flex flex-col items-end gap-2">
                    <p className="font-hand text-base text-ink-soft">{signature}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold/50 font-hand text-lg text-coffee">
                      {LETTER_DATE}
                    </span>
                  </div>
                )}
              </div>
            </article>
          ),

          letter_sign: (
            <p className="mt-6 text-center text-[11px] tracking-widest text-ink-mute/70">
              {getValue("letter.sign")}
            </p>
          ),
        }}
      />
    </Layout>
  );
}
