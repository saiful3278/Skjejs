import { apiSlice } from "../slices/ApiSlice";

export const analyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query<any, void>({
      queryFn: async () => {
        // Mock data for now as real analytics requires complex aggregation not easily done in client-side Supabase query
        // In a real app, this would call a Supabase Edge Function
        return {
          data: {
            totalRevenue: 15430,
            revenueGrowth: 12.5,
            totalOrders: 156,
            ordersGrowth: 8.2,
            totalCustomers: 89,
            customersGrowth: 5.4,
            averageOrderValue: 98.9,
            aovGrowth: 3.1
          }
        };
      },
    }),
    createInteraction: builder.mutation<
      { message: string; interaction: any },
      { userId: string; productId?: string; type: string }
    >({
      queryFn: async (data) => {
         // Analytics interactions are often high volume; for now we can skip or log to a simple table
         // If we had an interactions table, we would insert here
         return { data: { message: "Interaction recorded", interaction: data } };
      },
    }),

    getYearRange: builder.query<any, void>({
      queryFn: async () => {
         // Return available years for analytics
         return { data: [2024, 2025, 2026] };
      },
    }),

    getProductPerformance: builder.query<any, void>({
      queryFn: async () => {
        // Mock product performance
        return {
           data: [
             { name: "Wireless Headphones", revenue: 4500, sales: 45 },
             { name: "Smart Watch", revenue: 3200, sales: 28 },
             { name: "Bluetooth Speaker", revenue: 2100, sales: 35 },
           ]
        };
      },
    }),

    getCustomerAnalytics: builder.query<any, void>({
      queryFn: async () => {
        return {
           data: {
             newCustomers: 45,
             returningCustomers: 120,
             retentionRate: 72
           }
        };
      },
    }),

    getInteractionAnalytics: builder.query<any, void>({
      queryFn: async () => {
        return { data: [] };
      },
    }),

    recordInteraction: builder.mutation<any, Record<string, any>>({
      queryFn: async () => {
         return { data: { success: true } };
      },
    }),

    exportAnalytics: builder.query<Blob, any>({
      queryFn: async () => {
         // Mock export
         return { data: new Blob(["Analytics Data"], { type: 'text/csv' }) };
      },
    }),
  }),
});

export const {
  useCreateInteractionMutation,
  useGetOverviewQuery,
  useGetYearRangeQuery,
  useGetProductPerformanceQuery,
  useGetCustomerAnalyticsQuery,
  useGetInteractionAnalyticsQuery,
  useRecordInteractionMutation,
  useLazyExportAnalyticsQuery,
} = analyticsApi;
