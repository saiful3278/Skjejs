import { User } from "@/app/types/authTypes";
import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.from("profiles").select("*");
        
        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        // Note: Email is not available in public profiles for security
        // In a real Supabase app, you'd use an Edge Function with service role to get emails
        const users = data.map((p) => ({
          id: p.user_id,
          name: p.name || "Unknown",
          role: p.role || "USER",
          avatar: p.avatar_url,
          email: "hidden@example.com", // Placeholder as we can't access auth.users client-side
        }));

        return { data: users };
      },
      providesTags: ["User"],
    }),

    getAllAdmins: builder.query({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "ADMIN");
        
        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        const admins = data.map((p) => ({
          id: p.user_id,
          name: p.name || "Unknown",
          role: p.role,
          avatar: p.avatar_url,
          email: "hidden@example.com",
        }));

        return { data: admins };
      },
      providesTags: ["User"],
    }),

    getProfile: builder.query({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", id)
          .single();

        if (error) {
          return { error: { status: 404, data: error.message } };
        }

        return {
          data: {
            id: data.user_id,
            name: data.name,
            role: data.role,
            avatar: data.avatar_url,
            email: "hidden@example.com",
          },
        };
      },
      providesTags: ["User"],
    }),

    updateUser: builder.mutation({
      queryFn: async ({ id, data }) => {
        const supabase = getSupabaseClient();
        // Assuming data contains profile fields
        const updates = {
          name: data.name,
          role: data.role,
          avatar_url: data.avatar,
          updated_at: new Date().toISOString(),
        };

        const { data: updated, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", id)
          .select()
          .single();

        if (error) {
          return { error: { status: 500, data: error.message } };
        }

        return { data: updated };
      },
      invalidatesTags: ["User"],
    }),

    getMe: builder.query<User, void>({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return { error: { status: 401, data: authError?.message || "Not authenticated" } };
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          return { error: { status: 500, data: profileError.message } };
        }

        // If profile doesn't exist yet, return basic info from auth
        // or you might want to create it here
        return {
          data: {
            id: user.id,
            email: user.email!,
            name: profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
            role: profile?.role || "USER",
            avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
          },
        };
      },
      providesTags: ["User"],
    }),

    createAdmin: builder.mutation({
      queryFn: async () => {
        return { error: { status: 501, data: "Create Admin not implemented client-side" } };
      },
      invalidatesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      queryFn: async (id) => {
        // Can't delete from auth.users client-side
        // But can delete profile
        const supabase = getSupabaseClient();
        const { error } = await supabase.from("profiles").delete().eq("user_id", id);
        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true } };
      },
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllAdminsQuery,
  useUpdateUserMutation,
  useCreateAdminMutation,
  useDeleteUserMutation,
  useGetProfileQuery,
  useGetMeQuery,
  useGetAllUsersQuery,
  useLazyGetMeQuery,
} = userApi;
