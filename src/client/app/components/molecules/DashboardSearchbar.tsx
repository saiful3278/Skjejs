"use client";
import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Search, Loader2 } from "lucide-react";
import { debounce } from "lodash";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

// Code split the SearchModal component
const SearchModal = lazy(() => import("./SearchModal"));

interface DashboardSearchBarProps {
  placeholder?: string;
  className?: string;
}

const DashboardSearchBar: React.FC<DashboardSearchBarProps> = ({
  placeholder = "Search Dashboard",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery) {
        setIsLoading(true);
        (async () => {
          try {
            const supabase = getSupabaseClient();
            const [productsRes, categoriesRes, usersRes] = await Promise.all([
              supabase
                .from("products")
                .select("id, name, slug")
                .ilike("name", `%${searchQuery}%`)
                .limit(10),
              supabase
                .from("categories")
                .select("id, name, slug")
                .ilike("name", `%${searchQuery}%`)
                .limit(10),
              supabase
                .from("profiles")
                .select("user_id, name")
                .ilike("name", `%${searchQuery}%`)
                .limit(10),
            ]);

            if (productsRes.error || categoriesRes.error || usersRes.error) {
              throw productsRes.error || categoriesRes.error || usersRes.error;
            }

            const productResults =
              (productsRes.data || []).map((p: any) => ({
                type: "product",
                id: p.id,
                title: p.name,
                description: p.slug,
              })) || [];
            const categoryResults =
              (categoriesRes.data || []).map((c: any) => ({
                type: "category",
                id: c.id,
                title: c.name,
                description: c.slug,
              })) || [];
            const userResults =
              (usersRes.data || []).map((u: any) => ({
                type: "user",
                id: u.user_id,
                title: u.name || "Unknown",
                description: "",
              })) || [];

            setResults([...productResults, ...categoryResults, ...userResults]);
            setError(null);
          } catch (err: any) {
            console.error("Search error:", err);
            setResults([]);
            setError(err);
          } finally {
            setIsLoading(false);
          }
        })();
      }
    }, 300),
    [] // no external deps
  );

  // Trigger search when query changes
  useEffect(() => {
    if (isOpen) {
      debouncedSearch(query);
    }
    return () => debouncedSearch.cancel();
  }, [query, isOpen, debouncedSearch]);

  // Ctrl + K shortcut
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if ((e.ctrlKey || e.metaKey) && e.key === "k") {
  //       e.preventDefault();
  //       setIsOpen((prev) => !prev);
  //       if (!isOpen) setQuery("");
  //     } else if (e.key === "Escape" && isOpen) {
  //       setIsOpen(false);
  //     }
  //   };
  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, [isOpen]);

  // Clear query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200
           hover:border-gray-300 transition-all ${className}`}
        aria-label="Open dashboard search (Ctrl + K)"
      >
        <Search size={18} className="text-gray-400 group-hover:text-gray-600" />
        <span className="text-sm text-gray-500 hidden sm:inline">
          {placeholder}
        </span>
        <kbd className="hidden sm:flex items-center text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 ml-2">
          Ctrl K
        </kbd>
      </button>

      {isOpen && (
        <Suspense fallback={<SearchFallback />}>
          <SearchModal
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            query={query}
            setQuery={setQuery}
            placeholder={placeholder}
            searchResults={results}
            isLoading={isLoading}
            error={error}
          />
        </Suspense>
      )}
    </>
  );
};

const SearchFallback = () => (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 border border-gray-100 flex items-center justify-center py-10">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  </div>
);

export default DashboardSearchBar;
