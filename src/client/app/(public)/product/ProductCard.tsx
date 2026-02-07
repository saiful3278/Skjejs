"use client";
import React, { useEffect, useState } from "react";
import { Eye, ShoppingCart } from "lucide-react";
import { Product } from "@/app/types/productTypes";
import Image from "next/image";
import Link from "next/link";
import useTrackInteraction from "@/app/hooks/miscellaneous/useTrackInteraction";
import { useCart } from "@/app/hooks/miscellaneous/useCart";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { trackInteraction } = useTrackInteraction();
  const { addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  const formatPrice = useFormatPrice();

  useEffect(() => {
    trackInteraction(product.id, "view");
  }, [product.id, trackInteraction]);

  const handleClick = () => {
    trackInteraction(product.id, "click");
    // Removed redundant router.push to prevent double navigation race condition with Link
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inStockVariants.length > 0) {
      setAddingToCart(true);
      // Use the first in-stock variant
      const variantId = inStockVariants[0].id;
      await addToCart(variantId, 1);
      setAddingToCart(false);
    }
  };

  // Compute lowest price among in-stock variants
  const inStockVariants = product.variants.filter(
    (variant) => variant.stock > 0
  );
  const lowestPrice =
    inStockVariants.length > 0
      ? Math.min(...inStockVariants.map((variant) => variant.price))
      : 0;

  return (
    <div
      className="group bg-white rounded-sm border border-gray-100 overflow-hidden
       relative h-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative w-full h-48 sm:h-[170px]  bg-gray-50 flex items-center justify-center overflow-hidden">
        <Link href={`/product/${product.slug}`} prefetch={false} className="block w-full h-full" onClick={handleClick}>
          <Image
            src={
            product.variants[0]?.images[0] ||
            "/product-image-not-available.jpg"
          }
          alt={product?.name || "Product"}
          width={240}
          height={240}
          className="object-contain mx-auto p-4"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 20vw"
          onError={(e) => {
            e.currentTarget.src = "/product-image-not-available.jpg";
          }}
          />
        </Link>

        {/* Product Flags */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              NEW
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              FEATURED
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex space-x-1 z-10">
          <Link href={`/product/${product.slug}`} prefetch={false} onClick={handleClick}>
            <div
              className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm "
              aria-label="View product details"
            >
              <Eye size={14} className="text-gray-700" />
            </div>
          </Link>
        </div>

        {/* Stock Status */}
        {inStockVariants.length === 0 && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 lg:p-5 flex flex-col flex-grow">
        <Link href={`/product/${product.slug}`} prefetch={false} className="block flex-grow" onClick={handleClick}>
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base mb-2 line-clamp-2 leading-tight">
            {product.name}
          </h3>

          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center space-x-2">
              {inStockVariants.length > 0 ? (
                <span className="text-indigo-700 font-bold text-sm sm:text-lg lg:text-xl">
                  {formatPrice(lowestPrice)}
                </span>
              ) : (
                <span className="text-gray-500 font-medium text-sm sm:text-lg lg:text-xl">
                  Out of stock
                </span>
              )}
            </div>
          </div>

          {/* Category */}
          {product.category && (
            <div className="text-xs lg:text-sm text-gray-500 mb-2">
              {product.category.name}
            </div>
          )}
        </Link>

        {/* Quick Actions */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100">
          <button
            className={`w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 lg:py-3 rounded-sm font-medium text-xs sm:text-sm transition-colors ${
              inStockVariants.length > 0
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={handleAddToCart}
            disabled={inStockVariants.length === 0 || addingToCart}
          >
            <ShoppingCart size={16} />
            {addingToCart
              ? "Adding..."
              : inStockVariants.length > 0
              ? "Add to Cart"
              : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
