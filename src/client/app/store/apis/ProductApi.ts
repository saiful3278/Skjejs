import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const productApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAllProducts: builder.query({
      queryFn: async (params) => {
        const supabase = getSupabaseClient();
        let query = supabase.from("products").select(`
          *,
          product_variants(*),
          category:categories!products_category_id_fkey(*)
        `);

        if (params) {
          const {
            searchQuery,
            limit,
            category,
            featured,
            bestselling,
          } = params;

          if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
          if (category) query = query.eq("category_id", category); // assuming category param is ID
          if (featured) query = query.eq("is_featured", true);
          if (bestselling) query = query.eq("is_best_seller", true);
          if (limit) query = query.limit(Number(limit));
        }

        const { data, error } = await query;
        if (error) return { error: { status: 500, data: error.message } };
        return { data: { products: data, total: data.length, page: 1, pages: 1 } }; // simplified pagination
      },
      providesTags: ["Product"],
    }),

    bulkProducts: builder.mutation({
      queryFn: async () => {
        // Mock bulk upload or implement if needed
        return { data: { success: true, message: "Bulk upload simulated" } };
      },
      invalidatesTags: ["Product"],
    }),

    getProductById: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_variants(*),
            category:categories!products_category_id_fkey(*)
          `)
          .eq("id", id)
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Product"],
    }),

    getProductBySlug: builder.query({
      queryFn: async (slug) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_variants(*),
            category:categories!products_category_id_fkey(*)
          `)
          .eq("slug", slug)
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Product"],
    }),

    createProduct: builder.mutation({
      queryFn: async (productData) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .insert(productData) // ensure productData matches table schema
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      invalidatesTags: ["Product"],
    }),

    updateProduct: builder.mutation({
      queryFn: async ({ id, data }) => {
        const supabase = getSupabaseClient();
        const { data: updated, error } = await supabase
          .from("products")
          .update(data)
          .eq("id", id)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data: updated };
      },
      invalidatesTags: ["Product"],
    }),

    deleteProduct: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Product"],
    }),
  }),
});

export const {
  useBulkProductsMutation,
  useGetAllProductsQuery,
  useGetProductBySlugQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
