import { apiSlice } from "../slices/ApiSlice";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

// Types for the API responses and requests
interface Variant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  barcode?: string;
  warehouseLocation?: string;
  attributes: Array<{
    attributeId: string;
    valueId: string;
    attribute: { id: string; name: string; slug: string };
    value: { id: string; value: string; slug: string };
  }>;
}

interface Restock {
  id: string;
  variantId: string;
  quantity: number;
  notes?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

interface GetAllVariantsResponse {
  variants: Variant[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
  resultsPerPage: number;
}

interface GetRestockHistoryResponse {
  restocks: Restock[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
  resultsPerPage: number;
}

interface CreateVariantRequest {
  productId: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  barcode?: string;
  warehouseLocation?: string;
  attributes: Array<{
    attributeId: string;
    valueId: string;
  }>;
}

interface UpdateVariantRequest {
  sku?: string;
  price?: number;
  stock?: number;
  lowStockThreshold?: number;
  barcode?: string;
  warehouseLocation?: string;
  attributes?: Array<{
    attributeId: string;
    valueId: string;
  }>;
}

interface RestockVariantRequest {
  quantity: number;
  notes?: string;
}

interface RestockVariantResponse {
  restock: Restock;
  isLowStock: boolean;
}

export const variantApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
   getAllVariants: builder.query<GetAllVariantsResponse, Record<string, any>>({
      queryFn: async () => {
        const supabase = getSupabaseClient();
        const query = supabase.from("product_variants").select(`
          *,
          attributes:product_variant_attributes(
            attribute:attributes(*),
            value:attribute_values(*)
          )
        `);

        // Apply filters if needed based on params (simplified)
        // Pagination could be added here

        const { data, error, count } = await query;
        
        if (error) return { error: { status: 500, data: error.message } };

        return {
          data: {
            variants: data as any,
            totalResults: count || data.length,
            totalPages: 1,
            currentPage: 1,
            resultsPerPage: data.length
          }
        };
      },
      providesTags: ['Variant'],
    }),

    getVariantById: builder.query<{ variant: Variant }, string>({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("product_variants")
          .select(`
            *,
            attributes:product_variant_attributes(
              attribute:attributes(*),
              value:attribute_values(*)
            )
          `)
          .eq("id", id)
          .single();

        if (error) return { error: { status: 404, data: error.message } };

        return { data: { variant: data as any } };
      },
      providesTags: (result, error, id) => [{ type: 'Variant', id }],
    }),

    getVariantBySku: builder.query<{ variant: Variant }, string>({
      queryFn: async (sku) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("product_variants")
          .select(`
            *,
            attributes:product_variant_attributes(
              attribute:attributes(*),
              value:attribute_values(*)
            )
          `)
          .eq("sku", sku)
          .single();

        if (error) return { error: { status: 404, data: error.message } };
        
        return { data: { variant: data as any } };
      },
      providesTags: (result, error, sku) => [{ type: 'Variant', id: sku }],
    }),

   getRestockHistory: builder.query<GetRestockHistoryResponse, { variantId: string; page?: number; limit?: number }>({
      queryFn: async () => {
        // Mocking for now as table doesn't exist
        return {
           data: {
             restocks: [],
             totalResults: 0,
             totalPages: 0,
             currentPage: 1,
             resultsPerPage: 10
           }
        };
      },
      providesTags: (result, error, { variantId }) => [{ type: 'Variant', id: variantId }],
    }),

    createVariant: builder.mutation<{ variant: Variant }, CreateVariantRequest>({
      queryFn: async (body) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("product_variants")
          .insert({
             product_id: body.productId,
             sku: body.sku,
             price: body.price,
             stock: body.stock,
             low_stock_threshold: body.lowStockThreshold,
             barcode: body.barcode,
             warehouse_location: body.warehouseLocation
          })
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };

        // Insert attributes
        if (body.attributes && body.attributes.length > 0) {
           const attrInserts = body.attributes.map(attr => ({
             variant_id: data.id,
             attribute_id: attr.attributeId,
             value_id: attr.valueId
           }));
           await supabase.from("product_variant_attributes").insert(attrInserts);
        }

        return { data: { variant: data as any } };
      },
      invalidatesTags: ['Variant'],
    }),

    updateVariant: builder.mutation<{ variant: Variant }, { id: string; data: UpdateVariantRequest }>({
      queryFn: async ({ id, data }) => {
        const supabase = getSupabaseClient();
        const updates: any = {};
        if (data.sku) updates.sku = data.sku;
        if (data.price) updates.price = data.price;
        if (data.stock !== undefined) updates.stock = data.stock;
        
        const { data: updated, error } = await supabase
          .from("product_variants")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) return { error: { status: 500, data: error.message } };
        return { data: { variant: updated as any } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Variant', id }, 'Variant'],
    }),

    deleteVariant: builder.mutation<{ success: boolean; id: string }, string>({
      queryFn: async (id) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .eq("id", id);
        
        if (error) return { error: { status: 500, data: error.message } };
        return { data: { success: true, id } };
      },
      invalidatesTags: ['Variant'],
    }),

    restockVariant: builder.mutation<RestockVariantResponse, { id: string; data: RestockVariantRequest }>({
      queryFn: async ({ id, data }) => {
        const supabase = getSupabaseClient();
        
        // 1. Get current stock
        const { data: current, error: fetchError } = await supabase
          .from("product_variants")
          .select("stock, low_stock_threshold")
          .eq("id", id)
          .single();

        if (fetchError) return { error: { status: 500, data: fetchError.message } };

        const newStock = (current.stock || 0) + data.quantity;

        // 2. Update stock
        const { error: updateError } = await supabase
           .from("product_variants")
           .update({ stock: newStock })
           .eq("id", id)
           .select()
           .single();

        if (updateError) return { error: { status: 500, data: updateError.message } };

        // 3. Mock restock record return
        return {
          data: {
             restock: {
               id: "mock-id",
               variantId: id,
               quantity: data.quantity,
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             },
             isLowStock: newStock <= (current.low_stock_threshold || 10)
          }
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Variant', id }, 'Variant'],
    }),
  }),
});

export const {
  useGetAllVariantsQuery,
  useGetVariantByIdQuery,
  useGetVariantBySkuQuery,
  useGetRestockHistoryQuery,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
  useRestockVariantMutation,
} = variantApi;
