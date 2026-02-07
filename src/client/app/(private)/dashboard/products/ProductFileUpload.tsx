"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import useToast from "@/app/hooks/ui/useToast";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { slugify } from "@/app/utils/slug";

interface ProductFileUploadProps {
  onUploadSuccess: () => void;
  onProductsWithoutCategory?: (productNames: string[]) => void;
  acceptedFormats?: string[];
}

const ProductFileUpload = ({
  onUploadSuccess,
  onProductsWithoutCategory,
  acceptedFormats = [".csv"],
}: ProductFileUploadProps) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "ready" | "processing" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [readyRows, setReadyRows] = useState<any[]>([]);
  const [productsWithoutCategoryPreview, setProductsWithoutCategoryPreview] = useState<string[]>([]);

  const acceptedFormatString = acceptedFormats.join(",");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const resetState = () => {
    setFileName("");
    setUploadStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTotalCount(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setDuplicateCount(0);
    setSkipDuplicates(true);
    setReadyRows([]);
    setProductsWithoutCategoryPreview([]);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return [];
    const parseLine = (line: string) => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      out.push(current);
      return out.map((s) => s.trim());
    };
    const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseLine(lines[i]);
      if (!fields.some((f) => f && f.length > 0)) continue;
      const obj: any = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        if (!header) continue;
        obj[header] = fields[j] ?? "";
      }
      result.push(obj);
    }
    return result;
  };

  const parsePriceValue = (value: any) => {
    if (value === undefined || value === null) return 0;
    const s = String(value);
    const cleaned = s.replace(/[^\d.,-]/g, "").replace(/,/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseStockValue = (value: any) => {
    if (value === undefined || value === null) return 0;
    const s = String(value);
    const cleaned = s.replace(/[^\d-]/g, "");
    const num = parseInt(cleaned || "0", 10);
    return isNaN(num) ? 0 : num;
  };

  const splitImagesField = (imagesField: any) => {
    if (!imagesField) return [];
    const s = String(imagesField).replace(/`/g, "").trim();
    const parts = s.includes("|") ? s.split("|") : s.split(",");
    return parts.map((p) => p.trim()).filter(Boolean);
  };
  const getField = (row: any, keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return undefined;
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (fileExtension !== "csv") {
        showToast("Only CSV files are supported at the moment.", "error");
        return;
    }

    setFileName(file.name);
    setIsLoading(true);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      setTotalCount(data.length);

      const supabase = getSupabaseClient();
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("You must be logged in to upload products.");
      }
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name");
        
      if (categoriesError) {
        throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
      }

      const categoryMap = new Map<string, string>();
      categoriesData?.forEach((cat) => {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
        categoryMap.set(cat.id, cat.id);
      });

      const normalizedName = (n: any) =>
        String(n || "").trim().toLowerCase();
      const csvNames = data.map((row: any) =>
        normalizedName(row.name || row.title)
      );
      const localDuplicateSet = new Set<string>();
      const seenLocal = new Set<string>();
      for (const n of csvNames) {
        if (!n) continue;
        if (seenLocal.has(n)) localDuplicateSet.add(n);
        else seenLocal.add(n);
      }
      setDuplicateCount(localDuplicateSet.size);

      const namesToCheck = Array.from(new Set(csvNames.filter(Boolean)));
      const dbDuplicateSet = new Set<string>();
      const chunkSizeCheck = 200;
      for (let i = 0; i < namesToCheck.length; i += chunkSizeCheck) {
        const chunk = namesToCheck.slice(i, i + chunkSizeCheck);
        const { data: existing } = await supabase
          .from("products")
          .select("name")
          .in("name", chunk);
        (existing || []).forEach((p: any) =>
          dbDuplicateSet.add(normalizedName(p.name))
        );
      }

      const rowsPrepared: any[] = [];
      const noCategoryNames: string[] = [];
      const slugLocalSet = new Set<string>();

      for (const row of data) {
        const productNameRaw = row.name || row.title;
        const productNameNorm = normalizedName(productNameRaw);
        if (!productNameNorm) continue;

        const categoryIdVal = getField(row, ["categoryid", "category_id", "category"]);
        let finalCategoryId = null as string | null;
        if (categoryIdVal) {
          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              categoryIdVal
            );
          if (!isUuid) {
            const foundId = categoryMap.get(String(categoryIdVal).toLowerCase());
            if (foundId) finalCategoryId = foundId;
            else finalCategoryId = null;
          } else {
            finalCategoryId = categoryIdVal;
          }
        }
        if (!finalCategoryId) noCategoryNames.push(productNameRaw);

        const baseSlug = slugify(productNameRaw || "");
        let uniqueSlug = baseSlug || `product-${Date.now()}`;
        let suffix = 2;
        while (slugLocalSet.has(uniqueSlug)) {
          uniqueSlug = `${baseSlug}-${suffix++}`;
        }
        slugLocalSet.add(uniqueSlug);

        const priceRaw = getField(row, ["price", "cost", "amount"]);
        const stockRaw = getField(row, ["stock", "qty", "quantity", "stocklevel", "stock_level", "stock level"]);
        const priceNum = parsePriceValue(priceRaw);
        const stockNum = parseStockValue(stockRaw);
        const imagesArr = splitImagesField(row.images);

        rowsPrepared.push({
          name: productNameRaw,
          nameNorm: productNameNorm,
          slug: uniqueSlug,
          description: row.description || "",
          category_id: finalCategoryId,
          is_new: String(row.isnew || "").toLowerCase() === "true",
          is_featured: String(row.isfeatured || "").toLowerCase() === "true",
          is_trending: String(row.istrending || "").toLowerCase() === "true",
          is_best_seller:
            String(row.isbestseller || "").toLowerCase() === "true",
          sku: row.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          price: priceNum,
          stock: stockNum,
          images: imagesArr,
        });
      }

      setProductsWithoutCategoryPreview(noCategoryNames);
      setReadyRows(rowsPrepared);
      setUploadStatus("ready");
      setDuplicateCount(
        new Set(
          rowsPrepared
            .map((r) => r.nameNorm)
            .filter((n) => localDuplicateSet.has(n) || dbDuplicateSet.has(n))
        ).size
      );

    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");
      showToast(
        "Failed to import products. Please check your file and try again.",
        "error"
      );
    } finally {
        setIsLoading(false);
    }
  };

  const startProcessing = async () => {
    if (!readyRows.length) return;
    setUploadStatus("processing");
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    const supabase = getSupabaseClient();

    const normalizedName = (n: any) =>
      String(n || "").trim().toLowerCase();
    const namesToCheck = Array.from(
      new Set(readyRows.map((r) => r.nameNorm).filter(Boolean))
    );
    const dbDupSet = new Set<string>();
    const chunkSizeCheck = 200;
    for (let i = 0; i < namesToCheck.length; i += chunkSizeCheck) {
      const chunk = namesToCheck.slice(i, i + chunkSizeCheck);
      const { data: existing } = await supabase
        .from("products")
        .select("name")
        .in("name", chunk);
      (existing || []).forEach((p: any) =>
        dbDupSet.add(normalizedName(p.name))
      );
    }

    const processedNameSet = new Set<string>();
    const rows = readyRows.filter((r) => {
      const isDuplicate = dbDupSet.has(r.nameNorm) || processedNameSet.has(r.nameNorm);
      if (isDuplicate && skipDuplicates) {
        processedNameSet.add(r.nameNorm);
        setSkippedCount((s) => s + 1);
        setProcessedCount((p) => p + 1);
        return false;
      }
      processedNameSet.add(r.nameNorm);
      return true;
    });

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const productRows = chunk.map((r) => ({
        name: r.name,
        slug: r.slug,
        description: r.description,
        category_id: r.category_id,
        is_new: r.is_new,
        is_featured: r.is_featured,
        is_trending: r.is_trending,
        is_best_seller: r.is_best_seller,
      }));

      const { data: insertedProducts, error: productBatchError } = await supabase
        .from("products")
        .insert(productRows)
        .select("id, slug");

      if (productBatchError || !insertedProducts || insertedProducts.length === 0) {
        setFailedCount((f) => f + chunk.length);
        setProcessedCount((p) => p + chunk.length);
        continue;
      }

      const idBySlug = new Map<string, string>();
      insertedProducts.forEach((p: any) => {
        if (p?.slug && p?.id) idBySlug.set(p.slug, p.id);
      });

      const variantRows = chunk
        .map((r) => {
          const pid = idBySlug.get(r.slug);
          if (!pid) return null;
          return {
            product_id: pid,
            sku: r.sku,
            price: r.price,
            stock: r.stock,
            low_stock_threshold: 10,
            images: r.images,
          };
        })
        .filter(Boolean) as any[];

      const { error: variantBatchError } = await supabase
        .from("product_variants")
        .insert(variantRows);

      if (variantBatchError) {
        setFailedCount((f) => f + chunk.length);
      } else {
        setSuccessCount((s) => s + chunk.length);
      }
      setProcessedCount((p) => p + chunk.length);
    }

    setUploadStatus("success");
    let message = `Imported ${successCount + skippedCount} of ${totalCount}. ${successCount} created, ${skippedCount} skipped, ${failedCount} failed.`;
    if (productsWithoutCategoryPreview.length > 0) {
      message += ` ${productsWithoutCategoryPreview.length} products need category assignment.`;
      if (onProductsWithoutCategory) {
        onProductsWithoutCategory(productsWithoutCategoryPreview);
      }
    }
    showToast(message, "success");
    onUploadSuccess();
    setTimeout(resetState, 3000);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-all duration-300 ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : uploadStatus === "success"
            ? "border-green-500 bg-green-50"
            : uploadStatus === "error"
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormatString}
          onChange={handleChange}
          className="hidden"
          disabled={isLoading}
        />

        {uploadStatus === "idle" ? (
          <>
            <div className="flex flex-col items-center space-y-2 mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {fileName
                  ? fileName
                  : "Drop CSV file here or click to upload"}
              </p>
              <p className="text-xs text-gray-500">
                Supports CSV files
              </p>
            </div>
            <button
              onClick={handleButtonClick}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Select File</span>
                </>
              )}
            </button>
          </>
        ) : uploadStatus === "ready" ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Discovered</div>
              <div className="text-sm font-medium">{totalCount}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Duplicates</div>
              <div className="text-sm font-medium">{duplicateCount}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Without Category</div>
              <div className="text-sm font-medium">
                {productsWithoutCategoryPreview.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Skip duplicates by name
              </span>
            </div>
            <button
              onClick={startProcessing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Start Processing</span>
            </button>
          </div>
        ) : uploadStatus === "processing" ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Processed</div>
              <div className="text-sm font-medium">
                {processedCount} / {totalCount}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-600 rounded"
                style={{
                  width: `${totalCount ? Math.floor((processedCount / totalCount) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-xs">
                <div className="font-semibold text-green-600">{successCount}</div>
                <div className="text-gray-600">Uploaded</div>
              </div>
              <div className="text-xs">
                <div className="font-semibold text-yellow-600">{skippedCount}</div>
                <div className="text-gray-600">Skipped</div>
              </div>
              <div className="text-xs">
                <div className="font-semibold text-red-600">{failedCount}</div>
                <div className="text-gray-600">Failed</div>
              </div>
            </div>
          </div>
        ) : uploadStatus === "success" ? (
          <div className="flex flex-col items-center space-y-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              Import successful!
            </p>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-700">Import failed</p>
            <p className="text-xs text-gray-500">{fileName}</p>
            <button
              onClick={resetState}
              className="px-3 py-1 bg-white text-red-600 border border-red-600 rounded-md hover:bg-red-50 text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center text-xs text-gray-500">
        <AlertCircle className="h-3 w-3 mr-1" />
        <span>
          CSV columns: name*, price*, stock, categoryId (optional), description, sku, images (pipe | separated)
        </span>
      </div>
    </div>
  );
};

export default ProductFileUpload;
