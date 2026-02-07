"use client";
import { Minus, Plus } from "lucide-react";
import Button from "../atoms/Button";
import useToast from "@/app/hooks/ui/useToast";
import { useState } from "react";

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  itemId: string;
  onUpdate?: (id: string, quantity: number) => Promise<void>;
};

const QuantitySelector = ({
  value,
  onChange,
  itemId,
  onUpdate,
}: QuantitySelectorProps) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (newQty: number) => {
    if (newQty < 1 || newQty === value) return;

    onChange(newQty); // update form state
    
    if (onUpdate) {
      setIsLoading(true);
      try {
        await onUpdate(itemId, newQty);
      } catch (err: any) {
        const message = err.message || "Failed to update quantity";
        showToast(message, "error");
        onChange(value); // revert
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full max-w-fit border border-gray-300 bg-white px-2 py-1">
      <Button
        type="button"
        onClick={() => handleUpdate(value - 1)}
        disabled={isLoading || value <= 1}
        className="rounded-full p-2 transition hover:bg-gray-100 disabled:opacity-50"
      >
        <Minus size={16} />
      </Button>

      <span className="min-w-[32px] text-center font-semibold text-gray-800">
        {value}
      </span>

      <Button
        type="button"
        onClick={() => handleUpdate(value + 1)}
        disabled={isLoading}
        className="rounded-full p-2 transition hover:bg-gray-100 disabled:opacity-50"
      >
        <Plus size={16} />
      </Button>
    </div>
  );
};

export default QuantitySelector;
