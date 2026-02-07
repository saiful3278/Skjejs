import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const orderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllOrders: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            items:order_items(*, product:products(*)),
            user:profiles(name, email:user_id) 
          `) // Note: accessing email via relation might not work if profiles table doesn't have email, but user_id is the link. 
             // We can't join auth.users directly. 
             // For now, we fetch orders and maybe profiles.
          .order("created_at", { ascending: false });

        if (error) {
          return { error: { status: 500, data: error.message } };
        }
        
        return { data };
      },
      providesTags: ["Order"],
    }),

    getUserOrders: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return { error: { status: 401, data: "Not authenticated" } };
        }

        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            items:order_items(*, product:products(*))
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data };
      },
      providesTags: ["Order"],
    }),

    createOrder: builder.mutation({
      queryFn: async (orderData) => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return { error: { status: 401, data: "Not authenticated" } };
        }

        // 1. Create Order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            amount: orderData.totalAmount,
            status: "PENDING",
            // Add other fields if necessary like shipping address
          })
          .select()
          .single();

        if (orderError) {
          return { error: { status: 500, data: orderError.message } };
        }

        // 2. Create Order Items
        if (orderData.items && orderData.items.length > 0) {
          const itemsToInsert = orderData.items.map((item: any) => ({
            order_id: order.id,
            product_id: item.productId || item.id, // Use product_id based on schema
            quantity: item.quantity,
            price: item.price,
          }));

          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(itemsToInsert);

          if (itemsError) {
            // Ideally we should rollback order here, but for now just return error
            console.error("Failed to create order items", itemsError);
            return { error: { status: 500, data: itemsError.message } };
          }
        }

        // 3. Clear Cart (Optional but expected)
        // If passed cartId or just delete all active cart items for user
        // For now, let's assume we want to clear the user's active cart
        // But we might need cartId from arguments. 
        // If orderData has cartId, use it.
        
        if (orderData.cartId) {
             await supabase.from("cart_items").delete().eq("cart_id", orderData.cartId);
             // Optionally update cart status to 'COMPLETED' or delete it
             await supabase.from("carts").update({ status: 'COMPLETED' }).eq("id", orderData.cartId);
        }

        return { data: order };
      },
      invalidatesTags: ["Order", "Cart"],
    }),

    deleteOrder: builder.mutation({
      queryFn: async (orderId) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("orders")
          .delete()
          .eq("id", orderId);

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data: { success: true } };
      },
      invalidatesTags: ["Order"],
    }),

    updateOrder: builder.mutation({
      queryFn: async ({ orderId, status }) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .update({ status })
          .eq("id", orderId)
          .select()
          .single();

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data };
      },
      invalidatesTags: ["Order"],
    }),

    getOrder: builder.query({
      queryFn: async (orderId) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            items:order_items(*, variant:product_variants(*, product:products(*)))
          `)
          .eq("id", orderId)
          .single();

        if (error) {
          return { error: { status: 404, data: error.message } };
        }
        
        // Transform structure if needed to match client expectations
        // The client expects { order: ... } based on OrderTrackingPage
        return { data: { order: data } };
      },
      providesTags: ["Order"],
    }),
  }),
});

export const {
  useGetAllOrdersQuery,
  useGetUserOrdersQuery,
  useCreateOrderMutation,
  useDeleteOrderMutation,
  useUpdateOrderMutation,
  useGetOrderQuery,
} = orderApi;
