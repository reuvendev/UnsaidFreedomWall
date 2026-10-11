'use client';

// TEMPORARY: PROJECT BLUE 10.12
// Updated: more visible blue fireflies; no public tribute/message on homepage.
// Removal: delete this component, ProjectBlueEasterEgg.date.ts,
// ProjectBlueEasterEgg.module.css, ProjectBlueFireflies.module.css,
// PROJECT_BLUE_10_12.md (if present), and the single HomeClient.tsx import/placement.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { isProjectBlueDay, PROJECT_BLUE_START, PROJECT_BLUE_END } from './ProjectBlueEasterEgg.date';
import styles from './ProjectBlueEasterEgg.module.css';
import blue from './ProjectBlueFireflies.module.css';

const petals = [styles.petalOne, styles.petalTwo, styles.petalThree, styles.petalFour, styles.petalFive];

// TEMPORARY: PROJECT BLUE 10.12
// Precomputed deterministic positions avoid SSR/hydration inconsistencies.
// The fireflies have independent movement, sizes, delays and brightness.
const fireflies = Array.from({ length: 32 }, (_, index) => {
  const hash = (n: number) => {
    const value = Math.sin((index + 1) * n * 127.1) * 43758.5453;
    return value - Math.floor(value);
  };
  return {
    x: 4 + hash(1.1) * 92,
    y: 6 + hash(2.7) * 87,
    size: 3.2 + hash(3.9) * 5.5,
    moveX: (hash(4.3) - 0.5) * 145,
    moveY: -35 - hash(5.7) * 105,
    duration: 8 + hash(6.1) * 11,
    delay: -(hash(7.9) * 22),
    opacity: 0.65 + hash(8.3) * 0.35,
  };
});

function Flower() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className={styles.flowerArt} aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="22" cy="12" rx="5.2" ry="9" />
        <ellipse cx="22" cy="12" rx="5.2" ry="9" transform="rotate(72 22 22)" />
        <ellipse cx="22" cy="12" rx="5.2" ry="9" transform="rotate(144 22 22)" />
        <ellipse cx="22" cy="12" rx="5.2" ry="9" transform="rotate(216 22 22)" />
        <ellipse cx="22" cy="12" rx="5.2" ry="9" transform="rotate(288 22 22)" />
      </g>
      <circle cx="22" cy="22" r="4" fill="#d9eafa" />
      <circle cx="22" cy="22" r="1.5" fill="#477dbf" />
    </svg>
  );
}

