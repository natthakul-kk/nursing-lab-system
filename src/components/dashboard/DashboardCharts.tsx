'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Coins,
  Boxes,
} from 'lucide-react';

interface DashboardChartsProps {
  courseCosts?: Array<{
    id: string;
    code: string;
    name: string;
    allocatedBudget: number;
    totalExpense: number;
    percentBudget: number;
  }>;
  monthlyTrends?: Array<{
    monthKey: string;
    month: string;
    outflowCost: number;
    inflowCost: number;
    txCount: number;
  }>;
  assetBreakdown?: Array<{
    name: string;
    value: number;
    color: string;
    status: string;
  }>;
  categoryDistribution?: Array<{
    name: string;
    itemCount: number;
    totalStock: number;
    totalValue: number;
  }>;
  totalAssets?: number;
}

const CATEGORY_COLORS = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#6366f1', // indigo-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#64748b', // slate-500
];

export default function DashboardCharts({
  courseCosts = [],
  monthlyTrends = [],
  assetBreakdown = [],
  categoryDistribution = [],
  totalAssets = 0,
}: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5"
          />
        ))}
      </div>
    );
  }

  // Prepared Course Chart Data
  const courseChartData = courseCosts.slice(0, 6).map((c) => ({
    name: c.code,
    fullName: c.name,
    งบจัดสรร: c.allocatedBudget,
    ใช้จริง: c.totalExpense,
    percent: c.percentBudget,
  }));

  // Prepared Category Data
  const categoryChartData = categoryDistribution.slice(0, 6).map((cat, idx) => ({
    name: cat.name,
    มูลค่า: cat.totalValue,
    ชิ้น: cat.totalStock,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              ภาพรวมการวิเคราะห์เชิงกราฟ (Visual Analytics & Mini Charts)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              วิเคราะห์งบประมาณรายวิชา สถิติการเบิกจ่ายคลัง และความพร้อมของครุภัณฑ์แบบเรียลไทม์
            </p>
          </div>
        </div>
      </div>

      {/* 4 Compact Mini Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Course Budget vs Expense (Mini Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                งบจัดสรร vs ใช้จริงรายวิชา (Course Budgets)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">เปรียบเทียบงบ (บาท)</span>
          </div>

          <div className="h-56 w-full">
            {courseChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลรายวิชาในภาคเรียนนี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={4}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700/80 space-y-1">
                            <div className="font-bold text-teal-300">
                              [{item.name}] {item.fullName}
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>งบที่ได้รับ:</span>
                              <span className="font-mono font-bold text-white">
                                ฿{item.งบจัดสรร?.toLocaleString('th-TH')}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>ใช้จริง:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                ฿{item.ใช้จริง?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                              ใช้ไปแล้ว {item.percent}%
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="งบจัดสรร" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="ใช้จริง" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Stock Outflow Trend (Mini Area Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                แนวโน้มยอดเบิกจ่ายสต็อก 6 เดือน (Disbursement Trend)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">มูลค่าจ่าย (บาท)</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyTrends}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700/80 space-y-1">
                          <div className="font-bold text-cyan-300">เดือน {data.month}</div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>ยอดเบิกจ่าย:</span>
                            <span className="font-mono font-bold text-white">
                              ฿{data.outflowCost?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>จำนวนรายการเบิก:</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              {data.txCount} ครั้ง
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="outflowCost"
                  name="มูลค่าเบิกจ่าย"
                  stroke="#0891b2"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOutflow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Equipment Asset Status (Donut Chart with Center Count) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                สัดส่วนสถานะครุภัณฑ์ในแล็บ (Asset Readiness)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">รวม {totalAssets} ชิ้น</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {assetBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const percent = totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(1) : '0';
                      return (
                        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700/80">
                          <div className="font-bold" style={{ color: item.color }}>
                            {item.name}
                          </div>
                          <div className="font-mono font-bold mt-0.5">
                            {item.value} ชิ้น ({percent}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Number inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">
                {totalAssets}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ชิ้นทั้งหมด
              </span>
            </div>
          </div>
        </div>

        {/* Chart 4: Top Inventory Value by Category (Horizontal Bars) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                มูลค่าสต็อกพัสดุตามหมวดหมู่ (Top Inventory Value)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">มูลค่ารวม (บาท)</span>
          </div>

          <div className="h-56 w-full">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ไม่มีข้อมูลสต็อกวัสดุ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700/80 space-y-1">
                            <div className="font-bold text-purple-300">{item.name}</div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>มูลค่าสต็อก:</span>
                              <span className="font-mono font-bold text-white">
                                ฿{item.มูลค่า?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>จำนวนคงเหลือ:</span>
                              <span className="font-mono text-purple-400 font-bold">
                                {item.ชิ้น?.toLocaleString('th-TH')} ชิ้น
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="มูลค่า" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
