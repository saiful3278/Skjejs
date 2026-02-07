import { Suspense } from "react";
import ProductDetailContent from "../ProductDetailContent";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import ProductDetailSkeletonLoader from "@/app/components/feedback/ProductDetailSkeletonLoader";

export async function generateStaticParams() {
  const supabase = getSupabaseClient();
  const { data: products } = await supabase.from("products").select("slug");

  return (products || []).map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> | { slug: string } }) {
  const params = await props.params;
  return (
    <Suspense fallback={<ProductDetailSkeletonLoader />}>
      <ProductDetailContent paramsSlug={params.slug} />
    </Suspense>
  );
}
