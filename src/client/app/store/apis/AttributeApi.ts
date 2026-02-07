import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const attributeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllAttributes: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("attributes")
          .select("*, values:attribute_values(*)")
          .order("created_at", { ascending: false });

        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      providesTags: ["Attribute"],
    }),

    getAttribute: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("attributes")
          .select("*, values:attribute_values(*)")
          .eq("id", id)
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: (result, error, id) => [{ type: "Attribute", id }],
    }),

    createAttribute: builder.mutation({
      queryFn: async (data) => {
        const supabase = getSupabaseClient();
        const { data: newAttr, error } = await supabase
          .from("attributes")
          .insert(data)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data: newAttr };
      },
      invalidatesTags: ["Attribute"],
    }),

    createAttributeValue: builder.mutation({
      queryFn: async (data) => {
        const supabase = getSupabaseClient();
        const { data: newVal, error } = await supabase
          .from("attribute_values")
          .insert(data)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data: newVal };
      },
      invalidatesTags: ["Attribute"],
    }),

    assignAttributeToCategory: builder.mutation({
      queryFn: async () => {
        // Not used, as categories dashboard uses direct supabase calls now
        return { data: { success: true } }; 
      },
      invalidatesTags: ["Attribute"],
    }),

    assignAttributeToProduct: builder.mutation({
      queryFn: async () => {
        // Not used
        return { data: { success: true } };
      },
      invalidatesTags: ["Attribute"],
    }),

    deleteAttribute: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("attributes")
          .delete()
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Attribute"],
    }),

    deleteAttributeValue: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("attribute_values")
          .delete()
          .eq("id", id);

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Attribute"],
    }),
  }),
});

export const {
  useGetAllAttributesQuery,
  useGetAttributeQuery,
  useCreateAttributeMutation,
  useCreateAttributeValueMutation,
  useAssignAttributeToCategoryMutation,
  useAssignAttributeToProductMutation,
  useDeleteAttributeMutation,
  useDeleteAttributeValueMutation,
} = attributeApi;
