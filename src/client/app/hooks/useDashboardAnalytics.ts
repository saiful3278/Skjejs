import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { format, subMonths, parseISO } from "date-fns";

export interface DashboardAnalyticsData {
  revenueAnalytics: {
    totalRevenue: number;
    changes: { revenue: number };
    monthlyTrends: {
      labels: string[];
      revenue: number[];
      orders: number[];
      sales: number[];
      users: number[];
    };
  };
  orderAnalytics: {
    totalOrders: number;
    totalSales: number;
    changes: { sales: number; orders: number };
  };
  userAnalytics: {
    totalUsers: number;
    changes: { users: number };
    topUsers: any[];
    interactionTrends: { views: number[] };
  };
  productPerformance: any[];
  interactionAnalytics: {
    totalInteractions: number;
    byType: { views: number; clicks: number; others: number };
    mostViewedProducts: any[];
  };
}

export const useDashboardAnalytics = (params: { timePeriod: string; year?: string; startDate?: string; endDate?: string }) => {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const depsKey = `${params.timePeriod}|${params.year ?? ""}|${params.startDate ?? ""}|${params.endDate ?? ""}`;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      
      let orders: any[] = [];
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, created_at, user_id, status, amount, total_amount, total, total_price")
        .limit(1000);
      
      if (ordersError && ordersError.code === "42703") {
        const { data: retryOrders, error: retryError } = await supabase
          .from("orders")
          .select("*")
          .limit(1000);
        if (retryError) throw retryError;
        orders = retryOrders || [];
      } else if (ordersError) {
        throw ordersError;
      } else {
        orders = ordersData || [];
      }

      let rawOrderItems: any[] = [];
      const { data: rawOrderItemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .limit(2000);
        
      if (itemsError) throw itemsError;
      rawOrderItems = rawOrderItemsData || [];

      let orderItems: any[] = [];
      if (rawOrderItems && rawOrderItems.length > 0) {
          const sampleItem = rawOrderItems[0];
          const hasVariantId = "variant_id" in sampleItem;
          const hasProductId = "product_id" in sampleItem;

          if (hasVariantId) {
              const variantIds = Array.from(new Set(rawOrderItems.map((item: any) => item.variant_id).filter(Boolean)));
              
              const { data: variants, error: variantsError } = await supabase
                .from("product_variants")
                .select("id, product:products(id, name)")
                .in("id", variantIds);
                
              if (variantsError) {
                  console.error("Error fetching variants for analytics:", variantsError);
              }
              
              const variantMap = new Map(variants?.map((v: any) => [v.id, v]));
              orderItems = rawOrderItems.map((item: any) => ({
                  ...item,
                  variant: variantMap.get(item.variant_id) || null
              }));
          } else if (hasProductId) {
              const productIds = Array.from(new Set(rawOrderItems.map((item: any) => item.product_id).filter(Boolean)));
              
              const { data: products, error: productsError } = await supabase
                .from("products")
                .select("id, name")
                .in("id", productIds);
                
              if (productsError) {
                  console.error("Error fetching products for analytics:", productsError);
              }

              const productMap = new Map(products?.map((p: any) => [p.id, p]));
              orderItems = rawOrderItems.map((item: any) => ({
                  ...item,
                  variant: { product: productMap.get(item.product_id) || null }
              }));
          } else {
             orderItems = rawOrderItems;
          }
      }

      const { count: userCount, error: userError } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });

      if (userError) throw userError;

      const getItemQty = (item: any) => {
          return Number(item?.quantity ?? item?.qty ?? item?.count ?? 0);
      };
      const getItemPrice = (item: any) => {
          return Number(item?.price ?? item?.unit_price ?? item?.amount ?? 0);
      };
      const getAmount = (order: any) => {
          // Robustly check for amount column or common alternatives
          return Number(order?.amount ?? order?.total_amount ?? order?.total ?? order?.total_price ?? 0);
      };

      // Total Revenue
      const totalRevenue = orders?.reduce((sum, order) => sum + getAmount(order), 0) || 0;
      const totalOrders = orders?.length || 0;
      
      // Monthly Trends
      const months: Record<string, { revenue: number; orders: number; sales: number; users: number }> = {};
      
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = format(date, "yyyy-MM");
        months[key] = { revenue: 0, orders: 0, sales: 0, users: 0 };
      }

      orders?.forEach(order => {
        if (order?.created_at) {
          const date = parseISO(order.created_at);
          const key = format(date, "yyyy-MM");
          if (months[key]) {
            months[key].revenue += getAmount(order);
            months[key].orders += 1;
          }
        }
      });

      const labels = Object.keys(months);
      const revenueTrend = Object.values(months).map(m => m.revenue);
      const ordersTrend = Object.values(months).map(m => m.orders);

      const productStats: Record<string, { id: string; name: string; revenue: number; quantity: number }> = {};
      
      orderItems?.forEach((item: any) => {
        const productName = item.variant?.product?.name || "Unknown Product";
        const productId = item.variant?.product?.id || "unknown";
        
        if (!productStats[productId]) {
          productStats[productId] = { id: productId, name: productName, revenue: 0, quantity: 0 };
        }
        productStats[productId].revenue += (getItemPrice(item) * getItemQty(item));
        productStats[productId].quantity += getItemQty(item);
      });

      const productPerformance = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Construct final data object
      const analyticsData: DashboardAnalyticsData = {
        revenueAnalytics: {
          totalRevenue,
          changes: { revenue: 0 }, // changes calculation omitted for brevity
          monthlyTrends: {
            labels,
            revenue: revenueTrend,
            orders: ordersTrend,
            sales: ordersTrend, // simplified
            users: ordersTrend.map(() => 0), // users trend requires user creation date
          },
        },
        orderAnalytics: {
          totalOrders,
          totalSales: totalRevenue, // simplified
          changes: { sales: 0, orders: 0 },
        },
        userAnalytics: {
          totalUsers: userCount || 0,
          changes: { users: 0 },
          topUsers: [], // fetch top users if needed
          interactionTrends: { views: [] },
        },
        productPerformance,
        interactionAnalytics: {
          totalInteractions: 0,
          byType: { views: 0, clicks: 0, others: 0 },
          mostViewedProducts: [],
        },
      };

      setData(analyticsData);
      setLoading(false);
    } catch (err: any) {
      const message = String(err?.message || "");
      const isAbort = /Abort|Failed to fetch|ERR_ABORTED/i.test(message);
      if (!isAbort) {
        setError(err);
      }
      setLoading(false);
    }
  }, [depsKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalytics();
    }, 350);
    return () => clearTimeout(timer);
  }, [depsKey, fetchAnalytics]);

  return { data, loading, error, refetch: fetchAnalytics };
};
