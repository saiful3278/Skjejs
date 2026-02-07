import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllCategories: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      providesTags: ["Category"],
    }),
    getCategory: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("id", id)
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Category"],
    }),

    createCategory: builder.mutation({
      queryFn: async (categoryData) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("categories")
          .insert(categoryData)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      invalidatesTags: ["Category"],
    }),

    updateCategory: builder.mutation({
      queryFn: async ({ id, categoryData }) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", id)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      invalidatesTags: ["Category"],
    }),

    deleteCategory: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Category"],
    }),

    getCategoryAttributes: builder.query({
      queryFn: async (categoryId) => {
        const supabase = getSupabaseClient();
        // This is tricky because Supabase relation returns array of joined rows
        // We need to transform it to match the old API structure if possible
        // Or simply return the data as is and let the component handle it (if component was migrated)
        // But for API slice compatibility, let's try to match
        
        const { data, error } = await supabase
          .from("category_attributes")
          .select(`
            is_required,
            attribute:attributes (
              id, name, slug,
              values:attribute_values (id, value, slug)
            )
          `)
          .eq("category_id", categoryId);

        if (error) return { error: { status: 500, data: error.message } };

        // Transform to match old API: { attributes: [...] }
        const attributes = data.map((item: any) => ({
          id: item.attribute.id,
          name: item.attribute.name,
          isRequired: item.is_required,
          values: item.attribute.values
        }));

        return { data: { category: { attributes } } };
      },
    }),
  }),
});

export const {
  useGetAllCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryAttributesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
