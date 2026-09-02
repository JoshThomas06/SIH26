import { useEffect } from "react";
import { Link } from "react-router-dom";
import { withBase } from "./lib/utils";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GradualBlur from "gradualblur";
import ScrollAnimation from "./components/scroll-animation";
import HeroVideo from "./components/ui/hero-video";
import ScrollStack, { ScrollStackItem } from "./components/ui/ScrollStack";
import ScrollReveal from "./components/ui/ScrollReveal";
import DevelopersAvatar from "./components/ui/DevelopersAvatar";
import DittoMotion from "./ditto/DittoMotion";
import FeatureCard, { type FeatureCardData } from "./components/feature-card";
import MediaTile, { type MediaTileData } from "./components/media-tile";
import MediaTile2, { type MediaTile2Data } from "./components/media-tile2";
import Icon4 from "./svgs/svg-icon4";
import Icon5 from "./svgs/svg-icon5";
import { FeatureCard_cids, MediaTile_cids, MediaTile2_cids } from "./_cids";
import { FeatureCard_styles, MediaTile_styles, MediaTile2_styles } from "./_styles";

const FeatureCard_data: FeatureCardData[] = [
 { srcSet: "/assets/cloned/svg/13397f7ceb05.svg 10w, /assets/cloned/svg/13397f7ceb05.svg 25w, /assets/cloned/svg/13397f7ceb05.svg 50w", srcSet2: "/assets/cloned/svg/13397f7ceb05.svg 10w, /assets/cloned/svg/13397f7ceb05.svg 25w, /assets/cloned/svg/13397f7ceb05.svg 50w", alt: "Pd - INTERCEPTION RATE", height: "38", imgSrc: "/assets/cloned/svg/13397f7ceb05.svg", srcSet3: "/assets/cloned/svg/13397f7ceb05.svg 10w, /assets/cloned/svg/13397f7ceb05.svg 25w, /assets/cloned/svg/13397f7ceb05.svg 50w", width: "39", description: "Share of real emitters we actually catch.", title: "Pd - INTERCEPTION RATE" },
 { srcSet: "/assets/cloned/svg/1e4bf1f8c119.svg 10w, /assets/cloned/svg/1e4bf1f8c119.svg 25w, /assets/cloned/svg/1e4bf1f8c119.svg 50w", srcSet2: "/assets/cloned/svg/1e4bf1f8c119.svg 10w, /assets/cloned/svg/1e4bf1f8c119.svg 25w, /assets/cloned/svg/1e4bf1f8c119.svg 50w", alt: "AoI - NO CHANNEL STARVATION", height: "33", imgSrc: "/assets/cloned/svg/1e4bf1f8c119.svg", srcSet3: "/assets/cloned/svg/1e4bf1f8c119.svg 10w, /assets/cloned/svg/1e4bf1f8c119.svg 25w, /assets/cloned/svg/1e4bf1f8c119.svg 50w", width: "33", description: "Quiet bands still get a look before they go stale.", title: "AoI - NO CHANNEL STARVATION" },
 { srcSet: "/assets/cloned/svg/9b525428cd00.svg 10w, /assets/cloned/svg/9b525428cd00.svg 25w, /assets/cloned/svg/9b525428cd00.svg 50w", srcSet2: "/assets/cloned/svg/9b525428cd00.svg 10w, /assets/cloned/svg/9b525428cd00.svg 25w, /assets/cloned/svg/9b525428cd00.svg 50w", alt: "Δt - MINIMISED INTERCEPT TIME", height: "40", imgSrc: "/assets/cloned/svg/9b525428cd00.svg", srcSet3: "/assets/cloned/svg/9b525428cd00.svg 10w, /assets/cloned/svg/9b525428cd00.svg 25w, /assets/cloned/svg/9b525428cd00.svg 50w", width: "51", description: "We reach the emitter sooner than a round-robin sweep.", title: "Δt - MINIMISED INTERCEPT TIME" },
 { srcSet: "/assets/cloned/svg/f1ef468b9563.svg 10w, /assets/cloned/svg/f1ef468b9563.svg 25w, /assets/cloned/svg/f1ef468b9563.svg 50w", srcSet2: "/assets/cloned/svg/f1ef468b9563.svg 10w, /assets/cloned/svg/f1ef468b9563.svg 25w, /assets/cloned/svg/f1ef468b9563.svg 50w", alt: "0.5 — 18.0 GHz - FULL SPECTRUM COVERAGE", height: "39", imgSrc: "/assets/cloned/svg/f1ef468b9563.svg", srcSet3: "/assets/cloned/svg/f1ef468b9563.svg 10w, /assets/cloned/svg/f1ef468b9563.svg 25w, /assets/cloned/svg/f1ef468b9563.svg 50w", width: "33", description: "Sixteen hops cover the whole surveillance envelope.", title: "0.5 — 18.0 GHz - FULL SPECTRUM COVERAGE" }
];
const MediaTile_data: MediaTileData[] = [
 { ariahidden: "true", description: "Detect faster. Reduce stale channels. Explain every scheduling decision. Smart Scan is the proposed control policy: spend dwell time where energy and threat memory say it matters, but force revisits so no slice is abandoned.", srcSet: "/assets/cloned/images/99066b1fb563.avif 200w, /assets/cloned/images/364012611f83.avif 400w", srcSet2: "/assets/cloned/images/dbf2cc8338ad.webp 200w, /assets/cloned/images/0d52a1dd227c.webp 400w", alt: "RESULT", height: "371", imgSrc: "/assets/cloned/images/2564655a08b3.png", srcSet3: "/assets/cloned/images/2299829a65c0.png 200w, /assets/cloned/images/2564655a08b3.png 400w", width: "1551", text: "AEGIS SCHEDULER", text2: "SMART SCAN" }
];
const MediaTile2_data: MediaTile2Data[] = [
 { href: "/login", srcSet: "/assets/cloned/images/c19fc8a9d700.avif 10w, /assets/cloned/images/9dea7394c51d.avif 250w, /assets/cloned/images/b443110320d0.avif 500w", srcSet2: "/assets/cloned/images/cb1561fdce40.webp 10w, /assets/cloned/images/fb5a434f067e.webp 250w, /assets/cloned/images/657d2db66cb2.webp 500w", alt: "AI Workloads Hero", imgSrc: "/assets/cloned/images/b35e2a5e6bd6.jpg", srcSet3: "/assets/cloned/images/c1eb1b9c349e.jpg 10w, /assets/cloned/images/6f70f9f120d5.jpg 250w, /assets/cloned/images/b35e2a5e6bd6.jpg 500w", label: "Ready to scan?", label2: "Initialize AEGIS and enter the live scan console." },
 { href: "/scan", srcSet: "/assets/cloned/images/e4fefb322938.avif 10w, /assets/cloned/images/35bac9a4527c.avif 250w, /assets/cloned/images/4e1c63b39921.avif 500w", srcSet2: "/assets/cloned/images/a616c8fdd91a.webp 10w, /assets/cloned/images/ed7c153e35b0.webp 250w, /assets/cloned/images/7746f4fa6441.webp 500w", alt: "Power Quality Hero", imgSrc: "/assets/cloned/images/0335d7384e0a.jpg", srcSet3: "/assets/cloned/images/3366a0122474.jpg 10w, /assets/cloned/images/d25fe50f1678.jpg 250w, /assets/cloned/images/0335d7384e0a.jpg 500w", label: "Launch Scan Console →", label2: "16 BANDS · 0.5–18 GHz · DUAL-AGENT SMART SCAN" },
 { href: "/", srcSet: "/assets/cloned/images/e6c2b9496d4d.avif 10w, /assets/cloned/images/7f94ddd28b14.avif 250w, /assets/cloned/images/1278eb5b06ec.avif 500w", srcSet2: "/assets/cloned/images/f277e02ddd44.webp 10w, /assets/cloned/images/ba110bc05ff0.webp 250w, /assets/cloned/images/6f7c4a64ecfe.webp 500w", alt: "Grid Volatility Hero", imgSrc: "/assets/cloned/images/0ecee4f9deaf.jpg", srcSet3: "/assets/cloned/images/907a0982c99f.jpg 10w, /assets/cloned/images/e67216d3c55f.jpg 250w, /assets/cloned/images/0ecee4f9deaf.jpg 500w", label: "AEGIS", label2: "DRDO SIH26055 Prototype" }
];

