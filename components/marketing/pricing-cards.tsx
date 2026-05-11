"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import {
  formatPrice,
  PLANS,
  type Currency,
  type CurrencyContext,
} from "@/lib/marketing/plans";

type BillingCycle = "monthly" | "yearly";

interface PricingCardsProps {
  currencyContext: CurrencyContext;
  variant?: "full" | "compact";
}

export function PricingCards({
  currencyContext,
  variant = "full",
}: PricingCardsProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const currency: Currency = currencyContext.currency;

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="inline-flex border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            cycle === "monthly"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setCycle("yearly")}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors ${
            cycle === "yearly"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Yearly
          <span className="bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Save 20%
          </span>
        </button>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const displayPrice =
            cycle === "monthly"
              ? plan.monthly[currency]
              : plan.monthlyEquivalentYearly[currency];
          const totalYearly = plan.yearly[currency];
          const isHighlighted = plan.highlight;

          return (
            <div
              key={plan.id}
              className={`flex flex-col border p-7 ${
                isHighlighted
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
            >
              {isHighlighted && (
                <span className="mb-4 inline-flex w-fit bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-zinc-900">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.blurb}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatPrice(displayPrice, currencyContext)}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  / month
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {cycle === "yearly"
                  ? `Billed ${formatPrice(totalYearly, currencyContext)} yearly`
                  : "Billed monthly"}
              </p>

              <Link
                href="/auth/sign-up"
                className={`mt-6 inline-flex h-10 items-center justify-center px-4 text-sm font-medium transition-colors ${
                  isHighlighted
                    ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
                }`}
              >
                Start free trial
              </Link>

              {variant === "full" && (
                <ul className="mt-6 space-y-2.5 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
