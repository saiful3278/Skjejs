"use client";
import { useState, useEffect, Suspense } from "react";
import { Plus, Edit, Trash2, Eye, Upload, Tag, AlertCircle, X } from "lucide-react";
import Button from "@/app/components/atoms/Button";
import Table from "@/app/components/layout/Table";
import ProductModal from "./ProductModal";
import ProductFileUpload from "./ProductFileUpload";
import ConfirmModal from "@/app/components/organisms/ConfirmModal";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { Product } from "@/app/types/productTypes";
import CustomLoader from "@/app/components/feedback/CustomLoader";
import EmptyState from "@/app/components/feedback/EmptyState";
import useQueryParams from "@/app/hooks/network/useQueryParams";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";

const ProductsDashboardContent = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { query } = useQueryParams();
  const searchTerm = (query.searchQuery as string) || "";
  const formatPrice = useFormatPrice();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [productsWithoutCategory, setProductsWithoutCategory] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (productsWithoutCategory.length > 0 && products.length > 0) {
      const recentlyUploadedProducts = products.filter(p => 
        productsWithoutCategory.includes(p.name) && !p.category
      );
      if (recentlyUploadedProducts.length > 0) {
        setSelectedProductIds(new Set(recentlyUploadedProducts.map(p => p.id)));
      }
    }
  }, [products, productsWithoutCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, slug, name, is_new, is_featured, is_trending, is_best_seller, description,
          category:categories!products_category_id_fkey(name, slug, id),
          product_variants(id, sku, price, stock, low_stock_threshold, images)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        isNew: p.is_new,
        isFeatured: p.is_featured,
        isTrending: p.is_trending,
        isBestSeller: p.is_best_seller,
        averageRating: 0,
        reviewCount: 0,
        description: p.description ?? null,
        variants:
          p.product_variants?.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            price: Number(v.price || 0),
            images: v.images || [],
            stock: v.stock ?? 0,
            lowStockThreshold: v.low_stock_threshold ?? 10,
            barcode: null,
            warehouseLocation: null,
            attributes: [],
          })) || [],
        category: p.category
          ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
          : null,
        reviews: [],
      }));
      setProducts(mapped);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    window.location.href = `/dashboard/products/edit?id=${product.id}`;
  };

  const handleDelete = async (product: Product) => {
    setIsProcessing(true);
    try {
      const supabase = getSupabaseClient();
      
      // First delete related cart items to satisfy foreign key constraints
      const { error: cartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("product_id", product.id);

      if (cartError) {
        console.warn("Failed to delete related cart items:", cartError);
        // Continue anyway, as the main delete might fail if this failed, 
        // but we want to see the main error or maybe this was just a permission issue 
        // and there were no items. 
        // Actually, if this fails due to connection, main will likely fail too.
        // If it fails due to RLS, main delete will definitely fail on constraint.
        // Let's throw to be safe.
        throw cartError;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      setProducts(products.filter((p) => p.id !== product.id));
      setIsConfirmModalOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      alert(`Failed to delete product: ${error.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const supabase = getSupabaseClient();
      const productIds = Array.from(selectedProductIds);
      const chunkSize = 100;
      setDeleteProgress(0);
      for (let i = 0; i < productIds.length; i += chunkSize) {
        const batch = productIds.slice(i, i + chunkSize);
        const { error: cartError } = await supabase
          .from("cart_items")
          .delete()
          .in("product_id", batch);
        if (cartError) throw cartError;
        const { error } = await supabase
          .from("products")
          .delete()
          .in("id", batch);
        if (error) throw error;
        setDeleteProgress(i + batch.length);
      }
      setProducts(products.filter((p) => !selectedProductIds.has(p.id)));
      setSelectedProductIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch (error: any) {
      console.error("Error bulk deleting products:", error);
      alert(`Failed to delete selected products: ${error.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
      setDeleteProgress(0);
    }
  };

  const handleBulkCategoryAssign = async () => {
    if (!selectedCategoryId || selectedProductIds.size === 0) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("products")
        .update({ category_id: selectedCategoryId })
        .in("id", Array.from(selectedProductIds));

      if (error) throw error;

      // Update local state
      setProducts(products.map(p => 
        selectedProductIds.has(p.id) 
          ? { ...p, category: categories.find(c => c.id === selectedCategoryId) }
          : p
      ));
      setSelectedProductIds(new Set());
      setIsBulkCategoryModalOpen(false);
      setSelectedCategoryId("");
    } catch (error) {
      console.error("Error bulk assigning categories:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleProductsWithoutCategory = (productNames: string[]) => {
    setProductsWithoutCategory(productNames);
  };

  const filteredProducts = products.filter(product =>
    product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: "name", label: "Name", render: (product: Product) => product.name },
    { key: "category", label: "Category", render: (product: Product) => product.category?.name || "N/A" },
    { key: "price", label: "Price", render: (product: Product) => formatPrice(product.variants?.[0]?.price || 0) },
    { key: "stock", label: "Stock", render: (product: Product) => product.variants?.[0]?.stock || 0 },
    { key: "status", label: "Status", render: () => "Active" },
    { 
      key: "actions", 
      label: "Actions", 
      render: (product: Product) => (
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`/product?slug=${product.slug}`, "_blank")}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleEdit(product)}
            className="p-1 text-green-600 hover:text-green-800"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => {
              setProductToDelete(product);
              setIsConfirmModalOpen(true);
            }}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
  ];

  if (loading) {
    return (
      <div className="h-full">
        <CustomLoader />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Products</h1>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex-1 md:flex-none justify-center items-center gap-2 bg-gray-600 text-white hover:bg-gray-700 text-sm md:text-base"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Bulk Upload</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            {selectedProductIds.size > 0 && (
              <>
                <Button
                  onClick={() => setIsBulkCategoryModalOpen(true)}
                  className="flex-1 md:flex-none justify-center items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base"
                >
                  <Tag size={18} />
                  <span className="hidden sm:inline">Assign Cat. ({selectedProductIds.size})</span>
                  <span className="sm:hidden">Cat. ({selectedProductIds.size})</span>
                </Button>
                <Button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex-1 md:flex-none justify-center items-center gap-2 bg-red-600 text-white hover:bg-red-700 text-sm md:text-base"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Delete ({selectedProductIds.size})</span>
                  <span className="sm:hidden">Del ({selectedProductIds.size})</span>
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none justify-center items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Products without category notification */}
        {productsWithoutCategory.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 break-words">
                  <strong>{productsWithoutCategory.length} products</strong> were uploaded without categories.
                  {selectedProductIds.size === 0 && (
                    <>
                      {" "}
                      <button
                        onClick={() => {
                          const productsWithoutCat = products.filter(p => 
                            productsWithoutCategory.includes(p.name) && !p.category
                          );
                          setSelectedProductIds(new Set(productsWithoutCat.map(p => p.id)));
                        }}
                        className="text-yellow-700 underline hover:text-yellow-900"
                      >
                        Select them now
                      </button>
                      {" to assign categories."}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setProductsWithoutCategory([])}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={() => <div className="w-8 h-8 text-gray-400">📦</div>}
            title="No products found"
            description="Try adjusting your search terms or add a new product."
            actionText="Add Product"
            actionOnClick={() => setIsModalOpen(true)}
          />
        ) : (
          <Table
            data={filteredProducts}
            columns={columns}
            isLoading={loading}
            emptyMessage="No products found"
            selectedRows={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            renderExpandedRow={(row) => (
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ID</p>
                    <p className="text-sm text-gray-900">{row.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Category</p>
                    <p className="text-sm text-gray-900">{row.category?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stock</p>
                    <p className="text-sm text-gray-900">{row.variants?.[0]?.stock || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Price</p>
                    <p className="text-sm text-gray-900">{formatPrice(row.variants?.[0]?.price || 0)}</p>
                  </div>
                </div>
              </div>
            )}
          />
        )}

        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={() => {
            setIsModalOpen(false);
            fetchProducts();
          }}
        />

        <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={() => handleDelete(productToDelete!)}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        isLoading={isProcessing}
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Bulk Upload Products</h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <ProductFileUpload
              onUploadSuccess={() => {
                setIsUploadModalOpen(false);
                fetchProducts();
              }}
              onProductsWithoutCategory={handleProductsWithoutCategory}
            />
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Selected Products"
        message={
          isProcessing
            ? `Deleting ${deleteProgress}/${selectedProductIds.size}...`
            : `Are you sure you want to delete ${selectedProductIds.size} selected product(s)? This action cannot be undone.`
        }
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setIsBulkDeleteModalOpen(false);
        }}
        isLoading={isProcessing}
      />

      {/* Bulk Category Assignment Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Assign Category to {selectedProductIds.size} Products</h2>
              <button
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkCategoryAssign}
                  disabled={!selectedCategoryId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Assign Category
                </button>
                <button
                  onClick={() => setIsBulkCategoryModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductsDashboard = () => (
  <Suspense fallback={<CustomLoader />}>
    <ProductsDashboardContent />
  </Suspense>
);

export default ProductsDashboard;
