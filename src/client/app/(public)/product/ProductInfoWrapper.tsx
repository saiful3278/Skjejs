"use client";
import React, { useState, useMemo } from "react";
import { Product } from "@/app/types/productTypes";
import ProductInfo from "./ProductInfo";

interface ProductInfoWrapperProps {
  product: Product;
}

const ProductInfoWrapper: React.FC<ProductInfoWrapperProps> = ({ product }) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Build attribute groups from variants
  const attributeGroups = useMemo(() => {
    const groups: Record<string, { values: Set<string> }> = {};
    
    product.variants.forEach((variant) => {
      variant.attributes.forEach(({ attribute, value }) => {
        if (!groups[attribute.name]) {
          groups[attribute.name] = { values: new Set<string>() };
        }
        groups[attribute.name].values.add(value.value);
      });
    });
    
    return groups;
  }, [product.variants]);

  // Find the selected variant based on selected attributes
  const selectedVariant = useMemo(() => {
    if (Object.keys(selectedAttributes).length === 0) {
      return product.variants[0] || null;
    }
    
    return product.variants.find((variant) => {
      return variant.attributes.every(({ attribute, value }) => {
        return !selectedAttributes[attribute.name] || selectedAttributes[attribute.name] === value.value;
      });
    }) || null;
  }, [product.variants, selectedAttributes]);

  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const resetSelections = () => {
    setSelectedAttributes({});
  };

  return (
    <ProductInfo
      name={product.name}
      averageRating={product.averageRating || 0}
      reviewCount={product.reviewCount || 0}
      description={product.description}
      variants={product.variants}
      selectedVariant={selectedVariant}
      onVariantChange={handleVariantChange}
      attributeGroups={attributeGroups}
      selectedAttributes={selectedAttributes}
      resetSelections={resetSelections}
    />
  );
};

export default ProductInfoWrapper;