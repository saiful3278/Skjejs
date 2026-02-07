"use client";
import MainLayout from "@/app/components/templates/MainLayout";
import { withAuth } from "@/app/components/HOC/WithAuth";
import Link from "next/link";

const SupportPage = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="font-semibold text-2xl mb-3">Support</h2>
          <p className="text-gray-600 mb-6">
            Live chat and calls are currently disabled. For assistance, please
            reach out via our support page.
          </p>
          <Link
            href="/support"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Support
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default withAuth(SupportPage);
