"use client";

import { useEffect } from "react";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

export default function ExchangeRate() {
  const { rate, error, loading, fetchRate } = useExchangeRateStore();

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return (
    <div className=""> {/* Outer spacing */}
      <div className="flex flex-col justify-between rounded-2xl bg-card/70 backdrop-blur-sm transition">
        <div className="rounded-lg border bg-card text-card-foreground border-border px-8 py-8 sm:px-10 sm:py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">USD → UZS</h2>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Exchange Rate
            </span>
          </div>

          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-4 w-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            rate !== null && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">1 USD =</span>
                  <span className="text-2xl font-bold">
                    {rate.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">UZS</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
