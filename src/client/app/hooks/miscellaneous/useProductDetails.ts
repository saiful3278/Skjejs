"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import useToast from "@/app/hooks/ui/useToast";
import { ProductFormData } from "@/app/(private)/dashboard/products/product.types";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { uploadImages } from "@/app/utils/supabaseStorage";

export const useProductDetail = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductFormData | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<any>(null);

  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Variant selection state
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Form setup with initial empty default values
  const form = useForm<ProductFormData>({
    defaultValues: {
      id: "",
      name: "",
      description: "",
      categoryId: "",
      isNew: false,
      isTrending: false,
      isBestSeller: false,
      isFeatured: false,
      variants: [],
    },
  });

  const productId = (params as any)?.id || searchParams.get("id") || "";

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id, name, description, category_id, is_new, is_trending, is_best_seller, is_featured,
          variants:product_variants(
            id, sku, price, stock, low_stock_threshold, barcode, warehouse_location, images,
            attributes:product_variant_attributes(
              attribute_id, value_id,
              attribute:attributes(name),
              value:attribute_values(value)
            )
          )
        `
        )
        .eq("id", productId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Product not found");

      const mappedProduct: ProductFormData = {
        id: data.id,
        name: data.name,
        description: data.description || "",
        categoryId: data.category_id || "",
        isNew: data.is_new,
        isTrending: data.is_trending,
        isBestSeller: data.is_best_seller,
        isFeatured: data.is_featured,
        variants: data.variants.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          lowStockThreshold: v.low_stock_threshold,
          barcode: v.barcode || "",
          warehouseLocation: v.warehouse_location || "",
          images: v.images || [],
          attributes: v.attributes.map((attr: any) => ({
            attributeId: attr.attribute_id,
            valueId: attr.value_id,
            // These are for UI selection logic
            attributeName: attr.attribute?.name,
            valueName: attr.value?.value,
          })),
        })),
      };

      setProduct(mappedProduct);
      
      // Reset form
      const normalizedVariants = (mappedProduct.variants && mappedProduct.variants.length > 0)
        ? mappedProduct.variants.map(v => ({
            ...v,
            attributes: v.attributes.map((a: any) => ({
              attributeId: a.attributeId,
              valueId: a.valueId
            }))
          }))
        : [{
            id: "",
            sku: "",
            price: 0,
            stock: 0,
            lowStockThreshold: 10,
            barcode: "",
            warehouseLocation: "",
            images: [],
            attributes: [],
          }];

      form.reset({
        ...mappedProduct,
        variants: normalizedVariants
      });
      form.setValue("variants", normalizedVariants, { shouldDirty: false, shouldTouch: false });

      // Set default selected variant
      setSelectedVariant(mappedProduct.variants[0] || null);
      setSelectedAttributes({});

    } catch (err) {
      console.error("Error fetching product:", err);
      setProductsError(err);
    } finally {
      setProductsLoading(false);
    }
  }, [productId, form]);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(
        data.map((c) => ({
          label: c.name,
          value: c.id,
        }))
      );
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [fetchProduct, fetchCategories]);

  // Handle variant change based on attribute selections
  const handleVariantChange = (attributeName: string, value: string) => {
    const newSelections = { ...selectedAttributes, [attributeName]: value };
    setSelectedAttributes(newSelections);

    if (!product) return;

    const variant = product.variants.find((v: any) =>
      Object.entries(newSelections).every(
        ([attrName, attrValue]) =>
          attrName === "" ||
          v.attributes.some(
            (attr: any) =>
              attr.attributeName === attrName &&
              attr.valueName === attrValue
          )
      )
    );
    setSelectedVariant(variant || product.variants[0] || null);
  };

  // Reset variant selections
  const resetSelections = () => {
    setSelectedAttributes({});
    setSelectedVariant(product?.variants?.[0] || null);
  };

  const splitImages = (images: Array<File | string>) => {
    const files: File[] = [];
    const urls: string[] = [];
    (images || []).forEach((image) => {
      if (image instanceof File) {
        files.push(image);
      } else if (typeof image === "string") {
        urls.push(image);
      }
    });
    return { files, urls };
  };

  // Handle update
  const onSubmit = async (data: ProductFormData) => {
    setIsUpdating(true);
    try {
      const supabase = getSupabaseClient();
      
      // Update product details
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description || null,
          category_id: data.categoryId || null,
          is_new: data.isNew,
          is_trending: data.isTrending,
          is_best_seller: data.isBestSeller,
          is_featured: data.isFeatured,
        })
        .eq("id", productId);

      if (productError) throw productError;

      // Update variants
      const storageBucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCTS_BUCKET || "products-images";

      for (const variant of data.variants) {
        const { files, urls } = splitImages(variant.images);
        const existingUrls = urls;

        // If it's an existing variant and no new files, ensure we keep existing images if passed as empty array (shouldn't happen with form logic but good to be safe)
        // Actually, form logic passes existing strings.
        
        const uploadedUrls = await uploadImages(supabase, storageBucket, `products/${productId}/${variant.sku}`, files);
        const finalImages = [...existingUrls, ...uploadedUrls];

        if (variant.id) {
          // Update existing variant
          const { error: variantError } = await supabase
            .from("product_variants")
            .update({
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              low_stock_threshold: variant.lowStockThreshold ?? 10,
              barcode: variant.barcode || null,
              warehouse_location: variant.warehouseLocation || null,
              images: finalImages,
            })
            .eq("id", variant.id);

          if (variantError) throw variantError;

          // Update attributes (delete all and re-insert)
          await supabase
            .from("product_variant_attributes")
            .delete()
            .eq("variant_id", variant.id);
            
          if (variant.attributes?.length) {
            const attributeRows = variant.attributes
              .filter((attr) => attr.attributeId && attr.valueId)
              .map((attr) => ({
                variant_id: variant.id,
                attribute_id: attr.attributeId,
                value_id: attr.valueId,
              }));
              
            if (attributeRows.length) {
               const { error: attrError } = await supabase
                .from("product_variant_attributes")
                .insert(attributeRows);
               if (attrError) throw attrError;
            }
          }

        } else {
          // Create new variant (if added during edit)
          const { data: createdVariant, error: variantError } = await supabase
            .from("product_variants")
            .insert({
              product_id: productId,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              low_stock_threshold: variant.lowStockThreshold ?? 10,
              barcode: variant.barcode || null,
              warehouse_location: variant.warehouseLocation || null,
              images: finalImages,
            })
            .select()
            .single();

          if (variantError) throw variantError;
          
          if (variant.attributes?.length && createdVariant) {
            const attributeRows = variant.attributes
              .filter((attr) => attr.attributeId && attr.valueId)
              .map((attr) => ({
                variant_id: createdVariant.id,
                attribute_id: attr.attributeId,
                value_id: attr.valueId,
              }));
              
            if (attributeRows.length) {
               const { error: attrError } = await supabase
                .from("product_variant_attributes")
                .insert(attributeRows);
               if (attrError) throw attrError;
            }
          }
        }
      }

      showToast("Product updated successfully", "success");
      fetchProduct(); // Refresh data
    } catch (err: any) {
      console.error("Failed to update product:", err);
      showToast(err.message || "Failed to update product", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      showToast("Product deleted successfully", "success");
      router.push("/dashboard/products");
    } catch (err: any) {
      console.error("Failed to delete product:", err);
      showToast(err.message || "Failed to delete product", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute attribute groups for variant selection
  const attributeGroups = product?.variants?.reduce((acc: any, variant: any) => {
    // Only consider this variant if it matches current selections (excluding the one being grouped)
    // Actually, we want to show all available options.
    // Logic from original file:
    const hasSelections = Object.values(selectedAttributes).some(
      (value) => value !== ""
    );
    const matchesSelections = hasSelections
      ? Object.entries(selectedAttributes).every(
          ([attrName, attrValue]) =>
            attrName === "" ||
            variant.attributes.some(
              (attr: any) =>
                attr.attributeName === attrName &&
                attr.valueName === attrValue
            )
        )
      : true;

    if (matchesSelections) {
      variant.attributes.forEach(({ attributeName, valueName }: any) => {
        if (!attributeName || !valueName) return;
        if (!acc[attributeName]) {
          acc[attributeName] = { values: new Set<string>() };
        }
        acc[attributeName].values.add(valueName);
      });
    }
    return acc;
  }, {} as Record<string, { values: Set<string> }>) || {};

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  return {
    product,
    categories,
    productsLoading,
    categoriesLoading,
    productsError,
    form,
    isUpdating,
    isDeleting,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    onSubmit,
    handleDelete,
    router,
    selectedVariant,
    setSelectedVariant,
    selectedAttributes,
    handleVariantChange,
    resetSelections,
    attributeGroups,
  };
};
