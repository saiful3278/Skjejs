"use client";
import dynamic from "next/dynamic";
import StatsCard from "@/app/components/organisms/StatsCard";
import Dropdown from "@/app/components/molecules/Dropdown";
import DateRangePicker from "@/app/components/molecules/DateRangePicker";
import {
  BarChart2,
  DollarSign,
  ShoppingCart,
  Users,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { Controller, useForm } from "react-hook-form";
import React, { useState } from "react";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";
import { useLazyExportAnalyticsQuery } from "@/app/store/apis/AnalyticsApi";
import { useDashboardAnalytics } from "@/app/hooks/useDashboardAnalytics";
import CustomLoader from "@/app/components/feedback/CustomLoader";
import ListCard from "@/app/components/organisms/ListCard";
import { withAuth } from "@/app/components/HOC/WithAuth";

// Dynamically import charting components with SSR disabled
const AreaChart = dynamic(
  () => import("@/app/components/charts/AreaChartComponent"),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("@/app/components/charts/BarChartComponent"),
  { ssr: false }
);
const DonutChart = dynamic(
  () => import("@/app/components/charts/DonutChartComponent"),
  { ssr: false }
);

interface FormData {
  timePeriod: string;
  year?: string;
  startDate?: string;
  endDate?: string;
  useCustomRange: boolean;
}

const AnalyticsDashboard = () => {
  const { control, watch } = useForm<FormData>({
    defaultValues: {
      timePeriod: "allTime",
      useCustomRange: false,
      year: new Date().getFullYear().toString(),
    },
  });
  const formatPrice = useFormatPrice();

  const timePeriodOptions = [
    { label: "Last 7 Days", value: "last7days" },
    { label: "Last Month", value: "lastMonth" },
    { label: "Last Year", value: "lastYear" },
    { label: "All Time", value: "allTime" },
  ];

  const { timePeriod, year, startDate, endDate, useCustomRange } = watch();

  const queryParams = {
    timePeriod: timePeriod || "allTime",
    year: useCustomRange ? undefined : year ? parseInt(year, 10) : undefined,
    startDate: useCustomRange && startDate ? startDate : undefined,
    endDate: useCustomRange && endDate ? endDate : undefined,
  };

  const { data, loading, error } = useDashboardAnalytics(queryParams);

  const [exportType, setExportType] = useState<string>("all");
  const [exportFormat] = useState<string>("csv");

  // Removed console.log statements to reduce noise

  const trendYears =
    data?.revenueAnalytics?.monthlyTrends?.labels
      ?.map((l) => Number(l.split("-")[0]))
      .filter((y, idx, arr) => arr.indexOf(y) === idx)
      .sort((a, b) => a - b) || [new Date().getFullYear()];
  const minYear = trendYears[0] || new Date().getFullYear();
  const maxYear = trendYears[trendYears.length - 1] || new Date().getFullYear();
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    label: (minYear + i).toString(),
    value: (minYear + i).toString(),
  }));

  const [, { isLoading: isExporting, error: exportError }] =
    useLazyExportAnalyticsQuery();

  // Removed console.log statement to reduce noise

  const handleExport = async () => {};

  if (loading) {
    return <CustomLoader />;
  }

  if (error) {
    console.error("Analytics Error:", error);
    return <div>Error loading analytics data</div>;
  }

  // Chart and list data
  const mostSoldProducts = {
    labels: data?.productPerformance?.slice(0, 10).map((p) => p.name) || [],
    data: data?.productPerformance?.slice(0, 10).map((p) => p.quantity) || [],
  };

  const salesByProduct = {
    categories: data?.productPerformance?.map((p) => p.name) || [],
    data: data?.productPerformance?.map((p) => p.revenue) || [],
  };

  const interactionByType = {
    labels: ["Views", "Clicks", "Others"],
    data: [
      data?.interactionAnalytics?.byType?.views || 0,
      data?.interactionAnalytics?.byType?.clicks || 0,
      data?.interactionAnalytics?.byType?.others || 0,
    ],
  };

  const topItems =
    data?.productPerformance?.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      revenue: formatPrice(p.revenue),
    })) || [];

  const mostViewedProducts =
    data?.interactionAnalytics?.mostViewedProducts?.slice(0, 10).map((p) => ({
      id: p.productId,
      name: p.productName,
      viewCount: p.viewCount,
    })) || [];

  const exportTypeOptions = [
    { label: "All Data", value: "all" },
    { label: "Overview", value: "overview" },
    { label: "Products", value: "products" },
    { label: "Users", value: "users" },
  ];

  const exportFormatOptions = [
    { label: "CSV", value: "csv" },
    { label: "PDF", value: "pdf" },
    { label: "XLSX", value: "xlsx" },
  ];

  return (
    <motion.div
      className="p-4 min-h-screen space-y-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <Controller
            name="timePeriod"
            control={control}
            render={({ field }) => (
              <Dropdown
                onChange={field.onChange}
                options={timePeriodOptions}
                value={field.value}
                label="Time Period"
                className="min-w-[150px] max-w-[200px]"
              />
            )}
          />
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <Dropdown
                onChange={field.onChange}
                options={yearOptions}
                value={field.value ?? "all"}
                label="Year"
                className="min-w-[150px] max-w-[200px]"
                disabled={useCustomRange}
              />
            )}
          />
          <DateRangePicker
            label="Custom Date Range"
            control={control}
            startName="startDate"
            endName="endDate"
          />
          <Dropdown
            options={exportTypeOptions}
            value={exportType}
            onChange={(value) => value !== null && setExportType(value)}
            label="Export Type"
            className="min-w-[150px] max-w-[200px]"
          />
          <Dropdown
            options={exportFormatOptions}
            value={exportFormat}
            onChange={(value) => setExportType(value ?? "")}
            label="Export Format"
            className="min-w-[150px] max-w-[200px]"
          />
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-5 h-5" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatsCard
          title="Total Revenue"
          value={formatPrice(data?.revenueAnalytics?.totalRevenue || 0)}
          percentage={data?.revenueAnalytics?.changes?.revenue}
          caption="since last period"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Orders"
          value={data?.orderAnalytics?.totalOrders || 0}
          percentage={data?.orderAnalytics?.changes?.orders}
          caption="since last period"
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Sales"
          value={data?.orderAnalytics?.totalSales || 0}
          percentage={data?.orderAnalytics?.changes?.sales}
          caption="since last period"
          icon={<BarChart2 className="w-5 h-5" />}
        />
        {/* Average Order Value can be derived; omitted for Supabase-lite analytics */}
        <StatsCard
          title="Total Users"
          value={data?.userAnalytics?.totalUsers || 0}
          percentage={data?.userAnalytics?.changes?.users}
          caption="since last period"
          icon={<Users className="w-5 h-5" />}
        />
        {/* Advanced user metrics omitted in Supabase-only mode */}
        <StatsCard
          title="Total Interactions"
          value={data?.interactionAnalytics?.totalInteractions || 0}
          percentage={0} // ! HARD CODED
          caption="all interactions"
          icon={<BarChart2 className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
        <AreaChart
          title="Order Trends"
          data={data?.revenueAnalytics?.monthlyTrends?.orders || []}
          categories={data?.revenueAnalytics?.monthlyTrends?.labels || []}
          color="#ec4899"
          percentageChange={data?.orderAnalytics?.changes?.orders}
        />
        <AreaChart
          title="Revenue Trends"
          data={data?.revenueAnalytics?.monthlyTrends?.revenue || []}
          categories={data?.revenueAnalytics?.monthlyTrends?.labels || []}
          color="#22c55e"
          percentageChange={data?.revenueAnalytics?.changes?.revenue}
        />
        <AreaChart
          title="Sales Trends"
          data={data?.revenueAnalytics?.monthlyTrends?.sales || []}
          categories={data?.revenueAnalytics?.monthlyTrends?.labels || []}
          color="#3b82f6"
          percentageChange={data?.orderAnalytics?.changes?.sales}
        />
        <AreaChart
          title="User Trends"
          data={data?.revenueAnalytics?.monthlyTrends?.users || []}
          categories={data?.revenueAnalytics?.monthlyTrends?.labels || []}
          color="#f59e0b"
          percentageChange={data?.userAnalytics?.changes?.users}
        />
        {/* Interaction Trends omitted until interactions aggregation is implemented */}
        <DonutChart
          title="Top 10 Products by Quantity"
          data={mostSoldProducts.data}
          labels={mostSoldProducts.labels}
        />
        <DonutChart
          title="Interactions by Type"
          data={interactionByType.data}
          labels={interactionByType.labels}
        />
        {/* RevenueOverTimeChart removed (was GraphQL-backed) */}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2Gap-2">
        <ListCard
          title="Top Products"
          viewAllLink="/shop"
          items={topItems}
          itemType="product"
        />
        {/* Top Users list omitted in Supabase-lite analytics */}
        <ListCard
          title="Most Viewed Products"
          viewAllLink="/shop"
          items={mostViewedProducts}
          itemType="product"
        />
        <BarChart
          title="Sales by Product"
          data={salesByProduct.data}
          categories={salesByProduct.categories}
          color="#4CAF50"
        />
      </div>
    </motion.div>
  );
};

export default withAuth(AnalyticsDashboard);
