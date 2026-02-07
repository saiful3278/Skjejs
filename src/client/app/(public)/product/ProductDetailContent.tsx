"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/app/components/templates/MainLayout";
import BreadCrumb from "@/app/components/feedback/BreadCrumb";
import ProductImageGallery from "./ProductImageGallery";
import ProductInfoWrapper from "./ProductInfoWrapper";
import { generateProductPlaceholder } from "@/app/utils/placeholderImage";
import ProductDetailSkeletonLoader from "@/app/components/feedback/ProductDetailSkeletonLoader";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { Product } from "@/app/types";

const ProductDetailContent = ({ paramsSlug }: { paramsSlug?: string }) => {
  const searchParams = useSearchParams();
  const slug = paramsSlug || searchParams.get("slug");
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No product slug provided");
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select(
            "*, category:categories!products_category_id_fkey(id,name,slug), product_variants(id,sku,price,images,stock,low_stock_threshold,barcode,warehouse_location,product_variant_attributes(id,attribute:attributes(id,name,slug),value:attribute_values(id,value,slug)))"
          )
          .eq("slug", slug)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          // Map raw Supabase response to Product type
          const mappedProduct: Product = {
            id: data.id,
            slug: data.slug,
            name: data.name,
            isNew: data.is_new,
            isFeatured: data.is_featured,
            isTrending: data.is_trending,
            isBestSeller: data.is_best_seller,
            averageRating: Number(data.average_rating || 0),
            reviewCount: Number(data.review_count || 0),
            description: data.description ?? null,
            variants:
              data.product_variants?.map((variant: any) => ({
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
            category: data.category
              ? {
                  id: data.category.id,
                  name: data.category.name,
                  slug: data.category.slug,
                }
              : null,
            reviews: [],
          };
          
          // Extract all images from variants for the image gallery
          const allImages = mappedProduct.variants.flatMap(variant => variant.images || []);
          (mappedProduct as any).images = allImages;
          
          setProduct(mappedProduct);
        } else {
          setError("Product not found");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch product"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <MainLayout>
        <ProductDetailSkeletonLoader />
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">
              {error || "Product not found"}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const placeholderImage = generateProductPlaceholder(product.name);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <BreadCrumb product={product} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ProductImageGallery
            images={product.images || []}
            defaultImage={placeholderImage}
            name={product.name}
          />
          <ProductInfoWrapper product={product} />
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductDetailContent;