"use client";
import React from "react";
import Chart from "react-apexcharts";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";

interface RevenueOverTimeChartProps {
  labels: string[];
  revenue: number[];
}

const RevenueOverTimeChart: React.FC<RevenueOverTimeChartProps> = ({
  labels,
  revenue,
}) => {
  const formatPrice = useFormatPrice();
  if (!labels?.length || !revenue?.length) {
    return <div>No revenue data available</div>;
  }

  const monthlyTarget = 10000;
  const targetData = labels.map(() => monthlyTarget);

  const series = [
    {
      name: "Total Revenue",
      data: revenue,
      color: "#6366F1",
    },
    {
      name: "Total Target",
      data: targetData,
      color: "#FBBF24",
    },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      height: 350,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: labels.map((label) => {
        const date = new Date(label);
        return `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;
      }),
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          if (value >= 1000) {
            return `RM ${(value / 1000).toFixed(0)}K`;
          }
          return `RM ${value.toFixed(0)}`;
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => formatPrice(value),
      },
    },
    markers: {
      size: 4,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: ["#00C4B4", "#F59E0B"],
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <Chart options={options} series={series} type="line" height={350} />
    </div>
  );
};

export default RevenueOverTimeChart;
