"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so this must never render during
// SSR — loaded as one dynamic unit (not per sub-component) because
// react-leaflet's hooks (useMapEvents) can't be dynamically imported
// individually the way plain components can.
export const LocationPickerMap = dynamic(() => import("./LocationPickerMapInner"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-muted" />,
});
