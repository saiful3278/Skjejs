"use client";
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { useAppDispatch } from "@/app/store/hooks";
import { logout } from "@/app/store/slices/AuthSlice";
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Users,
  LogOut,
  PanelsRightBottom,
  Boxes,
  ChartCandlestick,
  ClipboardPlus,
  ClipboardCheck,
  Section,
  ChartArea,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const Sidebar = ({ isOpen, toggleSidebar, isMobile }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const sections = useMemo(
    () => [
      {
        title: "Overview",
        links: [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        title: "E-commerce",
        links: [
          { name: "Products", href: "/products", icon: Layers },
          { name: "Inventory", href: "/inventory", icon: Section },
          { name: "Attributes", href: "/attributes", icon: Layers },
          { name: "Categories", href: "/categories", icon: Boxes },
          { name: "Transactions", href: "/transactions", icon: ShoppingCart },
          { name: "Users", href: "/users", icon: Users },
          { name: "Chats", href: "/chats", icon: ChartArea },
        ],
      },
      {
        title: "Stats",
        links: [
          { name: "Analytics", href: "/analytics", icon: ChartCandlestick },
          { name: "Reports", href: "/reports", icon: ClipboardPlus },
          { name: "Logs", href: "/logs", icon: ClipboardCheck },
        ],
      },
    ],
    []
  );

  const prependDashboard = (href: string) =>
    href.startsWith("/dashboard") ? href : `/dashboard${href}`;

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      dispatch(logout());
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const SidebarLink = ({
    name,
    href,
    Icon,
  }: {
    name: string;
    href: string;
    Icon: React.ElementType;
  }) => {
    const fullHref = prependDashboard(href);
    const isActive = pathname === fullHref;

    return (
      <Link
        href={fullHref}
        onClick={isMobile ? toggleSidebar : undefined}
        className={`relative group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
          isActive
            ? "bg-indigo-100 text-indigo-600 font-medium shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <div className="min-w-[20px]">
          <Icon
            className={`h-5 w-5 transition ${
              isActive ? "text-indigo-600" : "group-hover:text-black"
            }`}
          />
        </div>
        {(isOpen || isMobile) && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm whitespace-nowrap"
          >
            {name}
          </motion.span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 flex items-center justify-end rounded-lg transition mb-4 w-full text-gray-700 hover:bg-gray-100"
          >
            <PanelsRightBottom size={24} />
          </button>
        )}

        {isMobile && (
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-xl font-bold text-indigo-600">Menu</span>
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        )}

        <nav className="flex flex-col space-y-2 overflow-y-auto max-h-[calc(100vh-150px)]">
          {sections.map((section, idx) => (
            <div key={section.title} className="mb-2">
              {(isOpen || isMobile) && (
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 ml-4 mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.links.map((link) => (
                  <SidebarLink
                    key={link.name}
                    name={link.name}
                    href={link.href}
                    Icon={link.icon}
                  />
                ))}
              </div>
              {idx < sections.length - 1 && (
                <hr className="my-3 border-t border-gray-200" />
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-300 group"
        >
          <LogOut className="h-5 w-5 text-red-500 group-hover:text-red-600" />
          {(isOpen || isMobile) && (
            <span className="text-sm font-medium text-red-600">Sign Out</span>
          )}
        </button>
      </div>
    </div>
  );

  // Mobile Drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={toggleSidebar}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl p-4"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop Sidebar
  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{
        width: isOpen ? 260 : 80,
        transition: { duration: 0.3, ease: "easeInOut" },
      }}
      className="bg-white border-r border-gray-200 shadow-sm hidden md:flex flex-col p-4 z-30 h-screen sticky top-0"
    >
      <SidebarContent />
    </motion.aside>
  );
};

export default Sidebar;
