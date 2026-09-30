'use client';

import { useEffect, useRef } from 'react';

interface AdvertisementProps {
  isDarkMode?: boolean;
}

export default function Advertisement({
  isDarkMode = false,
}: AdvertisementProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    // Prevent duplicate ads during React re-renders
    if (adRef.current.dataset.loaded === 'true') return;

    adRef.current.dataset.loaded = 'true';

    // Clear container
    adRef.current.innerHTML = '';

    // Ad configuration
    const configScript = document.createElement('script');

    configScript.innerHTML = `
      atOptions = {
        'key': '2c7e18080e4e82b954dd29fff1dc3355',
        'format': 'iframe',
        'height': 50,
        'width': 320,
        'params': {}
      };
    `;

    // Ad script
    const adScript = document.createElement('script');

    adScript.src =
      'https://www.highrevenueformat.com/2c7e18080e4e82b954dd29fff1dc3355/invoke.js';

    adScript.async = true;

    adRef.current.appendChild(configScript);
    adRef.current.appendChild(adScript);

    return () => {
      if (adRef.current) {
        adRef.current.innerHTML = '';
        delete adRef.current.dataset.loaded;
      }
    };
  }, []);

  return (
    <div className="my-8 flex justify-center">
      <div
        className={`w-full max-w-[360px] rounded-xl border p-3 ${
          isDarkMode
            ? 'border-neutral-800 bg-neutral-900/50'
            : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        {/* Advertisement label */}
        <div
          className={`mb-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] ${
            isDarkMode
              ? 'text-neutral-600'
              : 'text-neutral-400'
          }`}
        >
          Advertisement
        </div>

        {/* 320x50 ad */}
        <div className="flex min-h-[50px] w-full items-center justify-center overflow-hidden">
          <div ref={adRef} className="h-[50px] w-[320px]" />
        </div>
      </div>
    </div>
  );
}