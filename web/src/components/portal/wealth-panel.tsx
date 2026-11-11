"use client";

import { useCustomer } from "@/lib/customer-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Fact } from "@/lib/types";
import {
  Wallet,
  TrendingUp,
  Landmark,
  CircleDollarSign,
  AlertCircle,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Fallback data so the screen never looks empty during a demo        */
/* ------------------------------------------------------------------ */

const FALLBACK_INCOME = [
  { type: "Employment", amount: "$152,000", country: "United States" },
  { type: "Rental income", amount: "₹8,40,000", country: "India" },
];

const FALLBACK_ASSETS = [
  { type: "Property", country: "India", approximateValue: "₹1.2 Cr" },
  { type: "401(k)", country: "United States", approximateValue: "$87,000" },
  { type: "Bank account", country: "India", approximateValue: "₹15,00,000" },
];

const FALLBACK_LIABILITIES = [
  { type: "Home loan", country: "India", approximateValue: "₹45,00,000" },
];

/* ------------------------------------------------------------------ */

interface WealthPanelProps {
  facts: Fact[];
  openActionCount: number;
}

export function WealthPanel({ facts, openActionCount }: WealthPanelProps) {
  const { onboardingData } = useCustomer();

  const incomeSources =
    onboardingData.income?.sources && onboardingData.income.sources.length > 0
      ? onboardingData.income.sources.map((s) => ({
          type: s.type,
          amount: s.amount
            ? `${s.currency === "INR" ? "₹" : "$"}${Number(s.amount).toLocaleString()}`
            : "—",
          country: s.country || "—",
        }))
      : FALLBACK_INCOME;

  const assets =
    onboardingData.assets?.items && onboardingData.assets.items.length > 0
      ? onboardingData.assets.items
      : FALLBACK_ASSETS;

  const liabilities = FALLBACK_LIABILITIES;

  const totalIncome = facts.find(
    (f) => f.key.toLowerCase() === "total_income" || f.key.toLowerCase() === "annual_income"
  );

  const usingFallback =
    !onboardingData.income?.sources?.length && !onboardingData.assets?.items?.length;

  return (
    <div className="space-y-3">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Your Wealth
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {openActionCount > 0 && (
            <Badge
              variant="outline"
              className="rounded-full border-amber-300 bg-amber-50 text-amber-800 text-[10px] px-2.5 py-0.5 font-medium"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              {openActionCount} pending action{openActionCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {usingFallback && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
          <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[11px] text-primary">
            Showing sample data.{" "}
            <Link
              href="/portal/onboarding"
              className="underline font-medium hover:text-primary/80"
            >
              Update your profile
            </Link>{" "}
            to see your actual figures.
          </p>
        </div>
      )}

      {/* Total income highlight */}
      {totalIncome && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-3">
            <CircleDollarSign className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary/70">
                Total annual income
              </p>
              <p className="text-xl font-bold tabular-nums text-primary">
                {totalIncome.unit === "INR" ? "₹" : "$"}
                {Number(totalIncome.value).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income sources */}
      <Card>
        <CardHeader className="px-4 pb-1.5 pt-3">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Income sources
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-2">
            {incomeSources.map((src, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {src.type}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {src.country}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0 ml-3">
                  {src.amount}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader className="px-4 pb-1.5 pt-3">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" />
            Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-2">
            {assets.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.type}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.country}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums shrink-0 ml-3",
                    "text-foreground"
                  )}
                >
                  {a.approximateValue}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liabilities */}
      <Card>
        <CardHeader className="px-4 pb-1.5 pt-3">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CircleDollarSign className="h-3.5 w-3.5" />
            Liabilities
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {liabilities.length > 0 ? (
            <div className="space-y-2">
              {liabilities.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {l.type}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {l.country}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground shrink-0 ml-3">
                    {l.approximateValue}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-2">
              No liabilities reported.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
