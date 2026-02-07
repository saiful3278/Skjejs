"use client";
import { User, Menu } from "lucide-react";
import BreadCrumb from "@/app/components/feedback/BreadCrumb";
import Sidebar from "../../components/layout/Sidebar";
import DashboardSearchBar from "@/app/components/molecules/DashboardSearchbar";
import { useAuth } from "@/app/hooks/useAuth";
import Image from "next/image";
import { useState } from "react";
import useStorage from "@/app/hooks/state/useStorage";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useStorage("sidebarOpen", false, "local");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide header on dashboard home page (exactly "/dashboard")
  const isDashboardHome = pathname === "/dashboard";
  
  // Removed debug console.log to reduce noise

  const isOpen = isMobile ? mobileOpen : sidebarOpen;
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar
        isOpen={isOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Temporarily show header on all pages to debug */}
        <header className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <Menu size={24} />
              </button>
              <div className="flex-1 overflow-hidden">
                <BreadCrumb />
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <div className="hidden sm:block">
                <DashboardSearchBar />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                  {isLoading ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user?.name || "User"}
                      fill
                      sizes="36px"
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  )}
                </div>
                {user?.name && (
                  <span className="text-sm font-medium text-gray-800 hidden lg:inline">
                    {user.name}
                  </span>
                )}
              </div>
            </div>
          </header>

        <main className="flex-1 p-3 sm:p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
