import { Suspense } from "react";
import ProductDetailContent from "../ProductDetailContent";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import ProductDetailSkeletonLoader from "@/app/components/feedback/ProductDetailSkeletonLoader";

export async function generateStaticParams() {
  try {
    const supabase = getSupabaseClient();
    const { data: products } = await supabase.from("products").select("slug");

    return (products || []).map((product) => ({
      slug: product.slug,
    }));
  } catch (error) {
    // Fallback: return empty array if database is not available during build
    // This allows the build to complete successfully
    console.warn('Failed to fetch products for static generation:', error);
    return [];
  }
}

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> | { slug: string } }) {
  const params = await props.params;
  return (
    <Suspense fallback={<ProductDetailSkeletonLoader />}>
      <ProductDetailContent paramsSlug={params.slug} />
    </Suspense>
  );
}
