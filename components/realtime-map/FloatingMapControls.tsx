import {
  Check,
  LocateFixed,
  Map as MapIcon,
  Mountain,
  SlidersHorizontal,
} from "lucide-react";
import type { RefObject } from "react";

import type { MapStyleKey } from "@/lib/realtime-map-types";

type FloatingMapControlsProps = {
  isViewMenuOpen: boolean;
  isTiltedView: boolean;
  mapStyle: MapStyleKey;
  menuRef: RefObject<HTMLDivElement | null>;
  menuTriggerRef: RefObject<HTMLButtonElement | null>;
  onToggleViewMenu: () => void;
  onToggleTiltedView: () => void;
  onSelectMapStyle: (value: MapStyleKey) => void;
  onOpenGpsDialog: () => void;
};

export function FloatingMapControls({
  isViewMenuOpen,
  isTiltedView,
  mapStyle,
  menuRef,
  menuTriggerRef,
  onToggleViewMenu,
  onToggleTiltedView,
  onSelectMapStyle,
  onOpenGpsDialog,
}: FloatingMapControlsProps) {
  return (
    <div className="pointer-events-auto px-4 pb-2 pt-4 md:px-6 md:pt-5">
      <div className="inline-flex items-center gap-2">
        <div className="rounded-lg border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur-sm">
          Buswy Live Tracking
        </div>

        <div className="relative">
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={onToggleViewMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Buka menu tampilan peta"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {isViewMenuOpen ? (
            <div
              ref={menuRef}
              className="absolute left-0 top-full z-30 mt-2 w-56 rounded-lg border border-slate-200/90 bg-white/95 p-2 shadow-md backdrop-blur-sm"
            >
              <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Tampilan
              </div>

              <button
                type="button"
                onClick={onToggleTiltedView}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <Mountain className="h-4 w-4" />
                  {isTiltedView ? "Mode 3D" : "Mode 2D"}
                </span>
                <Check
                  className={`h-4 w-4 ${isTiltedView ? "opacity-100" : "opacity-0"}`}
                />
              </button>

              <div className="my-1 border-t border-slate-200" />

              <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Style Peta
              </div>

              {(
                [
                  ["light", "Light"],
                  ["streets", "Streets"],
                  ["satellite", "Satellite"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelectMapStyle(value)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4" />
                    {label}
                  </span>
                  <Check
                    className={`h-4 w-4 ${mapStyle === value ? "opacity-100" : "opacity-0"}`}
                  />
                </button>
              ))}

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={onOpenGpsDialog}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <LocateFixed className="h-4 w-4" />
                Lokasi Saya
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
