import { curtailStats } from '@/lib/derive'
import { dec, monthLabel, pct } from '@/lib/format'
import type { Observatory } from '@/lib/observatory'
import { Head, Section } from '../ui'

/**
 * The page's statement (dealt moment word-highlight): last month's wind and solar cuts in one sentence, beside a
 * photograph of a wind farm in Rio Grande do Norte (a stand-in from Wikimedia Commons, credited in the footer).
 */
export default function Cortes({ o }: { o: Observatory }) {
  const c = curtailStats(o)
  return (
    <Section id="cortes" moment="word-highlight">
      <Head id="cortes" title={`Cortes de eólica e solar em ${monthLabel(c.m)}`} />
      <div className="split">
        <p className="mo-wh__text statement__text">
          Em {monthLabel(c.m)}, o ONS mandou eólicas e solares deixarem de gerar <strong>{dec(c.total / 1e6, 1)} TWh</strong>, {pct(c.lostShare)} do que poderiam ter produzido. {pct(c.ne)} desses cortes foram no Nordeste, onde está quase todo o vento do país.
        </p>
        <figure className="frame frame--photo statement__photo">
          <img
            src="/assets/img/photo-f33022249-960.jpg"
            srcSet="/assets/img/photo-f33022249-500.jpg 500w, /assets/img/photo-f33022249-960.jpg 960w"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 50vw"
            width={960}
            height={636}
            alt="Aerogeradores de um parque eólico no litoral do Rio Grande do Norte, ao lado de uma estrada de terra"
            loading="lazy"
            decoding="async"
            data-source="stand-in"
            data-subject="parque eólico no Nordeste"
          />
        </figure>
      </div>
    </Section>
  )
}
