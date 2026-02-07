"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import ProductCard from "./ProductCard";
import SkeletonLoader from "@/app/components/feedback/SkeletonLoader";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { Product } from "@/app/types/productTypes";

interface CategorySectionProps {
  categoryId: string;
  categoryName: string;
  pageSize: number;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categoryId,
  categoryName,
  pageSize,
}) => {
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);

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

  const fetchProducts = useCallback(
    async (nextSkip: number, append: boolean) => {
      setLoading(true);
      if (!append) {
        setError(null);
      }
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,slug,name,is_new,is_featured,is_trending,is_best_seller,average_rating,review_count,description,category:categories!products_category_id_fkey(id,name,slug),product_variants(id,sku,price,images,stock,low_stock_threshold,barcode,warehouse_location,product_variant_attributes(id,attribute:attributes(id,name,slug),value:attribute_values(id,value,slug)))"
        )
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false })
        .range(nextSkip, nextSkip + pageSize - 1);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const mappedProducts = (data || []).map(mapProduct);
      setProducts((prev) =>
        append ? [...prev, ...mappedProducts] : mappedProducts
      );
      setHasMore(mappedProducts.length === pageSize);
      setSkip(nextSkip);
      setLoading(false);
    },
    [categoryId, mapProduct, pageSize]
  );

  useEffect(() => {
    setProducts([]);
    setSkip(0);
    setHasMore(false);
    fetchProducts(0, false);
  }, [categoryId, fetchProducts]);

  const handleShowMore = () => {
    fetchProducts(skip + pageSize, true);
  };

  if (loading && skip === 0) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-red-500">
          Error loading {categoryName}: {error}
        </p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-lg text-gray-600">
          No products found in {categoryName}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-3">
          <div className="h-6 w-1 rounded-full bg-primary"></div>
          <h2 className="ml-2 text-xl font-extrabold font-sans tracking-wide text-gray-700 capitalize">
            {categoryName}
          </h2>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
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
        <div className="mt-8 text-center">
          <button
            onClick={handleShowMore}
            className="bg-primary text-white px-8 py-3 rounded transition-colors duration-300 font-medium"
            disabled={loading}
          >
            {loading ? "Loading..." : "Show More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(CategorySection);
