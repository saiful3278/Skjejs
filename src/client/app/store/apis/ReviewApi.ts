import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const reviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReviewsByProductId: builder.query({
      queryFn: async (productId) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("reviews")
          .select("*, user:profiles(name, avatar_url)")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) {
          return { error: { status: 500, data: error.message } };
        }
        
        return { data };
      },
      providesTags: ["Review"],
    }),
    createReview: builder.mutation({
      queryFn: async (reviewData) => {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return { error: { status: 401, data: "Not authenticated" } };
        }

        const { data, error } = await supabase
          .from("reviews")
          .insert({
            user_id: user.id,
            product_id: reviewData.productId,
            rating: reviewData.rating,
            comment: reviewData.comment,
          })
          .select()
          .single();

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data };
      },
      invalidatesTags: ["Review"],
    }),

    deleteReview: builder.mutation({
      queryFn: async (reviewId) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("reviews")
          .delete()
          .eq("id", reviewId);

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data: { success: true } };
      },
      invalidatesTags: ["Review"],
    }),
  }),
});

export const {
  useGetReviewsByProductIdQuery,
  useCreateReviewMutation,
  useDeleteReviewMutation,
} = reviewApi;
