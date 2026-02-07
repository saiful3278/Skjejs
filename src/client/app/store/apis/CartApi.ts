import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: { status: 401, data: "Not authenticated" } };

        const { data: cart, error } = await supabase
          .from("carts")
          .select(`
            *,
            items:cart_items(
              *,
              variant:product_variants(
                *,
                product:products(*)
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        return { data: cart };
      },
      providesTags: ["Cart"],
    }),

    getCartCount: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: { count: 0 } };

        const { data: cart } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (!cart) return { data: { count: 0 } };

        const { count, error } = await supabase
          .from("cart_items")
          .select("*", { count: "exact", head: true })
          .eq("cart_id", cart.id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { count: count || 0 } };
      },
      providesTags: ["Cart"],
    }),

    addToCart: builder.mutation({
      queryFn: async (productData) => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: { status: 401, data: "Not authenticated" } };

        // Get or create cart
        let { data: cart } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (!cart) {
          const { data: newCart, error: createError } = await supabase
            .from("carts")
            .insert({ user_id: user.id, status: "ACTIVE" })
            .select("id")
            .single();
          if (createError) return { error: { status: 500, data: createError.message } };
          cart = newCart;
        }

        // Check if item exists
        const { data: existingItem } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cart.id)
          .eq("variant_id", productData.variantId)
          .maybeSingle();

        if (existingItem) {
          const { error: updateError } = await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + productData.quantity })
            .eq("id", existingItem.id);
          if (updateError) return { error: { status: 500, data: updateError.message } };
        } else {
          const { error: insertError } = await supabase
            .from("cart_items")
            .insert({
              cart_id: cart.id,
              variant_id: productData.variantId,
              quantity: productData.quantity,
            });
          if (insertError) return { error: { status: 500, data: insertError.message } };
        }

        return { data: { success: true } };
      },
      invalidatesTags: ["Cart"],
    }),

    updateCartItem: builder.mutation({
      queryFn: async ({ id, quantity }: { id: string; quantity: number }) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Cart"],
    }),

    removeFromCart: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("cart_items")
          .delete()
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const {
  useGetCartQuery,
  useGetCartCountQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
} = cartApi;