export default function LandingPageContent() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    window.scrollTo(0, 0);

    const lenis = new Lenis({
      lerp: 0.04, // Lowered for extremely smooth, floaty scrolling
      wheelMultiplier: 2.5, // Much higher scroll amount per wheel tick
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      ScrollTrigger.killAll();
      window.scrollTo(0, 0);
    };
  }, []);

  return (
    <>
    <div className="block" data-cid="n1" id="__nuxt">
      <div className="block" data-cid="n2">
        <div className="bg-primary text-background py-2 px-4 text-xs font-mono z-50 sticky top-0 left-0 right-0 w-full tracking-wide border-b border-background/20 flex flex-col md:flex-row items-center justify-between" data-cid="header-banner">
          <div className="flex-1 hidden md:flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="none">
              <path d="M 112 32 L 54.627 32 L 128 105.373 L 201.373 32 L 144 32 L 144 0 L 256 0 L 256 112 L 224 112 L 224 54.627 L 150.627 128 L 224 201.373 L 224 144 L 256 144 L 256 256 L 144 256 L 144 224 L 201.373 224 L 128 150.627 L 54.627 224 L 112 224 L 112 256 L 0 256 L 0 144 L 32 144 L 32 201.373 L 105.373 128 L 32 54.627 L 32 112 L 0 112 L 0 0 L 112 0 Z" fill="currentColor"></path>
            </svg>
            <span className="font-bold tracking-widest uppercase">AEGIS</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div>SMART SCAN EW // DRDO SIH26055 &mdash; AEGIS Operator Briefing</div>
            <div className="opacity-80 mt-1">Operational mode: MARL Dual-Agent &nbsp;|&nbsp; Surveillance band: 0.5 — 18.0 GHz &nbsp;|&nbsp; System status: Ready for live reception</div>
          </div>
          <div className="flex-1 flex justify-end mt-2 md:mt-0 w-full md:w-auto">
            <Link to="/login" className="inline-block bg-background text-primary px-4 py-1.5 rounded-full hover:bg-opacity-80 transition-colors uppercase font-bold tracking-widest text-[10px] whitespace-nowrap text-center w-full md:w-auto">
              Initialize Prototype →
            </Link>
          </div>
        </div>

        <main className="block relative" data-cid="n34">
          <HeroVideo />
          <div className="relative z-20 bg-black">
            <section className="block relative z-3 text-background" data-cid="n108">
              <div className="block py-12 md:py-16 lg:py-24" data-cid="n109">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-8 lg:px-12" data-cid="n110">
                  <div className="col-span-1 lg:col-span-10" data-cid="n111">
                    <div className="block " data-cid="n112">
                      <div className="text-3xl md:text-4xl lg:text-6xl font-normal tracking-tight leading-tight" data-cid="n113">
                        A conventional sequential sweep moves through bands in a fixed order. Agile emitters can appear and disappear between visits. AEGIS uses a dual-agent scheduler: EAGER chases active/occupied signals. REVISIT monitors Age of Information and refreshes stale bands. The result: Detect faster. Reduce stale channels. Explain every scheduling decision.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-full block absolute top-0 inset-x-0 -z-1 bg-primary transform-[none] 2xl:rounded-[12.6px] 2xl:transform-[matrix(0.991258,0,0,1,0,0)] 2xl:origin-[960px_593.391px]" data-cid="n120" />
              </div>
            </section>
            <ScrollAnimation />
            <div className="relative w-full">
              <ScrollStack>
                <ScrollStackItem>
                  <img src={withBase("/images-dash/briefing.png")} alt="Briefing" className="w-full h-full object-cover" />
                </ScrollStackItem>
                <ScrollStackItem>
                  <img src={withBase("/images-dash/scan.png")} alt="Scan" className="w-full h-full object-cover" />
                </ScrollStackItem>
                <ScrollStackItem>
                  <img src={withBase("/images-dash/analytics.png")} alt="Analytics" className="w-full h-full object-cover" />
                </ScrollStackItem>
                <ScrollStackItem>
                  <img src={withBase("/images-dash/How-to.png")} alt="How-to" className="w-full h-full object-cover" />
                </ScrollStackItem>
                <ScrollStackItem>
                  <img src={withBase("/images-dash/profile.png")} alt="Profile" className="w-full h-full object-cover" />
                </ScrollStackItem>
              </ScrollStack>

              <section className="block py-16 md:py-24 lg:py-32 relative w-full z-10 overflow-hidden" data-cid="n133">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8 lg:px-12 items-center" data-cid="n134">
                  {/* Left Column: Globe Video */}
                  <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
                    <video src={withBase("/videos/globe_final.mp4")} autoPlay loop muted playsInline className="w-full h-auto object-contain" />
                  </div>

                  {/* Right Column: Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-7" data-cid="n135">
                    {FeatureCard_data.map((d, i) => <FeatureCard key={i} d={d} cids={FeatureCard_cids[i]} styles={FeatureCard_styles[i]} />)}
                  </div>
                </div>
              </section>
            </div>

            <div className="w-full min-h-[50vh] bg-background text-foreground py-16 px-6 md:px-16 flex items-center justify-center">
              <ScrollReveal
                baseOpacity={0.1}
                enableBlur
                baseRotation={3}
                blurStrength={4}
                textClassName="font-normal font-['Google_Sans',sans-serif] tracking-tight leading-snug"
              >
                A conventional sequential sweep moves through bands in a fixed order. Agile emitters can appear and disappear between visits. AEGIS uses a dual-agent scheduler: EAGER chases active/occupied signals. REVISIT monitors Age of Information and refreshes stale bands. The result: Detect faster. Reduce stale channels. Explain every scheduling decision.
              </ScrollReveal>
            </div>

            <section className="block py-16 md:py-24 lg:py-32 text-color-001 bg-foreground" data-cid="n172">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-8 lg:px-12" data-cid="n173">
                <div className="col-span-1 lg:col-span-5 mb-8 lg:mb-0" data-cid="n174">
                  <ScrollReveal as="h3" containerClassName="block text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight" textClassName="block" data-cid="n175">
                    C2 OPERATOR CELL
                  </ScrollReveal>
                </div>
                <div className="grid grid-cols-1 col-span-1 lg:col-span-7" data-cid="n176">
                  {MediaTile_data.map((d, i) => <MediaTile key={i} d={d} cids={MediaTile_cids[i]} styles={MediaTile_styles[i]} />)}
                </div>
              </div>
            </section>
            <section className="block py-16 md:py-24 lg:py-32 bg-color-001" data-cid="n225">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8 lg:px-12" data-cid="n226">
                <div className="col-span-1 lg:col-span-4 self-start sticky top-20 lg:top-40" data-cid="n227">
                  <div className="block" data-cid="n228">
                    <h2 className="flex items-center text-muted-foreground [font-family:'Google_Sans',_sans-serif] text-xs font-normal leading-5 tracking-[-0.48px] uppercase before:content-[''] before:block before:w-1.5 before:h-1.5 before:mr-[5.3px] before:bg-muted-foreground before:rounded-tl-[50%] max-lg:before:mr-[0.4375rem] 2xl:before:mr-2" data-cid="n229" data-component="heading">
                      <span className="block">Ready to scan?</span>
                    </h2>
                  </div>
                  <div className="block" data-cid="n243">
                    <div className="block mt-4 text-2xl md:text-4xl lg:text-5xl tracking-tight leading-tight" data-cid="n244">
                      <ScrollReveal as="span" containerClassName="block" textClassName="block" data-cid="n245">
                        Initialize AEGIS and enter the live scan console.
                      </ScrollReveal>
                      <ScrollReveal as="span" containerClassName="block" textClassName="block" data-cid="n263">
                        Elegant SCAN.
                      </ScrollReveal>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 lg:col-span-8 lg:col-start-5 mt-8 lg:mt-0" data-cid="n282">
                  <ScrollReveal as="p" containerClassName="block text-xl md:text-3xl lg:text-4xl text-clr-1 tracking-tight leading-tight" textClassName="block" data-cid="n283">
                    We engineer custom solutions designed for the most demanding environments. Our expertise spans three critical problem areas.
                  </ScrollReveal>
                </div>
                <div className="flex flex-col gap-8 col-span-1 lg:col-span-8 lg:col-start-5 mt-8" data-cid="n284">
                  {MediaTile2_data.map((d, i) => <MediaTile2 key={i} d={d} cids={MediaTile2_cids[i]} styles={MediaTile2_styles[i]} />)}
                </div>
              </div>
            </section>
            <section className="min-h-screen block relative" data-cid="n321">
              <div className="grid h-full grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8 lg:px-12" data-cid="n322">
                <div className="col-span-1 lg:col-span-8 lg:col-start-5 my-16 md:my-24 lg:my-32 self-start sticky top-20 lg:top-40" data-cid="n323">
                  <div className="block" data-cid="n324">
                    <h2 className="flex items-center text-muted-foreground [font-family:'Google_Sans',_sans-serif] text-xs font-normal leading-5 tracking-[-0.48px] uppercase before:content-[''] before:block before:w-1.5 before:h-1.5 before:mr-[5.3px] before:bg-muted-foreground before:rounded-tl-[50%] max-lg:before:mr-[0.4375rem] 2xl:before:mr-2" data-cid="n229" data-component="heading">
                      <span className="block">Ready to scan?</span>
                    </h2>
                  </div>
                  <div className="block" data-cid="n341">
                    <ScrollReveal as="div" containerClassName="block mt-8 text-3xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight" textClassName="block" data-cid="n342">
                      Performance Proven at Scale
                    </ScrollReveal>
                  </div>
                  <div className="block" data-cid="n368">
                    <ScrollReveal as="p" containerClassName="block text-clr-3 text-2xl md:text-4xl lg:text-5xl tracking-tight leading-tight" textClassName="block" data-cid="n369">
                      Built for environments where uptime is non-negotiable, our technology delivers measurable reliability.
                    </ScrollReveal>
                  </div>
                  <div className="block" data-cid="n370">
                    <Link className="w-28 h-10 flex relative mt-8 px-6 rounded-sm justify-center items-center overflow-hidden [font-family:'Google_Sans',_sans-serif] text-xs font-normal leading-5 tracking-[-0.48px] cursor-pointer max-md:mt-9 md:max-lg:mt-[73.7px] 2xl:mt-12 " data-cid="n371" to="/learn" aria-label="Learn more">
                      <span className="w-28 h-full block absolute top-0 left-0 z-2 min-w-0 pointer-events-none" data-cid="n372" />
                      <span className="w-28 h-full block absolute top-0 z-1 min-w-0 rounded-sm bg-surface [backdrop-filter:blur(32px)] pointer-events-none" data-cid="n373" />
                      <span className="w-28 h-full block absolute top-0 z-3 min-w-0 bg-primary transform-[matrix(1,0,0,1,-113.325,0)]" data-cid="n374" />
                      <span className="block relative z-3 whitespace-nowrap" data-cid="n375">
                        Learn more
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="h-full block absolute top-0 inset-x-0 -z-1" data-cid="n376">
                <img className="w-full h-full object-cover" data-cid="n377" src={withBase("/assets/cloned/images/b8d755616f69.png")} alt="" />
              </div>
            </section>
            <section className="block relative z-1 pb-16 lg:pb-32 -mt-12 lg:-mt-32" data-cid="n378">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-8 lg:px-12" data-cid="n379">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 col-span-1 lg:col-span-12" data-cid="n380">
                  <div className="flex relative p-8 md:p-12 lg:p-16 rounded-3xl flex-col overflow-hidden bg-color-001" data-cid="n381">
                    <div className="flex self-end" data-cid="n382">
                      <div className="block text-muted-foreground text-6xl md:text-8xl lg:text-9xl font-light tracking-tighter leading-none" data-cid="n383">
                        16
                      </div>
                    </div>
                    <div className="block mt-16 md:mt-24 lg:mt-32" data-cid="n385">
                      <div className="block" data-cid="n386">
                        <h3 className="block text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:leading-[1.375rem] md:max-lg:text-[2.3125rem] md:max-lg:leading-[2.8125rem] md:max-lg:tracking-[-0.74px] 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px] " data-cid="n387">
                          <span className="block" data-cid="n388">
                            16-Band Spectrum Coverage
                          </span>
                        </h3>
                      </div>
                      <div className="block" data-cid="n389">
                        <div className="block max-w-[266.7px] mt-3.5 text-muted-foreground text-sm leading-[1.25rem] tracking-[-0.28px] max-md:max-w-63.5 max-md:mt-1.5 max-md:leading-[1.1875rem] md:max-lg:max-w-[32.5125rem] md:max-lg:mt-[12.3px] md:max-lg:text-lg md:max-lg:leading-[1.5625rem] md:max-lg:tracking-[-0.36px] 2xl:max-w-100 2xl:mt-[21.3px] 2xl:text-lg 2xl:leading-[1.5625rem] 2xl:tracking-[-0.36px] " data-cid="n390">
                          <p className="block" data-cid="n391">
                            Sixteen 500 MHz hops span the 0.5–18.0 GHz surveillance envelope.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex relative p-8 md:p-12 lg:p-16 rounded-3xl flex-col overflow-hidden bg-color-001" data-cid="n392">
                    <div className="flex self-end" data-cid="n393">
                      <div className="block text-muted-foreground text-6xl md:text-8xl lg:text-9xl font-light tracking-tighter leading-none" data-cid="n394">
                        850
                        <span className="inline-block ml-2.5 align-top text-2xl md:text-4xl lg:text-5xl font-light tracking-tight" data-cid="n395">
                          ms
                        </span>
                      </div>
                    </div>
                    <div className="block mt-16 md:mt-24 lg:mt-32" data-cid="n396">
                      <div className="block" data-cid="n397">
                        <h3 className="block text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:leading-[1.375rem] md:max-lg:text-[2.3125rem] md:max-lg:leading-[2.8125rem] md:max-lg:tracking-[-0.74px] 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px] " data-cid="n398">
                          <span className="block" data-cid="n399">
                            AoI Revisit Threshold
                          </span>
                        </h3>
                      </div>
                      <div className="block" data-cid="n400">
                        <div className="block max-w-[266.7px] mt-3.5 text-muted-foreground text-sm leading-[1.25rem] tracking-[-0.28px] max-md:max-w-63.5 max-md:mt-1.5 max-md:leading-[1.1875rem] md:max-lg:max-w-[32.5125rem] md:max-lg:mt-[12.3px] md:max-lg:text-lg md:max-lg:leading-[1.5625rem] md:max-lg:tracking-[-0.36px] 2xl:max-w-100 2xl:mt-[21.3px] 2xl:text-lg 2xl:leading-[1.5625rem] 2xl:tracking-[-0.36px] " data-cid="n401">
                          <p className="block" data-cid="n402">
                            Revisit takes priority when a sub-band&apos;s Age of Information exceeds 850 ms, preventing channel starvation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex relative p-8 md:p-12 lg:p-16 rounded-3xl flex-col overflow-hidden bg-color-001" data-cid="n403">
                    <div className="flex self-end" data-cid="n404">
                      <div className="block text-muted-foreground text-6xl md:text-8xl lg:text-9xl font-light tracking-tighter leading-none" data-cid="n405">
                        2
                      </div>
                      <Icon4 cid="n406" />
                    </div>
                    <div className="block mt-16 md:mt-24 lg:mt-32" data-cid="n407">
                      <div className="block" data-cid="n408">
                        <h3 className="block text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:leading-[1.375rem] md:max-lg:text-[2.3125rem] md:max-lg:leading-[2.8125rem] md:max-lg:tracking-[-0.74px] 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px] " data-cid="n409">
                          <span className="block" data-cid="n410">
                            Dual-Agent Scheduler
                          </span>
                        </h3>
                      </div>
                      <div className="block" data-cid="n411">
                        <div className="block max-w-[266.7px] mt-3.5 text-muted-foreground text-sm leading-[1.25rem] tracking-[-0.28px] max-md:max-w-63.5 max-md:mt-1.5 max-md:leading-[1.1875rem] md:max-lg:max-w-[32.5125rem] md:max-lg:mt-[12.3px] md:max-lg:text-lg md:max-lg:leading-[1.5625rem] md:max-lg:tracking-[-0.36px] 2xl:max-w-100 2xl:mt-[21.3px] 2xl:text-lg 2xl:leading-[1.5625rem] 2xl:tracking-[-0.36px] " data-cid="n412">
                          <p className="block" data-cid="n413">
                            Eager chases active energy while Revisit refreshes stale bands through intelligent scheduling.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex relative p-8 md:p-12 lg:p-16 rounded-3xl flex-col overflow-hidden bg-color-001" data-cid="n414">
                    <div className="flex self-end" data-cid="n414-top">
                      <div className="block text-muted-foreground text-6xl md:text-8xl lg:text-9xl font-light tracking-tighter leading-none">
                        1
                      </div>
                    </div>
                    <div className="block mt-16 md:mt-24 lg:mt-32" data-cid="n415">
                      <div className="block" data-cid="n416">
                        <h3 className="block text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:leading-[1.375rem] md:max-lg:text-[2.3125rem] md:max-lg:leading-[2.8125rem] md:max-lg:tracking-[-0.74px] 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px] " data-cid="n417">
                          <span className="block" data-cid="n418">
                            Shared Adaptive Tuner
                          </span>
                        </h3>
                      </div>
                      <div className="block" data-cid="n419">
                        <div className="block max-w-[266.7px] mt-3.5 text-muted-foreground text-sm leading-[1.25rem] tracking-[-0.28px] max-md:max-w-63.5 max-md:mt-1.5 max-md:leading-[1.1875rem] md:max-lg:max-w-[32.5125rem] md:max-lg:mt-[12.3px] md:max-lg:text-lg md:max-lg:leading-[1.5625rem] md:max-lg:tracking-[-0.36px] 2xl:max-w-100 2xl:mt-[21.3px] 2xl:text-lg 2xl:leading-[1.5625rem] 2xl:tracking-[-0.36px] " data-cid="n420">
                          <p className="block" data-cid="n421">
                            Two agents share a single tuner, continuously deciding which sub-band should be visited next.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="block max-lg:hidden" data-cid="n422">
                      <Icon5 cid="n423" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="bg-[#FFE600] rounded-t-[4rem] px-6 py-16 md:px-12 md:py-20 mt-16 text-[#111] relative overflow-hidden flex flex-col items-center mx-2 md:mx-4" style={{ boxShadow: "0 -10px 30px rgba(17,17,17,0.05)" }}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% -20%, rgba(17,17,17,0.4) 0%, transparent 60%)" }}></div>

              {/* Top Logo & Title */}
              <div className="flex flex-col items-center mt-4 mb-8 relative z-10 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 256 256" fill="none" className="mb-4">
                  <path d="M 112 32 L 54.627 32 L 128 105.373 L 201.373 32 L 144 32 L 144 0 L 256 0 L 256 112 L 224 112 L 224 54.627 L 150.627 128 L 224 201.373 L 224 144 L 256 144 L 256 256 L 144 256 L 144 224 L 201.373 224 L 128 150.627 L 54.627 224 L 112 224 L 112 256 L 0 256 L 0 144 L 32 144 L 32 201.373 L 105.373 128 L 32 54.627 L 32 112 L 0 112 L 0 0 L 112 0 Z" fill="currentColor"></path>
                </svg>
                <h2 className="text-[4rem] md:text-[6rem] leading-none font-bold tracking-tighter mb-4 font-['Google_Sans',sans-serif] text-center" style={{ letterSpacing: "-0.05em" }}>AEGIS SYSTEM</h2>
                <p className="text-xl md:text-2xl font-serif italic text-[#111]/70 mb-10 mt-2 text-center">Smart Scan Scheduler</p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-20">
                  <Link to="/scan" className="bg-[#111] text-[#FFE600] px-8 py-3.5 rounded-full font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    Initialize Scan
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                  <Link to="/analytics" className="bg-transparent text-[#111] px-8 py-3.5 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#2a2a2a] transition-colors border border-[#111]/20 flex items-center justify-center gap-2">
                    View Analytics
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </div>

                <DevelopersAvatar />
              </div>

              {/* Large Background Text */}
              <div className="w-full flex justify-center pointer-events-none select-none mt-8 -mb-16 md:-mb-24 opacity-80">
                <span
                  className="text-[16vw] font-black uppercase leading-none tracking-tighter text-black"
                  style={{
                    maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                  }}
                >
                  INNOSOLVE
                </span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
    <DittoMotion spec={{"waapi":[],"rotators":[],"reveals":[{"cid":"n38","opacity":"0","transform":"none","transition":"","visibility":"hidden"},{"cid":"n70","opacity":"0","transform":"none","transition":"","visibility":"hidden"},{"cid":"n80","opacity":"0","transform":"none","transition":"","visibility":"hidden"},{"cid":"n106","opacity":"0","transform":"none","transition":"","visibility":"hidden"},{"cid":"n112","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n122","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n244","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n285","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n297","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n309","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n380","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n442","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n472","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n479","opacity":"0.341","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n486","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n493","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"},{"cid":"n500","opacity":"0","transform":"none","transition":"opacity 0.6s ease, transform 0.6s ease"}],"marquees":[]}} />

    <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: "8rem", zIndex: 50, pointerEvents: "none" }}>
      <GradualBlur
        target="parent"
        position="bottom"
        height="100%"
        strength={3}
        divCount={5}
        curve="bezier"
        exponential={true}
        opacity={1}
      />
    </div>
    </>
  );
}
