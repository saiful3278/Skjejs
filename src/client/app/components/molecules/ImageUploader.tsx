"use client";

import { Trash2, Upload } from "lucide-react";
import Image from "next/image";
import {
  Controller,
  Control,
  FieldErrors,
  UseFormSetValue,
} from "react-hook-form";
import { useEffect, useState, useCallback } from "react";

interface ImageUploaderProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  label: string;
  name?: string;
  maxFiles?: number;
  disabled?: boolean;
  existingImages?: string[];
}

interface ImagePreview {
  url: string;
  file?: File;
  isExisting?: boolean;
}

const ImageUploader = ({
  control,
  errors,
  setValue,
  label,
  name = "images",
  maxFiles = 5,
  disabled = false,
  existingImages = [],
}: ImageUploaderProps) => {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);

  // Initialize existing images
  useEffect(() => {
    if (existingImages && existingImages.length > 0) {
      const existingPreviews = existingImages.map(url => ({
        url,
        isExisting: true
      }));
      setPreviews(existingPreviews);
    }
  }, [existingImages]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (!preview.isExisting && preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [previews]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      if (!files.length) return;

      const currentFiles = previews.filter(p => !p.isExisting).map((p) => p.file);
      const existingImages = previews.filter(p => p.isExisting);
      const remainingSlots = maxFiles - previews.length;
      const filesToAdd = files.slice(0, remainingSlots);

      if (filesToAdd.length < files.length) {
        alert(
          `Only ${remainingSlots} more files can be added. Maximum ${maxFiles} files allowed.`
        );
      }

      const newPreviews = filesToAdd.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isExisting: false,
      }));

      const updatedFiles = [...currentFiles.filter(Boolean), ...filesToAdd];
      const updatedPreviews = [...existingImages, ...newPreviews];

      setPreviews(updatedPreviews);
      setValue(name, [...existingImages.map(p => p.url), ...updatedFiles], { shouldValidate: true });

      // Clear the input
      e.target.value = "";
    },
    [previews, setValue, name, maxFiles]
  );

  const removeImage = useCallback(
    (index: number) => {
      const updatedPreviews = [...previews];
      const removedPreview = updatedPreviews.splice(index, 1)[0];

      // Only revoke blob URL for new files, not existing ones
      if (!removedPreview.isExisting && removedPreview.url) {
        URL.revokeObjectURL(removedPreview.url);
      }

      setPreviews(updatedPreviews);
      setValue(
        name,
        [...updatedPreviews.filter(p => p.isExisting).map(p => p.url), ...updatedPreviews.filter(p => !p.isExisting).map((p) => p.file)],
        { shouldValidate: true }
      );
    },
    [previews, setValue, name]
  );

  const canAddMore = previews.length < maxFiles;
  const errorMessage = errors[name]?.message as string;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {maxFiles > 1 && (
          <span className="text-gray-500 text-xs ml-1">
            ({previews.length}/{maxFiles})
          </span>
        )}
      </label>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {previews.map((preview, index) => (
            <div
              key={`${preview.url}-${index}`}
              className="relative group aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Image
                src={preview.url}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
              />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={disabled}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove image"
              >
                <Trash2 size={14} />
              </button>

              {/* File indicator */}
              <div className={`absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded ${
                preview.isExisting ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                {preview.isExisting ? 'Existing' : 'New'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Input */}
      <Controller
        name={name}
        control={control}
        render={() => (
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple={maxFiles > 1}
              onChange={handleFileUpload}
              disabled={disabled || !canAddMore}
              className="hidden"
              id={`file-input-${name}`}
            />
            <label
              htmlFor={`file-input-${name}`}
              className={`
                flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${
                  disabled || !canAddMore
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
                }
              `}
            >
              <Upload
                size={24}
                className={
                  disabled || !canAddMore ? "text-gray-400" : "text-gray-500"
                }
              />
              <p
                className={`mt-2 text-sm ${
                  disabled || !canAddMore ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {!canAddMore
                  ? `Maximum ${maxFiles} files reached`
                  : "Click to upload images or drag and drop"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB each
              </p>
            </label>
          </div>
        )}
      />

      {/* Error Message */}
      {errorMessage && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
