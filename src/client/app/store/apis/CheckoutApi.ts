import { apiSlice } from "../slices/ApiSlice";

export const checkoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateCheckout: builder.mutation({
      queryFn: async () => {
        return { error: { status: 400, data: "Checkout is currently disabled." } };
      },
    }),
  }),
});

export const { useInitiateCheckoutMutation } = checkoutApi;
