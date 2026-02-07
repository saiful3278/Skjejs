"use client";

import { useSearchParams } from "next/navigation";
import MainLayout from "@/app/components/templates/MainLayout";
import ShippingAddressCard from "../ShippingAddressCard";
import OrderSummary from "../OrderSummary";
import OrderStatus from "../OrderStatus";
import OrderItems from "../OrderItems";
import { useGetOrderQuery } from "@/app/store/apis/OrderApi";
import CustomLoader from "@/app/components/feedback/CustomLoader";

const OrderDetailContent = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { data, isLoading, error } = useGetOrderQuery(orderId);
  const order = data?.order;
  console.log("order: ", order);

  if (isLoading) {
    return (
      <MainLayout>
        <CustomLoader />
      </MainLayout>
    );
  }

  if (error || !order) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">
              {error?.message || "Order not found"}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Order #{order.id}</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <OrderStatus status={order.status} />
              <OrderItems items={order.items} />
            </div>
            
            <div className="space-y-6">
              <OrderSummary 
                subtotal={order.subtotal} 
                tax={order.tax} 
                shipping={order.shipping} 
                total={order.total} 
              />
              <ShippingAddressCard address={order.shipping_address} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default OrderDetailContent;