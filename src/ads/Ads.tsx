import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, FONT_TIGHT, FPS, clamp01, kf, lerp, sp } from '../lib';
import { IconTile, PLACE, PlaceKind } from '../components/UI';
import { LogoIcon } from '../components/Icons';
import { AdPhone, CTA, Flash, GradientBG, INK, MINT, Note, PlaceChip, Title, useT } from './kit';

/* =====================================================================================
   AD A — « Temps d'écran vs temps par lieu »  (15 s)
   ===================================================================================== */
const ScreenTimeCard: React.FC<{ at: number; flip: number; out: number }> = ({ at, flip, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || t > out + 0.4) return null;
  const e = sp(f, at, { damping: 14, stiffness: 140 });
  const fl = kf(f, [flip, flip + 0.45], [0, 1], EASE.inOut);
  const ex = kf(f, [out, out + 0.35], [0, 1], EASE.in);
  const back = fl > 0.5;
  const rows: { name: string; v: string; col: string; k?: PlaceKind }[] = back
    ? [
        { name: 'Maison', v: '? ? ?', col: PLACE.home.color, k: 'home' },
        { name: 'Travail', v: '? ? ?', col: PLACE.work.color, k: 'work' },
        { name: 'Salle de sport', v: '? ? ?', col: PLACE.gym.color, k: 'gym' },
      ]
    : [
        { name: 'Instagram', v: '2 h 14', col: '#E1306C' },
        { name: 'TikTok', v: '1 h 52', col: '#25F4EE' },
        { name: 'YouTube', v: '48 min', col: '#FF3B30' },
      ];
  const shake = back ? Math.sin(t * 40) * 4 * clamp01(1 - (t - flip - 0.5) / 1) : 0;
  return (
    <div style={{ position: 'absolute', left: 120, right: 120, top: 760, transform: `translateY(${(1 - e) * 500 + ex * 600}px) scaleX(${Math.max(0.02, Math.abs(Math.cos(fl * Math.PI)))}) rotateZ(${lerp(-4, 0, e)}deg)`, opacity: clamp01(e * 2) * (1 - ex) }}>
      <div style={{ background: '#121816', borderRadius: 46, padding: '40px 44px', border: '2px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 90px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: 'rgba(255,255,255,0.6)', marginBottom: 26 }}>{back ? 'Temps par lieu' : 'Temps d’écran · aujourd’hui'}</div>
        {rows.map((r, i) => {
          const re = sp(f, (back ? flip + 0.35 : at + 0.25) + i * 0.12, { damping: 14, stiffness: 180 });
          return (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 0', borderTop: i ? '1px solid rgba(255,255,255,0.08)' : undefined, opacity: clamp01(re * 2), transform: `translateX(${(1 - re) * 80 + (back ? shake : 0)}px)` }}>
              {r.k ? <IconTile kind={r.k} size={70} solid /> : <div style={{ width: 70, height: 70, borderRadius: 19, background: r.col }} />}
              <div style={{ flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 42, color: '#fff' }}>{r.name}</div>
              <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 48, color: back ? '#FF6B5E' : '#fff' }}>{r.v}</div>
              {!back && <div style={{ fontSize: 40, color: MINT }}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AdA: React.FC = () => {
  const t = useT();
  const fr = useCurrentFrame();
  const reveal = 4.1;
  const feat = [6.0, 7.9, 9.8];
  const cta = 11.8;
  return (
    <AbsoluteFill style={{ background: '#050807', overflow: 'hidden' }}>
      <GradientBG a="#1F6B52" b="#050807" c="#2B2F6B" dark />
      {/* 1. hook */}
      <Title text={'Tu sais combien\nde temps tu passes\nsur tes applis…'} at={0.05} out={2.0} size={84} top={250} hi={['applis…']} />
      <Title text={'…mais dans chaque lieu ?'} at={2.15} out={3.85} size={104} top={300} hi={['lieu']} hiColor="#FF6B5E" />
      <ScreenTimeCard at={0.1} flip={2.1} out={3.9} />
      {/* 2. reveal */}
      {t >= reveal - 0.05 && t < feat[0] + 0.3 && (
        <AbsoluteFill style={{ alignItems: 'center' }}>
          <AbsoluteFill style={{ background: MINT, transform: `scaleY(${kf(fr, [reveal - 0.05, reveal + 0.25], [0, 1], EASE.out)})`, transformOrigin: '50% 0%' }} />
          <div style={{ position: 'absolute', top: 520, transform: `scale(${sp(fr, reveal + 0.15, { damping: 9, stiffness: 170 })})` }}>
            <LogoIcon size={240} />
          </div>
          <Title text="OùVa" at={reveal + 0.25} size={160} top={800} color={INK} />
          <Title text={'le suivi du temps,\nlieu par lieu.'} at={reveal + 0.45} size={78} top={1000} color={INK} weight={800} />
        </AbsoluteFill>
      )}
      {/* 3. features on the real app */}
      <Title text={'Détection\nautomatique'} at={feat[0]} out={feat[1] - 0.25} size={100} top={250} hi={['automatique']} />
      <Title text={'Ta carte\nde chaleur'} at={feat[1]} out={feat[2] - 0.25} size={100} top={250} hi={['chaleur']} />
      <Title text={'Revis ta journée\nsur la carte'} at={feat[2]} out={cta - 0.25} size={96} top={250} hi={['journée']} />
      <AdPhone enter={feat[0] - 0.05} exit={cta - 0.3} cy={1180} w={560} screens={[{ src: 'screens/home_now.png', at: 0 }, { src: 'screens/places_heatmap.png', at: feat[1] }, { src: 'screens/day_map.png', at: feat[2] }]} />
      <PlaceChip k="home" at={feat[0] + 0.45} out={feat[1] - 0.1} x={40} y={720} base={192} label="Maison · arrivé" />
      <PlaceChip k="gym" at={feat[0] + 0.75} out={feat[1] - 0.1} x={560} y={1060} base={58} />
      <PlaceChip k="work" at={feat[1] + 0.4} out={feat[2] - 0.1} x={600} y={760} base={418} />
      <PlaceChip k="cafe" at={feat[2] + 0.4} out={cta - 0.2} x={30} y={1010} base={42} />
      <Note text="Captures réelles de l’app" show={t > feat[0] && t < cta} />
      <CTA at={cta} />
      <Flash times={[2.1, reveal, feat[0], feat[1], feat[2], cta]} />
      <Audio src={staticFile('ads/adA.wav')} />
    </AbsoluteFill>
  );
};

/* =====================================================================================
   AD B — « Ta semaine, version Wrapped »  (15 s)
   ===================================================================================== */
const StatSlide: React.FC<{ at: number; out: number; bg: string; ink: string; value: number; fmt: (v: number) => string; label: string; k: PlaceKind; tilt: number }> = ({ at, out, bg, ink, value, fmt, label, k, tilt }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || t > out + 0.02) return null;
  const wipe = kf(f, [at - 0.02, at + 0.22], [0, 1], EASE.out);
  const cnt = kf(f, [at + 0.1, at + 1.0], [0, 1], EASE.out);
  const ic = sp(f, at + 0.15, { damping: 9, stiffness: 160 });
  const lab = sp(f, at + 0.35, { damping: 14, stiffness: 180 });
  return (
    <AbsoluteFill style={{ background: bg, clipPath: `circle(${wipe * 150}% at 50% 60%)` }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: -200, right: -200, top: 300 + i * 260, height: 120, background: ink, opacity: 0.06, transform: `rotate(${tilt}deg) translateX(${Math.sin(t * 1.2 + i) * 60}px)` }} />
      ))}
      <div style={{ position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${Math.max(0, ic)}) rotate(${(1 - ic) * 30}deg)` }}>
        <IconTile kind={k} size={200} solid />
      </div>
      <div style={{ position: 'absolute', top: 730, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 270, letterSpacing: '-0.06em', color: ink, lineHeight: 1 }}>{fmt(value * cnt)}</div>
      <div style={{ position: 'absolute', top: 1040, left: 80, right: 80, textAlign: 'center', whiteSpace: 'pre-line', fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 84, color: ink, lineHeight: 1.05, opacity: clamp01(lab * 2), transform: `translateY(${(1 - lab) * 40}px)` }}>{label}</div>
    </AbsoluteFill>
  );
};

export const AdB: React.FC = () => {
  const t = useT();
  const s = [1.7, 3.8, 5.9, 8.0];
  const app = 10.1;
  const cta = 12.6;
  const hm = (v: number) => `${Math.floor(v / 60)} h ${String(Math.floor(v % 60)).padStart(2, '0')}`;
  return (
    <AbsoluteFill style={{ background: '#050807', overflow: 'hidden' }}>
      <GradientBG a="#3B2A78" b="#050807" c="#1F6B52" dark />
      <Title text={'Ta semaine,\nen vrai.'} at={0.05} out={s[0] - 0.2} size={150} top={620} hi={['vrai.']} />
      <StatSlide at={s[0]} out={s[1]} bg="#FF8A3D" ink="#2A1205" value={52} fmt={(v) => `${Math.round(v)} %`} label={'de ton temps\nà la maison'} k="home" tilt={-8} />
      <StatSlide at={s[1]} out={s[2]} bg="#4D7CFE" ink="#06123A" value={31 * 60 + 20} fmt={hm} label="au travail" k="work" tilt={7} />
      <StatSlide at={s[2]} out={s[3]} bg="#B98CF0" ink="#1E0A3A" value={4 * 60 + 20} fmt={hm} label="chez les potes" k="friends" tilt={-6} />
      <StatSlide at={s[3]} out={app} bg="#F0C04B" ink="#2A1E02" value={12} fmt={(v) => `${Math.round(v)} min`} label={'à la salle.\nAïe.'} k="gym" tilt={8} />
      {/* how: the real app */}
      <Title text={'Calculé tout seul\npar OùVa.'} at={app} out={cta - 0.25} size={96} top={250} hi={['OùVa.']} />
      <AdPhone enter={app - 0.05} exit={cta - 0.3} cy={1180} w={560} rot={6} screens={[{ src: 'screens/places_heatmap.png', at: 0 }, { src: 'screens/home_now.png', at: app + 1.2 }]} />
      <Note text="Exemple de semaine · captures réelles de l’app" show={t > s[0] && t < cta} />
      <CTA at={cta} sub="Découvre où passe vraiment ton temps." />
      <Flash times={[s[0], s[1], s[2], s[3], app, cta]} />
      <Audio src={staticFile('ads/adB.wav')} />
    </AbsoluteFill>
  );
};

/* =====================================================================================
   AD C — « Zéro effort »  (13 s)
   ===================================================================================== */
const CrossList: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at - 0.02 || t > out + 0.4) return null;
  const items = ['Lancer un chrono', 'Noter ses heures', 'Y penser chaque jour'];
  const ex = kf(f, [out, out + 0.3], [0, 1], EASE.in);
  return (
    <div style={{ position: 'absolute', left: 110, right: 110, top: 760, opacity: 1 - ex, transform: `translateY(${ex * 80}px)` }}>
      {items.map((it, i) => {
        const e = sp(f, at + 0.15 + i * 0.2, { damping: 14, stiffness: 190 });
        const cross = kf(f, [at + 0.9 + i * 0.25, at + 1.15 + i * 0.25], [0, 1], EASE.out);
        return (
          <div key={it} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, padding: '26px 34px', marginBottom: 22, borderRadius: 32, background: '#121816', border: '2px solid rgba(255,255,255,0.08)', transform: `translateX(${(1 - e) * -400}px)`, opacity: clamp01(e * 2) }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, border: '4px solid #FF6B5E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B5E', fontSize: 40, fontWeight: 900, fontFamily: FONT }}>{cross > 0.5 ? '✕' : ''}</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 48, color: cross > 0.5 ? 'rgba(255,255,255,0.4)' : '#fff' }}>{it}</div>
            <div style={{ position: 'absolute', left: 110, top: '50%', height: 6, width: `${cross * 70}%`, background: '#FF6B5E', borderRadius: 3 }} />
          </div>
        );
      })}
    </div>
  );
};

const Island: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at || t > out + 0.3) return null;
  const e = sp(f, at, { damping: 13, stiffness: 150 });
  const m = Math.floor(Math.max(0, t - at) * 7);
  return (
    <div style={{ position: 'absolute', left: '50%', top: 18, width: lerp(150, 520, e), height: lerp(42, 120, e), marginLeft: -lerp(150, 520, e) / 2, borderRadius: 60, background: '#000', display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', overflow: 'hidden', zIndex: 3 }}>
      <div style={{ opacity: clamp01((e - 0.6) * 3), display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
        <IconTile kind="home" size={64} solid />
        <div style={{ flex: 1, fontFamily: FONT, color: '#fff' }}>
          <div style={{ fontSize: 22, opacity: 0.7 }}>Arrivé · détecté</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Maison</div>
        </div>
        <div style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 40, color: MINT, fontVariantNumeric: 'tabular-nums' }}>{`0:${String(m).padStart(2, '0')}`}</div>
      </div>
    </div>
  );
};

export const AdC: React.FC = () => {
  const t = useT();
  const nothing = 3.3;
  const show = 5.4;
  const cta = 10.2;
  return (
    <AbsoluteFill style={{ background: '#050807', overflow: 'hidden' }}>
      <GradientBG a="#5A1F2A" b="#050807" c="#1F6B52" dark />
      <Title text={'Les applis de suivi ?\nTu lâches au bout\nde 3 jours.'} at={0.05} out={nothing - 0.25} size={90} top={280} hi={['3']} hiColor="#FF6B5E" />
      <CrossList at={0.2} out={nothing - 0.2} />
      <Title text={'OùVa ne te\ndemande rien.'} at={nothing} out={show - 0.2} size={122} top={300} hi={['rien.']} />
      <AdPhone enter={nothing + 0.15} exit={cta - 0.3} cy={1190} w={540} screens={[{ src: 'screens/home_now.png', at: 0 }, { src: 'screens/day_map.png', at: show + 2.2 }]}>
        <div style={{ position: 'absolute', inset: 15, borderRadius: 75, overflow: 'hidden', pointerEvents: 'none' }}>
          <Island at={nothing + 0.8} out={cta} />
        </div>
      </AdPhone>
      <Title text={'Tu arrives :\nle chrono démarre.'} at={show} out={show + 2.0} size={92} top={260} hi={['démarre.']} />
      <Title text={'Tu repars :\ntout est rangé.'} at={show + 2.2} out={cta - 0.25} size={92} top={260} hi={['rangé.']} />
      <PlaceChip k="home" at={show + 2.5} out={cta - 0.2} x={590} y={760} base={170} rate={0} label="Maison · rangé" />
      <PlaceChip k="work" at={show + 2.75} out={cta - 0.2} x={30} y={1180} base={262} rate={0} label="Travail · rangé" />
      <Note text="Captures réelles de l’app" show={t > nothing && t < cta} />
      <CTA at={cta} sub="Ton temps, compté tout seul." />
      <Flash times={[nothing, show, show + 2.2, cta]} />
      <Audio src={staticFile('ads/adC.wav')} />
    </AbsoluteFill>
  );
};

/* =====================================================================================
   STATIC ADS (feed 4:5, 1080×1350)
   ===================================================================================== */
const StaticPhone: React.FC<{ src: string; x: number; y: number; w: number; rot: number }> = ({ src, x, y, w, rot }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: w * 2.07, borderRadius: w * 0.16, padding: w * 0.028, background: 'linear-gradient(140deg, #9AA0A5 0%, #3B3F43 30%, #1C1E20 60%, #6B7075 100%)', transform: `rotate(${rot}deg)`, boxShadow: '0 50px 100px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
    <div style={{ width: '100%', height: '100%', borderRadius: w * 0.14, overflow: 'hidden', background: '#000', position: 'relative' }}>
      <img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', top: w * 0.03, left: '50%', width: w * 0.27, height: w * 0.075, marginLeft: -w * 0.135, borderRadius: 99, background: '#000' }} />
    </div>
  </div>
);

export const StaticA: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(90% 70% at 50% 30%, #17402F 0%, #050807 75%)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 70, left: 70, display: 'flex', alignItems: 'center', gap: 18 }}>
      <LogoIcon size={78} />
      <span style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 46, color: '#fff' }}>OùVa</span>
    </div>
    <div style={{ position: 'absolute', top: 190, left: 70, right: 70, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 96, lineHeight: 1.0, letterSpacing: '-0.045em', color: '#fff' }}>
      Où passe <span style={{ background: MINT, color: INK, padding: '0 18px', borderRadius: 20 }}>vraiment</span> ton temps ?
    </div>
    <div style={{ position: 'absolute', top: 430, left: 70, right: 70, fontFamily: FONT, fontWeight: 600, fontSize: 40, color: 'rgba(255,255,255,0.75)' }}>Maison, travail, salle, café… mesuré automatiquement.</div>
    <StaticPhone src="screens/places_heatmap.png" x={90} y={560} w={420} rot={-7} />
    <StaticPhone src="screens/home_now.png" x={560} y={540} w={420} rot={6} />
    <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '24px 54px', borderRadius: 999, background: MINT, color: INK, fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 44, boxShadow: '0 20px 50px rgba(82,223,175,0.4)' }}>Télécharger gratuitement</div>
    </div>
  </AbsoluteFill>
);

export const StaticB: React.FC = () => (
  <AbsoluteFill style={{ background: '#FF8A3D', overflow: 'hidden' }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', left: -200, right: -200, top: 60 + i * 230, height: 110, background: '#2A1205', opacity: 0.06, transform: 'rotate(-8deg)' }} />
    ))}
    <div style={{ position: 'absolute', top: 80, left: 80, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 52, color: '#2A1205' }}>Ta semaine, en vrai :</div>
    <div style={{ position: 'absolute', top: 150, left: 70, fontFamily: FONT_TIGHT, fontWeight: 900, fontSize: 300, letterSpacing: '-0.06em', color: '#2A1205', lineHeight: 1 }}>52 %</div>
    <div style={{ position: 'absolute', top: 470, left: 80, fontFamily: FONT_TIGHT, fontWeight: 800, fontSize: 70, lineHeight: 1.02, color: '#2A1205' }}>
      de ton temps
      <br />à la maison.
    </div>
    <div style={{ position: 'absolute', top: 650, left: 80, width: 470, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {([['work', '31 h', 'au travail'], ['friends', '4 h 20', 'chez les potes'], ['gym', '12 min', 'à la salle']] as [PlaceKind, string, string][]).map(([k, v, l]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 20px 14px 14px', borderRadius: 26, background: 'rgba(42,18,5,0.92)' }}>
          <IconTile kind={k} size={62} solid />
          <span style={{ fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 40, color: '#fff' }}>{v}</span>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.7)' }}>{l}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
        <LogoIcon size={56} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: '#2A1205' }}>Calculé tout seul par OùVa</span>
      </div>
    </div>
    <StaticPhone src="screens/places_heatmap.png" x={640} y={500} w={340} rot={8} />
    <div style={{ position: 'absolute', bottom: 60, left: 80, padding: '24px 50px', borderRadius: 999, background: '#2A1205', color: '#fff', fontFamily: FONT_TIGHT, fontWeight: 850, fontSize: 42 }}>Découvre la tienne →</div>
    <div style={{ position: 'absolute', bottom: 20, right: 40, fontFamily: FONT, fontSize: 20, color: 'rgba(42,18,5,0.6)' }}>Valeurs d’exemple · capture réelle de l’app</div>
  </AbsoluteFill>
);
