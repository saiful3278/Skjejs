"use client";

const useFormatPrice = () => {
  const formatPrice = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(amount);
    return formatted.replace("MYR", "RM");
  };

  return formatPrice;
};

export default useFormatPrice;
