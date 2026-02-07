"use client";
import dynamic from "next/dynamic";
import { useMemo, useEffect, useState, useCallback } from "react";
import groupProductsByFlag from "./utils/groupProductsByFlag";
import SkeletonLoader from "./components/feedback/SkeletonLoader";
import { getSupabaseClient } from "./lib/supabaseClient";
import { Product } from "./types/productTypes";

const HeroSection = dynamic(() => import("./(public)/(home)/HeroSection"), {
  ssr: false,
});
const CategoryBar = dynamic(() => import("./(public)/(home)/CategoryBar"), {
  ssr: false,
});
const ProductSection = dynamic(
  () => import("./(public)/product/ProductSection"),
  { ssr: false }
);
const MainLayout = dynamic(() => import("./components/templates/MainLayout"), {
  ssr: false,
});

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,slug,name,is_new,is_featured,is_trending,is_best_seller,average_rating,review_count,description,category:categories!products_category_id_fkey(id,name,slug),product_variants(id,sku,price,images,stock,low_stock_threshold,barcode,warehouse_location,product_variant_attributes(id,attribute:attributes(id,name,slug),value:attribute_values(id,value,slug)))"
      )
      .order("created_at", { ascending: false })
      .range(0, 99);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setProducts((data || []).map(mapProduct));
    setLoading(false);
  }, [mapProduct]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const { featured, trending, newArrivals, bestSellers } = useMemo(() => {
    if (!products.length)
      return { featured: [], trending: [], newArrivals: [], bestSellers: [] };
    return groupProductsByFlag(products);
  }, [products]);

  if (loading) {
    return (
      <MainLayout>
        <HeroSection />
        <SkeletonLoader />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <HeroSection />
      <CategoryBar />
      <ProductSection
        title="Featured"
        products={featured}
        loading={false}
        error={error ? { message: error } : null}
        showTitle={true}
      />
      <ProductSection
        title="Trending"
        products={trending}
        loading={false}
        error={error ? { message: error } : null}
        showTitle={true}
      />
      <ProductSection
        title="New Arrivals"
        products={newArrivals}
        loading={false}
        error={error ? { message: error } : null}
        showTitle={true}
      />
      <ProductSection
        title="Best Sellers"
        products={bestSellers}
        loading={false}
        error={error ? { message: error } : null}
        showTitle={true}
      />
      <ProductSection
        title="Discover"
        products={products.slice(0, 12)}
        loading={false}
        error={error ? { message: error } : null}
        showTitle={true}
      />
    </MainLayout>
  );
};

export default Home;
