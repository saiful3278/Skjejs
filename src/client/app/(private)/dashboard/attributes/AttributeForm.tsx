"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import useToast from "@/app/hooks/ui/useToast";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { generateUniqueSlug } from "@/app/utils/slug";

interface AttributeFormProps {
  onAttributeCreated?: () => void;
}

const AttributeForm: React.FC<AttributeFormProps> = ({ onAttributeCreated }) => {
  const { showToast } = useToast();
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);

  const [newAttribute, setNewAttribute] = useState({
    name: "",
  });

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttribute.name.trim()) return;

    setIsCreatingAttribute(true);
    const supabase = getSupabaseClient();

    try {
      const slug = await generateUniqueSlug(supabase, "attributes", newAttribute.name);
      
      const { error } = await supabase.from("attributes").insert({
        name: newAttribute.name,
        slug,
      });

      if (error) throw error;

      showToast("Attribute created successfully", "success");
      setNewAttribute({ name: "" });
      if (onAttributeCreated) {
        onAttributeCreated();
      }
    } catch (err: any) {
      console.error("Error creating attribute:", err);
      showToast(err.message || "Failed to create attribute", "error");
    } finally {
      setIsCreatingAttribute(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Create New Attribute
      </h2>
      <form onSubmit={handleCreateAttribute} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Name
          </label>
          <input
            type="text"
            value={newAttribute.name}
            onChange={(e) =>
              setNewAttribute((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g., Color, Size, Material"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isCreatingAttribute || !newAttribute.name}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          {isCreatingAttribute ? "Creating..." : "Create Attribute"}
        </button>
      </form>
    </div>
  );
};

export default AttributeForm;