// TEMPORARY: PROJECT BLUE 10.12 — hand-tied blue bouquet.
function BlueBouquet() {
  const blooms = [
    { x: 32, y: 37, r: -18, scale: .88 }, { x: 54, y: 22, r: 9, scale: 1.04 },
    { x: 76, y: 35, r: 22, scale: .93 }, { x: 44, y: 51, r: -7, scale: .85 },
    { x: 68, y: 53, r: 15, scale: .82 },
  ];
  return (
    <svg className={blue.bouquetArt} viewBox="0 0 110 132" fill="none" aria-hidden="true">
      <g stroke="#5d997e" strokeWidth="2.6" strokeLinecap="round">
        {blooms.map((b, i) => <path key={i} d={`M55 109 Q${b.x + 4} 77 ${b.x} ${b.y}`} />)}
      </g>
      <g fill="#83bda6">
        <ellipse cx="41" cy="83" rx="6" ry="14" transform="rotate(-42 41 83)" />
        <ellipse cx="69" cy="82" rx="6" ry="14" transform="rotate(40 69 82)" />
      </g>
      {blooms.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r}) scale(${b.scale})`}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse key={angle} cx="0" cy="-9" rx="6.2" ry="10.8"
              transform={`rotate(${angle})`} fill={i % 2 ? '#83bfff' : '#5e9fe8'}
              stroke="#d5ecff" strokeWidth=".7" />
          ))}
          <circle r="5.3" fill="#e3f4ff" /><circle r="2.5" fill="#f8fdff" />
        </g>
      ))}
      <path d="M43 91 Q55 96 67 91 L61 115 Q55 120 49 115 Z"
        fill="#c7e3ff" fillOpacity=".82" stroke="#86b8ee" strokeWidth="1.1" />
      <path d="M55 96 C42 85 33 90 40 101 C45 106 52 101 55 98 C59 89 71 87 73 96 C74 106 61 104 55 98"
        fill="#76aef0" stroke="#c8e7ff" strokeWidth="1.1" />
      <path d="M55 99 L49 114 L56 110 L62 116 L58 99" fill="#568fd5" />
    </svg>
  );
}

export default function ProjectBlueEasterEgg({ isDarkMode }: { isDarkMode: boolean }) {
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const flowerButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // TEMPORARY: PROJECT BLUE 10.12 — preview works only in `npm run dev`:
    // http://localhost:3000/?projectBluePreview=1
    const preview = process.env.NODE_ENV === 'development' &&
      new URLSearchParams(window.location.search).get('projectBluePreview') === '1';
    const sync = () => {
      const now = new Date();
      setActive(isProjectBlueDay(now) || (preview && now.getTime() < PROJECT_BLUE_START));
    };
    sync();
    if (Date.now() >= PROJECT_BLUE_END) return;
    document.addEventListener('visibilitychange', sync);
    const interval = window.setInterval(sync, 60_000);
    const untilStart = PROJECT_BLUE_START - Date.now();
    const startTimer = untilStart > 0 && untilStart <= 2_147_483_647
      ? window.setTimeout(sync, untilStart) : undefined;
    const remaining = PROJECT_BLUE_END - Date.now();
    const endTimer = remaining > 0 && remaining <= 2_147_483_647
      ? window.setTimeout(() => {
          sync();
          window.clearInterval(interval);
          document.removeEventListener('visibilitychange', sync);
        }, remaining) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.clearInterval(interval);
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      if (endTimer !== undefined) window.clearTimeout(endTimer);
    };
  }, []);

  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      // Close button is the only focusable element inside this small dialog.
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      flowerButton.current?.focus();
    };
  }, [open]);

  if (!active) return null;

  return (
    <>
      {/* Existing background atmosphere remains unchanged. */}
      <div className={`${styles.atmosphere} ${isDarkMode ? styles.atmosphereDark : styles.atmosphereLight}`} aria-hidden="true" />

      {/* TEMPORARY: PROJECT BLUE 10.12 — brighter, full-viewport fireflies. */}
      <div className={`${blue.fireflyField} ${isDarkMode ? blue.dark : blue.light}`} aria-hidden="true">
        <div className={blue.blueHaze} />
        {fireflies.map((fly, index) => {
          const customStyles = {
            '--fly-x': `${fly.x}%`,
            '--fly-y': `${fly.y}%`,
            '--fly-size': `${fly.size}px`,
            '--fly-move-x': `${fly.moveX}px`,
            '--fly-move-y': `${fly.moveY}px`,
            '--fly-wander-x': `${fly.moveX * .42}px`,
            '--fly-wander-y': `${fly.moveY * .18}px`,
            '--fly-veer-x': `${fly.moveX * -.25}px`,
            '--fly-veer-y': `${fly.moveY * .76}px`,
            '--fly-duration': `${fly.duration}s`,
            '--fly-delay': `${fly.delay}s`,
            '--fly-opacity': fly.opacity,
          } as CSSProperties;
          return (
            <span key={index} className={blue.firefly} style={customStyles}>
              <span className={blue.fireflyLight} />
            </span>
          );
        })}
      </div>

      <div className={`${styles.garden} ${blue.bouquetGarden} ${isDarkMode ? styles.dark : styles.light}`}>
        <div className={styles.flowers} aria-hidden="true">
          <span className={`${styles.flower} ${styles.flowerOne} ${blue.bloom}`}><Flower /></span>
          <span className={`${styles.flower} ${styles.flowerTwo} ${blue.bloom}`}><Flower /></span>
          <span className={`${styles.flower} ${styles.flowerThree} ${blue.bloom}`}><Flower /></span>
          <span className={`${styles.flower} ${styles.flowerFour} ${blue.bloom}`}><Flower /></span>
          <span className={`${styles.flower} ${styles.flowerFive} ${blue.bloom}`}><Flower /></span>
          <span className={`${styles.flower} ${styles.flowerSix} ${blue.bloom}`}><Flower /></span>
        </div>
        <div className={styles.petals} aria-hidden="true">
          {petals.map((className, index) => <span key={index} className={`${styles.petal} ${className}`} />)}
        </div>
        {/* No visible tribute card or message; hidden message stays in click-to-open modal only. */}
        <button
          ref={flowerButton}
          type="button"
          className={`${styles.specialFlower} ${blue.specialFlowerGlow} ${blue.bouquetButton}`}
          aria-label="Open the blue bouquet's hidden message"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <BlueBouquet />
        </button>
      </div>
      {open && createPortal(
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-blue-title"
            aria-describedby="project-blue-message"
            className={`${styles.modal} ${isDarkMode ? styles.modalDark : styles.modalLight}`}
          >
            <div className={styles.modalParticles} aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>
            <span className={styles.modalFlowerLeft} aria-hidden="true"><Flower /></span>
            <span className={styles.modalFlowerRight} aria-hidden="true"><Flower /></span>
            <button ref={closeButton} type="button" className={styles.close} aria-label="Close the message" onClick={() => setOpen(false)}>×</button>
            <Flower />
            <h2 id="project-blue-title">For someone, somewhere.</h2>
            <p id="project-blue-message">You probably don't know it, but you're one of the reasons this whole thing started.</p>
            <p className={styles.closingLine}>10.12</p>
          </section>
        </div>, document.body
      )}
    </>
  );
}
