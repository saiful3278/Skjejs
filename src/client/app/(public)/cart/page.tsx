"use client";
import BreadCrumb from "@/app/components/feedback/BreadCrumb";
import MainLayout from "@/app/components/templates/MainLayout";
import { Trash2, ShoppingCart } from "lucide-react";
import React, { useMemo } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import CartSummary from "@/app/(public)/cart/CartSummary";
import QuantitySelector from "@/app/components/molecules/QuantitySelector";
import { motion } from "framer-motion";
import CartSkeletonLoader from "@/app/components/feedback/CartSkeletonLoader";
import { useCart } from "@/app/hooks/miscellaneous/useCart";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";

// Helper function to format variant name from SKU
const formatVariantName = (item: any) => {
  const name = item?.variant?.product?.name || "Product";
  const sku = item?.variant?.sku || "";
  // Parse SKU (e.g., "TSH-RED-M" -> "Red, Medium")
  const parts = sku.split("-").slice(1); // Remove prefix (e.g., "TSH")
  const variantDetails = parts.join(", "); // Join color and size
  return variantDetails ? `${name} - ${variantDetails}` : name;
};

const Cart = () => {
  const { control } = useForm();
  const { cartItems, isLoading, removeFromCart, updateQuantity, cartId } = useCart();
  const formatPrice = useFormatPrice();
  
  const subtotal = useMemo(() => {
    if (!cartItems.length) return 0;
    return cartItems.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );
  }, [cartItems]);

  const handleRemoveFromCart = async (id: string) => {
    try {
      await removeFromCart(id);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <BreadCrumb />

        {/* Cart Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-2 mt-4 mb-6"
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            Your Cart
          </h1>
          <span className="text-gray-500 text-sm">
            ({cartItems.length} items)
          </span>
        </motion.div>

        {/* Cart Content */}
        {isLoading ? (
          <CartSkeletonLoader />
        ) : cartItems.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingCart size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-base sm:text-lg text-gray-600">
              Your cart is empty
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                    <Image
                      src={
                        item?.variant?.images[0] ||
                        "/product-image-not-available.jpg"
                      }
                      alt={formatVariantName(item)}
                      width={80}
                      height={80}
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 80px"
                      onError={(e) => {
                        e.currentTarget.src = "/product-image-not-available.jpg";
                      }}
                    />
                  </div>

                  {/* Variant Details */}
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm sm:text-base">
                      {formatVariantName(item)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {formatPrice(item.variant.price)}
                    </p>
                  </div>

                  {/* Quantity Selector */}
                  <Controller
                    name={`quantity-${item.variant.id}`}
                    defaultValue={item.quantity}
                    control={control}
                    render={({ field }) => (
                      <QuantitySelector
                        itemId={item.id}
                        value={field.value}
                        onChange={field.onChange}
                        onUpdate={(id, q) => updateQuantity(id, q)}
                      />
                    )}
                  />

                  {/* Subtotal and Remove */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <p className="font-medium text-gray-800 text-sm sm:text-base">
                      {formatPrice(item.variant.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Cart Summary */}
            <CartSummary
              subtotal={subtotal}
              totalItems={cartItems.length}
              cartId={cartId || ""}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;
