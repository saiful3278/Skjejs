import { SupabaseClient } from "@supabase/supabase-js";

export const slugify = (value: string): string => {
  if (typeof value !== 'string') {
    return "";
  }
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

export const generateUniqueSlug = async (
  supabase: SupabaseClient,
  table: string,
  name: string
): Promise<string> => {
  const baseSlug = slugify(name) || `${table}-${Date.now()}`;
  
  // Check if slug exists
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();

  if (data) {
    return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return baseSlug;
};
