import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { format, subMonths, isSameMonth, parseISO } from "date-fns";

export const useDashboardAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      // Parallel fetching
      const [ordersRes, usersRes, itemsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, amount, created_at, status")
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, created_at", { count: "exact" }),
        supabase
          .from("order_items")
          .select("quantity, price, variant:product_variants(product:products(id, name))")
          .limit(1000) // Limit for performance, in real app use RPC
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (usersRes.error) throw usersRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const orders = ordersRes.data || [];
      const userCount = usersRes.count || 0;
      const orderItems = itemsRes.data || [];

      // --- Aggregation Logic ---

      // 1. Revenue & Order Analytics
      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const totalOrders = orders.length;
      const totalSales = totalOrders; // Simplified: sales = orders for now

      // Generate Monthly Trends (Last 12 months)
      const months = Array.from({ length: 12 }).map((_, i) => subMonths(new Date(), 11 - i));
      const labels = months.map(d => format(d, "yyyy-MM-dd"));
      
      const revenueTrend = months.map(month => {
        return orders
          .filter(o => isSameMonth(parseISO(o.created_at), month))
          .reduce((sum, o) => sum + (o.amount || 0), 0);
      });

      const ordersTrend = months.map(month => {
        return orders
          .filter(o => isSameMonth(parseISO(o.created_at), month))
          .length;
      });

      const usersTrend = months.map(() => 0); // Placeholder if user dates aren't available easily

      // 2. Product Performance
      const productMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

      orderItems.forEach((item: any) => {
        const product = item.variant?.product;
        if (!product) return;
        
        const existing = productMap.get(product.id) || {
          id: product.id,
          name: product.name,
          quantity: 0,
          revenue: 0
        };

        existing.quantity += item.quantity || 0;
        existing.revenue += (item.price || 0) * (item.quantity || 0);
        productMap.set(product.id, existing);
      });

      const productPerformance = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Construct Data Object matching GraphQL shape
      const analyticsData = {
        revenueAnalytics: {
          totalRevenue,
          changes: { revenue: 0 }, // Mock change
          monthlyTrends: {
            labels,
            revenue: revenueTrend,
            orders: ordersTrend,
            sales: ordersTrend,
            users: usersTrend
          }
        },
        orderAnalytics: {
          totalOrders,
          totalSales,
          changes: { sales: 0, orders: 0 }
        },
        userAnalytics: {
          totalUsers: userCount,
          changes: { users: 0 },
          interactionTrends: { labels, views: [] },
          topUsers: []
        },
        interactionAnalytics: {
          totalInteractions: 0,
          byType: { views: 0, clicks: 0, others: 0 },
          mostViewedProducts: []
        },
        productPerformance,
        yearRange: {
          minYear: 2023,
          maxYear: 2025
        }
      };

      setData(analyticsData);
    } catch (err: any) {
      console.error("Dashboard analytics error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params.timePeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
