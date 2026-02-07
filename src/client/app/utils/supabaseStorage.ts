import { SupabaseClient } from "@supabase/supabase-js";

export const uploadImages = async (
  supabase: SupabaseClient,
  bucket: string,
  pathPrefix: string,
  files: File[]
): Promise<string[]> => {
  if (!files.length) return [];
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const path = `${pathPrefix}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });

    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }

    if (data) {
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      uploadedUrls.push(publicUrlData.publicUrl);
    }
  }

  return uploadedUrls;
};
