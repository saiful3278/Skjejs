import { apiSlice } from "../slices/ApiSlice";

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChat: builder.query({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),

    getUserChats: builder.query({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),

    getAllChats: builder.query({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),

    createChat: builder.mutation({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),

    sendMessage: builder.mutation({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),

    updateChatStatus: builder.mutation({
      queryFn: async () => ({ error: { status: 404, data: "Chat feature disabled" } }),
    }),
  }),
});

export const {
  useGetChatQuery,
  useGetUserChatsQuery,
  useGetAllChatsQuery,
  useCreateChatMutation,
  useSendMessageMutation,
  useUpdateChatStatusMutation,
} = chatApi;
