import React, { useState } from 'react';
import {
  Percent,
  DollarSign,
  AlertTriangle,
  Flame,
  ShieldCheck,
  TrendingDown,
  Info,
} from 'lucide-react';
import { WorstCaseMarginExposure } from '../types';

interface MarginSimulatorProps {
  exposure: WorstCaseMarginExposure;
}

export const MarginSimulator: React.FC<MarginSimulatorProps> = ({ exposure }) => {
  const [testBasket, setTestBasket] = useState<number>(100);

  // Approximate simulation for dynamic slider value based on exposure patterns
  const calculateDynamicScenario = (basket: number) => {
    // Find closest benchmark scenario ratio
    const benchmarks = exposure.worst_case_scenarios;
    if (benchmarks.length === 0) {
      return {
        gross: basket,
        discount: 0,
        net: basket,
        erosion: 0,
        shipping: 0,
        isZero: false,
      };
    }

    // Use worst case erosion rate from exposure
    const erosionRate = exposure.max_stackable_discount_pct / 100;
    const discountAmt = Math.min(basket, basket * erosionRate + exposure.max_fixed_discount_amount);
    const net = Math.max(0, basket - discountAmt);
    const erosion = basket > 0 ? (discountAmt / basket) * 100 : 0;
    const shipping = exposure.shipping_subsidy_risk ? 15 : 0;

    return {
      gross: basket,
      discount: Math.round(discountAmt * 100) / 100,
      net: Math.round(net * 100) / 100,
      erosion: Math.min(100, Math.round(erosion * 10) / 10),
      shipping,
      isZero: net <= 0.01,
    };
  };

  const currentSim = calculateDynamicScenario(testBasket);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span>Max Combined Discount</span>
            <Percent className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {exposure.max_stackable_discount_pct}%
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Simulated worst-case compounding promo erosion
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span>$0.00 Cart Exploit Risk</span>
            {exposure.zero_dollar_cart_vulnerable ? (
              <Flame className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              exposure.zero_dollar_cart_vulnerable
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {exposure.zero_dollar_cart_vulnerable ? 'EXPLOITABLE' : 'PROTECTED'}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {exposure.zero_dollar_cart_vulnerable
              ? 'Customers can checkout free orders'
              : 'Subtotal thresholds prevent $0 carts'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span>Active Promotion Nodes</span>
            <DollarSign className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {exposure.active_auto_discounts_count} Auto /{' '}
            {exposure.active_code_discounts_count} Code
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {exposure.has_unrestricted_stacking
              ? 'Unrestricted 3-way combinesWith detected'
              : 'Combinations constrained'}
          </p>
        </div>
      </div>

      {/* Interactive Cart Simulator */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Interactive Order Basket Margin Simulator
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Adjust hypothetical cart subtotal to inspect compounding margin loss.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">Simulated Cart:</span>
            <span className="text-base font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              ${testBasket}.00
            </span>
          </div>
        </div>

        {/* Slider Input */}
        <div className="space-y-2">
          <input
            id="margin-simulator-range-slider"
            type="range"
            min="20"
            max="500"
            step="5"
            value={testBasket}
            onChange={(e) => setTestBasket(Number(e.target.value))}
            className="w-full accent-zinc-900 dark:accent-zinc-100 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
            <span>$20 (Small Item)</span>
            <span>$100 (Standard AOV)</span>
            <span>$250 (Multi-Item Order)</span>
            <span>$500 (Large Basket)</span>
          </div>
        </div>

        {/* Results Bar */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Margin Breakdown:</span>
            <span
              className={`font-bold font-mono ${
                currentSim.isZero
                  ? 'text-rose-600 dark:text-rose-400'
                  : currentSim.erosion > 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {currentSim.erosion}% Margin Erosion
            </span>
          </div>

          {/* Visual Stack Bar */}
          <div className="w-full h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.min(100, currentSim.erosion)}%` }}
              className={`h-full ${
                currentSim.isZero
                  ? 'bg-rose-500'
                  : currentSim.erosion > 50
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              } transition-all duration-300`}
              title={`Discounts applied: $${currentSim.discount}`}
            />
            <div
              style={{ width: `${Math.max(0, 100 - currentSim.erosion)}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`Net merchant revenue: $${currentSim.net}`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Gross Subtotal</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">${currentSim.gross}.00</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Deducted Discounts</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-${currentSim.discount}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Net Collected</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">${currentSim.net}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Carrier Shipping Subsidy</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                {currentSim.shipping > 0 ? `-$${currentSim.shipping} (Free)` : '$0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Scenarios Matrix */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3 transition-colors">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Evaluated Worst-Case Stacking Benchmark Scenarios
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Simulated checkout results for representative basket sizes when all stackable promotions
          are exploited concurrently.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-semibold border-y border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Basket Size</th>
                <th className="py-2.5 px-3">Applied Stack</th>
                <th className="py-2.5 px-3">Gross Subtotal</th>
                <th className="py-2.5 px-3">Net Revenue</th>
                <th className="py-2.5 px-3">Margin Loss %</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
              {exposure.worst_case_scenarios.map((scenario, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50">
                  <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                    ${scenario.basket_size}.00
                  </td>
                  <td className="py-2.5 px-3 font-sans text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                    {scenario.applied_discounts.join(' + ') || 'No active stack'}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">${scenario.gross_revenue}.00</td>
                  <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                    ${scenario.net_revenue}
                  </td>
                  <td
                    className={`py-2.5 px-3 font-bold ${
                      scenario.margin_erosion_pct >= 75
                        ? 'text-rose-600 dark:text-rose-400'
                        : scenario.margin_erosion_pct >= 40
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {scenario.margin_erosion_pct}%
                  </td>
                  <td className="py-2.5 px-3">
                    {scenario.is_zero_dollar_cart ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
                        $0 Cart Breach
                      </span>
                    ) : scenario.margin_erosion_pct > 50 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
                        Severe Erosion
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
                        Controlled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
