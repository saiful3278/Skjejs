import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const transactionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllTransactions: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("transactions")
          .select(`
             *,
             order:orders(
               *, 
               user:profiles(name)
             )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data };
      },
      providesTags: ["Transactions"], 
    }),
    getTransaction: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("transactions")
          .select(`
             *,
             order:orders(
               *, 
               user:profiles(name)
             )
          `)
          .eq("id", id)
          .single();

        if (error) {
           return { error: { status: 404, data: error.message } };
        }

        return { data };
      },
      providesTags: (result, error, id) => [{ type: "Transactions", id }], 
    }),

    updateTransactionStatus: builder.mutation({
      queryFn: async ({ id, status }: { id: string; status: string }) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("transactions")
          .update({ status })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Transactions", id }, 
        "Transactions", 
      ],
    }),

    deleteTransaction: builder.mutation({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", id);

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data: { success: true } };
      },
      invalidatesTags: (result, error, id) => [
        { type: "Transactions", id }, 
        "Transactions", 
      ],
    }),
  }),
});

export const {
  useGetAllTransactionsQuery,
  useGetTransactionQuery,
  useUpdateTransactionStatusMutation,
  useDeleteTransactionMutation,
} = transactionApi;
