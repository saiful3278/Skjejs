// shop/ShopContent.tsx (updated)
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Package } from "lucide-react";
import { Product } from "@/app/types/productTypes";
import ProductCard from "../product/ProductCard";
import ProductFilters, { FilterValues } from "./ProductFilters";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

interface ShopContentProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchParams: URLSearchParams;
}

const ShopContent: React.FC<ShopContentProps> = ({
  sidebarOpen,
  setSidebarOpen,
  searchParams,
}) => {
  const router = useRouter();

  const initialFilters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      isNew: searchParams.get("isNew") === "true" || undefined,
      isFeatured: searchParams.get("isFeatured") === "true" || undefined,
      isTrending: searchParams.get("isTrending") === "true" || undefined,
      isBestSeller: searchParams.get("isBestSeller") === "true" || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      categoryId: searchParams.get("categoryId") || undefined,
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const pageSize = 12;

  const mapProduct = useCallback((product: any): Product => {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      isNew: product.is_new,
      isFeatured: product.is_featured,
      isTrending: product.is_trending,
      isBestSeller: product.is_best_seller,
      averageRating: Number(product.average_rating || 0),
      reviewCount: Number(product.review_count || 0),
      description: product.description ?? null,
      variants:
        product.product_variants?.map((variant: any) => ({
          id: variant.id,
          sku: variant.sku,
          price: Number(variant.price || 0),
          images: variant.images || [],
          stock: variant.stock ?? 0,
          lowStockThreshold: variant.low_stock_threshold ?? 10,
          barcode: variant.barcode ?? null,
          warehouseLocation: variant.warehouse_location ?? null,
          attributes:
            variant.product_variant_attributes?.map((attr: any) => ({
              id: attr.id,
              attribute: {
                id: attr.attribute?.id,
                name: attr.attribute?.name,
                slug: attr.attribute?.slug,
              },
              value: {
                id: attr.value?.id,
                value: attr.value?.value,
                slug: attr.value?.slug,
              },
            })) || [],
        })) || [],
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      reviews: [],
    };
  }, []);

  const fetchCategories = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug")
      .order("name", { ascending: true });
    if (!error) {
      setCategories(data || []);
    }
  }, []);

  const fetchProducts = useCallback(
    async (nextSkip: number, append: boolean) => {
      setLoading(true);
      if (!append) {
        setError(null);
      }
      const supabase = getSupabaseClient();
      let query = supabase
        .from("products")
        .select(
          "id,slug,name,is_new,is_featured,is_trending,is_best_seller,average_rating,review_count,description,category:categories!products_category_id_fkey(id,name,slug),product_variants(id,sku,price,images,stock,low_stock_threshold,barcode,warehouse_location,product_variant_attributes(id,attribute:attributes(id,name,slug),value:attribute_values(id,value,slug)))"
        )
        .order("created_at", { ascending: false })
        .range(nextSkip, nextSkip + pageSize - 1);

      if (filters.search) {
        const searchValue = `%${filters.search}%`;
        query = query.or(
          `name.ilike.${searchValue},description.ilike.${searchValue}`
        );
      }
      if (filters.isNew !== undefined) {
        query = query.eq("is_new", filters.isNew);
      }
      if (filters.isFeatured !== undefined) {
        query = query.eq("is_featured", filters.isFeatured);
      }
      if (filters.isTrending !== undefined) {
        query = query.eq("is_trending", filters.isTrending);
      }
      if (filters.isBestSeller !== undefined) {
        query = query.eq("is_best_seller", filters.isBestSeller);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte("product_variants.price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("product_variants.price", filters.maxPrice);
      }

      const { data, error } = await query;
      if (error) {
        setError(error.message);
        setLoading(false);
        setIsFetchingMore(false);
        return;
      }

      const mappedProducts = (data || []).map(mapProduct);
      setDisplayedProducts((prev) =>
        append ? [...prev, ...mappedProducts] : mappedProducts
      );
      setHasMore(mappedProducts.length === pageSize);
      setSkip(nextSkip);
      setLoading(false);
      setIsFetchingMore(false);
    },
    [filters, mapProduct, pageSize]
  );

  useEffect(() => {
    setFilters(initialFilters);
    setDisplayedProducts([]);
    setSkip(0);
    setHasMore(true);
  }, [initialFilters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts(0, false);
  }, [fetchProducts]);

  const handleShowMore = () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    const newSkip = skip + pageSize;
    fetchProducts(newSkip, true);
  };

  const updateFilters = (newFilters: FilterValues) => {
    const query = new URLSearchParams();
    if (newFilters.search) query.set("search", newFilters.search);
    if (newFilters.isNew) query.set("isNew", "true");
    if (newFilters.isFeatured) query.set("isFeatured", "true");
    if (newFilters.isTrending) query.set("isTrending", "true");
    if (newFilters.isBestSeller) query.set("isBestSeller", "true");
    if (newFilters.minPrice)
      query.set("minPrice", newFilters.minPrice.toString());
    if (newFilters.maxPrice)
      query.set("maxPrice", newFilters.maxPrice.toString());
    if (newFilters.categoryId) query.set("categoryId", newFilters.categoryId);

    router.push(`/shop?${query.toString()}`);
  };

  const noProductsFound = displayedProducts.length === 0 && !loading && !error;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="hidden md:block w-full md:max-w-[350px]">
        <ProductFilters
          initialFilters={initialFilters}
          onFilterChange={updateFilters}
          categories={categories}
        />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[85vw] max-w-md h-full bg-white"
            >
              <ProductFilters
                initialFilters={initialFilters}
                onFilterChange={updateFilters}
                categories={categories}
                isMobile={true}
                onCloseMobile={() => setSidebarOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-grow">
        {loading && !displayedProducts.length && (
          <div className="text-center py-12">
            <Package
              size={48}
              className="mx-auto text-gray-400 mb-4 animate-pulse"
            />
            <p className="text-lg text-gray-600">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-lg text-red-500">Error loading products</p>
            <p className="text-sm text-gray-500">
              {error}
            </p>
          </div>
        )}

        {noProductsFound && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">No products found</p>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        )}

        {!noProductsFound && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((product: Product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={handleShowMore}
                  disabled={isFetchingMore}
                  className={`bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors duration-300 font-medium ${
                    isFetchingMore ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isFetchingMore ? "Loading..." : "Show More Products"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopContent;