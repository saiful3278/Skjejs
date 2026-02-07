"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import useToast from "@/app/hooks/ui/useToast";
import Dropdown from "@/app/components/molecules/Dropdown";
import CategoryAssignmentSection from "./CategoryAssignment";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

interface Attribute {
  id: string;
  name: string;
}

interface AssignFormData {
  attributeId: string;
  categoryId: string;
  productId: string;
  isRequired: boolean;
}

interface AttributeAssignmentProps {
  attributes: Attribute[];
  onAssignmentUpdated?: () => void;
}

const AttributeAssignment: React.FC<AttributeAssignmentProps> = ({
  attributes,
  onAssignmentUpdated,
}) => {
  const { showToast } = useToast();
  const { control, handleSubmit, watch, setValue } = useForm<AssignFormData>({
    defaultValues: {
      attributeId: "",
      categoryId: "",
      productId: "",
      isRequired: false,
    },
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [isAssigningToCategory, setIsAssigningToCategory] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from("categories").select("id, name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const attributeOptions =
    attributes?.map((attr) => ({
      label: attr.name,
      value: attr.id,
    })) || [];

  const categoryOptions =
    categories.map((cat: any) => ({
      label: cat.name,
      value: cat.id,
    })) || [];

  const onAssignToCategory = async (data: AssignFormData) => {
    if (!data.attributeId || !data.categoryId) {
      showToast("Please select an attribute and category", "error");
      return;
    }

    setIsAssigningToCategory(true);
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase.from("category_attributes").insert({
        category_id: data.categoryId,
        attribute_id: data.attributeId,
        is_required: data.isRequired,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Attribute is already assigned to this category");
        }
        throw error;
      }

      showToast("Attribute assigned to category successfully", "success");
      setValue("categoryId", "");
      setValue("isRequired", false);
      if (onAssignmentUpdated) {
        onAssignmentUpdated();
      }
    } catch (err: any) {
      console.error("Error assigning to category:", err);
      showToast(err.message || "Failed to assign attribute to category", "error");
    } finally {
      setIsAssigningToCategory(false);
    }
  };

  const handleAttributeChange = (value: string | null) => {
    setValue("attributeId", value || "");
    setValue("categoryId", "");
    setValue("productId", "");
    setValue("isRequired", false);
  };

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Assign Attributes
        </h2>
        <p className="text-sm text-gray-600">
          Select an attribute and assign it to categories or products
        </p>
      </div>

      <div className="space-y-6">
        {/* Attribute Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Attribute
          </label>
          <Controller
            name="attributeId"
            control={control}
            render={({ field }) => (
              <Dropdown
                options={attributeOptions}
                value={field.value}
                onChange={handleAttributeChange}
                label="Choose an attribute"
              />
            )}
          />
        </div>

        {/* Assignment Sections */}
        {watch("attributeId") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryAssignmentSection
              control={control}
              handleSubmit={handleSubmit}
              onAssignToCategory={onAssignToCategory}
              categoryOptions={categoryOptions}
              isAssigningToCategory={isAssigningToCategory}
              watch={watch}
            />
          </div>
        )}

        {!watch("attributeId") && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Please select an attribute to view assignment options
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttributeAssignment;
