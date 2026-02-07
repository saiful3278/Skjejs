"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import AttributeForm from "./AttributeForm";
import AttributeAssignment from "./AttributeAssignment";
import DashboardHeader from "./DashboardHeader";
import AttributesBoardView from "./AttributesBoardView";
import { withAuth } from "@/app/components/HOC/WithAuth";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

const AttributesDashboard: React.FC = () => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttributes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from("attributes")
        .select(`
          *,
          values:attribute_values(*),
          categories:category_attributes(
            id,
            is_required,
            category:categories(id, name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data to match component expectations if needed
      const transformedAttributes = data?.map((attr) => ({
        ...attr,
        categories: attr.categories?.map((catAttr: any) => ({
          id: catAttr.id,
          isRequired: catAttr.is_required,
          category: catAttr.category,
        })),
      }));

      setAttributes(transformedAttributes || []);
    } catch (err: any) {
      console.error("Error loading attributes:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">
        Error loading attributes: {error}
      </div>
    );
  }

  return (
    <div className="p-6 min-w-full bg-gray-50 min-h-screen">
      <DashboardHeader />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Create Form */}
        <div className="lg:col-span-1">
          <AttributeForm onAttributeCreated={fetchAttributes} />
        </div>

        {/* Right Column - Assignment & List */}
        <div className="lg:col-span-2 space-y-6">
          <AttributeAssignment
            attributes={attributes}
            onAssignmentUpdated={fetchAttributes}
          />
        </div>
      </div>
      <AttributesBoardView
        attributes={attributes}
        onAttributeUpdated={fetchAttributes}
      />
    </div>
  );
};

export default withAuth(AttributesDashboard);
