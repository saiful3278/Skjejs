import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const logsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllLogs: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("logs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
           return { error: { status: 500, data: error.message } };
        }
        return { data };
      },
    }),

    getLogByLevel: builder.query({
      queryFn: async (level) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("logs")
          .select("*")
          .eq("level", level)
          .order("created_at", { ascending: false });

        if (error) {
           return { error: { status: 500, data: error.message } };
        }
        return { data };
      },
    }),

    getLogById: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("logs")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
           return { error: { status: 404, data: error.message } };
        }
        return { data };
      },
    }),

    deleteLog: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("logs")
          .delete()
          .eq("id", id);

        if (error) {
           return { error: { status: 500, data: error.message } };
        }
        return { data: { success: true } };
      },
    }),

    clearLogs: builder.mutation({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        // Delete all logs
        const { error } = await supabase
          .from("logs")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Hack to delete all if needed, or use a proper where clause that matches everything

        if (error) {
           return { error: { status: 500, data: error.message } };
        }
        return { data: { success: true } };
      },
    }),
  }),
});

export const {
  useGetAllLogsQuery,
  useGetLogByIdQuery,
  useGetLogByLevelQuery,
  useDeleteLogMutation,
  useClearLogsMutation,
} = logsApi;
