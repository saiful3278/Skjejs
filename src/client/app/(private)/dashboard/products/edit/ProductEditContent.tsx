"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProductEditForm from "../ProductEditForm";
import { useProductDetail } from "@/app/hooks/miscellaneous/useProductDetails";

const ProductEditContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const {
    product,
    categories,
    productsLoading,
    categoriesLoading,
    productsError,
    form,
    isUpdating,
    onSubmit,
  } = useProductDetail();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <ProductEditForm
        form={form}
        onSubmit={onSubmit}
        categories={categories}
        isUpdating={isUpdating}
      />
    </div>
  );
};

export default ProductEditContent;
