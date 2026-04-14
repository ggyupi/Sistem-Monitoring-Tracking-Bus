import { queryClient } from "@/lib/query-client";
import "@/styles/globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import "mapbox-gl/dist/mapbox-gl.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </>
  );
}
