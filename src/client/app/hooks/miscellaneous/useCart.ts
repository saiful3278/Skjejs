"use client";
import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { useAuth } from "@/app/hooks/useAuth";
import useToast from "@/app/hooks/ui/useToast";

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    price: number;
    sku: string;
    images: string[];
    stock: number;
    product: {
      id: string;
      name: string;
      slug: string;
    };
    attributes: {
      attribute: { name: string };
      value: { value: string };
    }[];
  };
}

export const useCart = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    if (!user?.id) {
      setCartItems([]);
      setCartCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      console.log("Fetching cart for user ID:", user.id);
      
      // Get or create active cart
      console.log("Fetching carts for user:", user.id);
      const { data: carts, error: cartError } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1);  // Limit to 1 result to avoid PGRST116 error
        
      console.log("Cart fetch result:", { carts, cartError });
        
      // Handle multiple carts - use the first one or create a new one
      let cart = carts?.[0] || null;
      
      if (carts && carts.length > 1) {
        console.warn(`User ${user.id} has ${carts.length} active carts. Using the first one.`);
        // If there are multiple carts, we should probably clean them up
        // but for now, just use the first one
      }
        
      if (cartError) {
        console.error("Error fetching cart:", cartError);
        throw cartError;
      }

      if (!cart) {
        console.log("Creating new cart for user:", user.id);
        // Create new cart
        const { data: newCart, error: createError } = await supabase
          .from("carts")
          .insert({ user_id: user.id, status: "ACTIVE" })
          .select("id")
          .single();
        
        if (createError) {
          console.error("Error creating cart:", createError);
          throw createError;
        }
        cart = newCart;
        console.log("Created new cart with ID:", cart.id);
      }

      setCartId(cart.id);

      // Fetch items without join first
      console.log("Fetching cart items for cart ID:", cart.id);
      const { data: items, error: itemsError } = await supabase
        .from("cart_items")
        .select("product_id, qty")
        .eq("cart_id", cart.id)
        .limit(100);  // Reasonable limit to prevent too many items
        
      console.log("Cart items fetch result:", { items, itemsError });

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setCartItems([]);
        setCartCount(0);
        return;
      }

      // Fetch products (since cart_items links to products, not variants)
      const productIds = items.map((item: any) => item.product_id);
      
      // Fetch products with their variants
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          product_variants (
            id,
            price,
            sku,
            images,
            stock,
            attributes:product_variant_attributes (
              attribute:attributes (name),
              value:attribute_values (value)
            )
          )
        `)
        .in("id", productIds);

      if (productsError) throw productsError;

      // Map back to CartItem structure
      // Note: Since cart stores product_id, we default to the first variant found for that product
      const productsMap = new Map(productsData?.map((p: any) => [p.id, p]));

      const formattedItems = items
        .filter((item: any) => productsMap.has(item.product_id))
        .map((item: any) => {
          const product = productsMap.get(item.product_id);
          const variant = product.product_variants?.[0] || {
            id: "unknown",
            price: 0,
            sku: "unknown",
            images: [],
            stock: 0,
            attributes: []
          };

          return {
            id: `${item.product_id}`, // Using product_id as item id since cart_items PK is likely (cart_id, product_id)
            variantId: variant.id,
            quantity: item.qty,
            variant: {
              id: variant.id,
              price: Number(variant.price),
              sku: variant.sku,
              images: variant.images || [],
              stock: variant.stock,
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
              },
              attributes: variant.attributes || [],
            },
          };
        });

      setCartItems(formattedItems);
      setCartCount(formattedItems.reduce((acc: number, item: any) => acc + item.quantity, 0));

    } catch (error: any) {
      console.error("Error fetching cart details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user?.id
      });
      if (error?.code !== "PGRST116") {
        showToast("Error loading cart", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (variantId: string, quantity: number = 1) => {
    if (!user?.id) {
      showToast("Please login to add items to cart", "error");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // Get product_id from variantId
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .eq("id", variantId)
        .single();
        
      if (variantError || !variant) {
        throw new Error("Invalid variant");
      }
      
      const productId = variant.product_id;

      let currentCartId = cartId;

      if (!currentCartId) {
         // Create cart if not exists (redundant check but safe)
         const { data: cart } = await supabase
          .from("carts")
          .insert({ user_id: user.id, status: "ACTIVE" })
          .select("id")
          .single();
         if (cart) currentCartId = cart.id;
      }

      if (!currentCartId) throw new Error("Could not initialize cart");

      // Check if item exists
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("product_id, qty")
        .eq("cart_id", currentCartId)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        // Update quantity
        await supabase
          .from("cart_items")
          .update({ qty: existingItem.qty + quantity })
          .eq("cart_id", currentCartId)
          .eq("product_id", productId);
      } else {
        // Insert new item
        await supabase
          .from("cart_items")
          .insert({
            cart_id: currentCartId,
            product_id: productId,
            qty: quantity,
          });
      }

      showToast("Item added to cart", "success");
      fetchCart();
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToast("Failed to add item to cart", "error");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("cart_items")
        .update({ qty: quantity })
        .eq("cart_id", cartId)
        .eq("product_id", itemId); // itemId is productId in our adaptation
      
      fetchCart();
    } catch (error) {
      console.error("Error updating cart:", error);
      showToast("Failed to update cart", "error");
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId)
        .eq("product_id", itemId); // itemId is productId in our adaptation
      
      showToast("Item removed from cart", "success");
      fetchCart();
    } catch (error) {
      console.error("Error removing from cart:", error);
      showToast("Failed to remove item", "error");
    }
  };

  return {
    cartItems,
    cartCount,
    cartId,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    refreshCart: fetchCart
  };
};
