import { IntroRunner } from "./IntroRunner";
import s from "./logoIntro.module.css";

/*
 * The front page's opening, inside the hero card: a lime panel covers the hero (the header and the white frame stay in
 * view), the logo glitches in big in the middle (hard zoom punches in and out, a shaking stage, white glow, sliced ghost
 * copies, thin bars), the name snaps in, and then the logo whips up into its place in the header with a short trail while
 * the panel retracts up after it (IntroRunner). About 3.2 s, once per browser session; a click, key or scroll skips it.
 *
 * The panel is rendered hidden. The inline script right after it starts it before the first paint, so the page is never
 * seen first – and does nothing with reduced motion, a #link, or when it already ran this session. Without JavaScript the
 * panel stays hidden; if the runner never starts, CSS fades it out after 6 s.
 */

/** The symbol (components/Logo.tsx `LogoMark`), with each piece in its own group so the pieces can snap in one by one. */
function Mark({ className, pieces }: { className?: string; pieces?: boolean }) {
  return (
    <svg viewBox="0 -2 64 64" className={className} aria-hidden="true">
      <g className={pieces ? s.p1 : undefined}>
        <g transform="rotate(-8 22 14)">
          <rect className={`${s.ink} ${s.cut}`} x="6" y="0" width="32" height="22" rx="4.5" />
        </g>
      </g>
      <g className={pieces ? s.p2 : undefined}>
        <g transform="rotate(6 42 14)">
          <rect className={`${s.front} ${s.cut}`} x="25" y="2" width="32" height="22" rx="4.5" />
        </g>
      </g>
      <g className={pieces ? s.p3 : undefined}>
        <rect className={`${s.ink} ${s.cut}`} x="2" y="20" width="60" height="40" rx="13" />
        <rect className={s.slot} x="40" y="35" width="15" height="8" rx="4" />
      </g>
    </svg>
  );
}

const START = `(function(){var e=document.getElementById('bp-intro');if(!e)return;
try{if(sessionStorage.getItem('bp:intro'))return;sessionStorage.setItem('bp:intro','1')}catch(x){}
if(location.hash||!window.matchMedia||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
e.setAttribute('data-state','play');window.__bpIntroT0=performance.now()})()`;

export function LogoIntro() {
  return (
    <>
      <div id="bp-intro" className={s.intro} aria-hidden="true" suppressHydrationWarning>
        <div className={s.halo} />
        <div className={s.scan} />
        <div className={s.bars}>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={s.stage}>
          <span className={s.zoom}>
            <span className={s.lockup} data-intro-lockup="">
              <span className={s.markWrap}>
                <Mark className={s.ghostA} />
                <Mark className={s.ghostB} />
                <Mark className={s.mark} pieces />
              </span>
              <span className={s.name}>
                <span className={s.budget}>budget</span>
                <span className={s.pro}>pro</span>
              </span>
            </span>
          </span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: START }} />
      <IntroRunner />
    </>
  );
}
