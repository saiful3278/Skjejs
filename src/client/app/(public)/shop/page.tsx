"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import React from "react";
import ShopContent from "./ShopContent";

function ShopContentWrapper() {
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <ShopContent 
      sidebarOpen={sidebarOpen} 
      setSidebarOpen={setSidebarOpen}
      searchParams={searchParams}
    />
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading shop...</p>
      </div>
    </div>}>
      <ShopContentWrapper />
    </Suspense>
  );
}