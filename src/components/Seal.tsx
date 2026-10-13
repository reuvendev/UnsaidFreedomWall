
"use client";

interface SealProps {
  isDarkMode: boolean;
  className?: string;
}

export default function Seal({
  isDarkMode,
  className = "",
}: SealProps) {
  return (
    <div
      className={`absolute right-2 sm:right-5 top-1 z-0 select-none pointer-events-none ${className}`}
      role="img"
      aria-label="Seal mascot welcoming visitors to Tambayan"
    >
      {/* Speech bubble */}
      <div
        className={`
          absolute right-[82px] top-0 w-max
          rounded-xl border px-3 py-2 shadow-sm
          ${
            isDarkMode
              ? "bg-neutral-900 border-neutral-700"
              : "bg-white border-neutral-200"
          }
        `}
      >
        <p
          className={`font-mono text-[8px] font-bold uppercase tracking-widest ${
            isDarkMode
              ? "text-emerald-400"
              : "text-emerald-600"
          }`}
        >
          Seal
        </p>

        <p
          className={`mt-0.5 font-mono text-[10px] font-bold ${
            isDarkMode
              ? "text-neutral-200"
              : "text-neutral-700"
          }`}
        >
          Welcome sa TAMBAYAN.
        </p>

        {/* Bubble pointer */}
        <span
          className={`
            absolute -right-[5px] bottom-3
            h-2.5 w-2.5 rotate-45
            border-r border-t
            ${
              isDarkMode
                ? "bg-neutral-900 border-neutral-700"
                : "bg-white border-neutral-200"
            }
          `}
        />
      </div>

      {/* Seal body */}
      <div className="relative w-[92px] h-[78px]">
        {/* Left flipper */}
        <div
          className={`
            absolute left-[-7px] bottom-[4px]
            w-[30px] h-[18px]
            rounded-[80%_30%_70%_40%]
            -rotate-[28deg] border
            ${
              isDarkMode
                ? "bg-neutral-600 border-neutral-500"
                : "bg-[#d9dde0] border-[#b9bec2]"
            }
          `}
        />

        {/* Right flipper */}
        <div
          className={`
            absolute right-[-7px] bottom-[4px]
            w-[30px] h-[18px]
            rounded-[30%_80%_40%_70%]
            rotate-[28deg] border
            ${
              isDarkMode
                ? "bg-neutral-600 border-neutral-500"
                : "bg-[#d9dde0] border-[#b9bec2]"
            }
          `}
        />

        {/* Head */}
        <div
          className={`
            absolute inset-x-0 top-0 mx-auto
            w-[86px] h-[76px]
            overflow-visible
            rounded-[48%_48%_44%_44%]
            border shadow-sm
            ${
              isDarkMode
                ? "bg-neutral-600 border-neutral-500"
                : "bg-[#d9dde0] border-[#b9bec2]"
            }
          `}
        >
          {/* Muzzle */}
          <div
            className={`
              absolute left-1/2 top-[31px]
              -translate-x-1/2
              w-[52px] h-[32px] rounded-[50%]
              ${
                isDarkMode
                  ? "bg-neutral-500"
                  : "bg-[#eef0f1]"
              }
            `}
          />

          {/* Left eye */}
          <div className="absolute left-[22px] top-[25px] w-[8px] h-[10px] rounded-full bg-neutral-900">
            <span className="absolute left-[2px] top-[2px] w-[2.5px] h-[2.5px] rounded-full bg-white" />
          </div>

          {/* Right eye */}
          <div className="absolute right-[22px] top-[25px] w-[8px] h-[10px] rounded-full bg-neutral-900">
            <span className="absolute left-[2px] top-[2px] w-[2.5px] h-[2.5px] rounded-full bg-white" />
          </div>

          {/* Left cheek */}
          <div
            className={`
              absolute left-[27px] top-[39px]
              w-[19px] h-[15px] rounded-full
              ${
                isDarkMode
                  ? "bg-neutral-400"
                  : "bg-white"
              }
            `}
          />

          {/* Right cheek */}
          <div
            className={`
              absolute right-[27px] top-[39px]
              w-[19px] h-[15px] rounded-full
              ${
                isDarkMode
                  ? "bg-neutral-400"
                  : "bg-white"
              }
            `}
          />

          {/* Nose */}
          <div
            className="
              absolute left-1/2 top-[38px] z-10
              -translate-x-1/2
              w-[10px] h-[7px]
              rounded-[50%_50%_65%_65%]
              bg-neutral-900
            "
          />

          {/* Mouth */}
          <div className="absolute left-1/2 top-[45px] z-10 -translate-x-1/2">
            <span className="absolute right-[-1px] top-0 w-[9px] h-[7px] rounded-full border-b border-neutral-700" />
            <span className="absolute left-[-1px] top-0 w-[9px] h-[7px] rounded-full border-b border-neutral-700" />
          </div>

          {/* Left whiskers */}
          <div className="absolute left-[3px] top-[43px]">
            <span className="absolute w-[22px] h-px bg-neutral-500 -rotate-[10deg]" />
            <span className="absolute top-[6px] w-[23px] h-px bg-neutral-500 rotate-[3deg]" />
            <span className="absolute top-[12px] w-[21px] h-px bg-neutral-500 rotate-[12deg]" />
          </div>

          {/* Right whiskers */}
          <div className="absolute right-[3px] top-[43px]">
            <span className="absolute right-0 w-[22px] h-px bg-neutral-500 rotate-[10deg]" />
            <span className="absolute right-0 top-[6px] w-[23px] h-px bg-neutral-500 -rotate-[3deg]" />
            <span className="absolute right-0 top-[12px] w-[21px] h-px bg-neutral-500 -rotate-[12deg]" />
          </div>

          {/* Head highlight */}
          <div
            className={`
              absolute left-[24px] top-[9px]
              w-[20px] h-[8px]
              -rotate-12 rounded-full opacity-40
              ${
                isDarkMode
                  ? "bg-neutral-400"
                  : "bg-white"
              }
            `}
          />
        </div>
      </div>
    </div>
  );
}
