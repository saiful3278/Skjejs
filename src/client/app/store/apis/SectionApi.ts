import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const sectionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllSections: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .order("id");
        
        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    getHero: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .eq("type", "HERO")
          .single();
        
        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    getPromo: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .eq("type", "PROMO")
          .single();
        
        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    getArrivals: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .eq("type", "ARRIVALS")
          .single();
        
        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    getBenefits: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .eq("type", "BENEFITS")
          .single();
        
        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    getSectionById: builder.query({
      queryFn: async (sectionId) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .select("*")
          .eq("id", sectionId)
          .single();
        
        if (error) return { error: { status: 404, data: error.message } };
        return { data };
      },
      providesTags: ["Section"],
    }),

    createSection: builder.mutation({
      queryFn: async (newSection) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("sections")
          .insert(newSection)
          .select()
          .single();
        
        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      invalidatesTags: ["Section"],
    }),

    updateSection: builder.mutation({
      queryFn: async ({ sectionType, updatedSection }) => {
        const supabase = getSupabaseClient();
        // Assuming update by type, but ideally should be by ID. 
        // The original API used /sections/:sectionType
        const { data, error } = await supabase
          .from("sections")
          .update(updatedSection)
          .eq("type", sectionType) // or use ID if available
          .select()
          .single();
        
        if (error) return { error: { status: 500, data: error.message } };
        return { data };
      },
      invalidatesTags: ["Section"],
    }),

    deleteSection: builder.mutation({
      queryFn: async (sectionType) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("sections")
          .delete()
          .eq("type", sectionType);
        
        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["Section"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetAllSectionsQuery,
  useGetHeroQuery,
  useGetPromoQuery,
  useGetArrivalsQuery,
  useGetBenefitsQuery,
  useGetSectionByIdQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} = sectionApi;
