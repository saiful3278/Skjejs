import { apiSlice } from "../slices/ApiSlice";

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    generateReport: builder.query<Blob, any>({
      queryFn: async () => {
        // Mock report generation
        const mockBlob = new Blob(["Report Data"], { type: "text/plain" });
        return { data: mockBlob };
      },
    }),
  }),
});

export const { useGenerateReportQuery, useLazyGenerateReportQuery } =
  reportsApi;
