"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Input from "@/app/components/atoms/Input";
import Button from "@/app/components/atoms/Button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

const PasswordResetConfirmContent = () => {
  const { handleSubmit, control } = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    const supabase = getSupabaseClient();
    setIsLoading(true);
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setIsLoading(false);
      if (error) {
        setMessage(error.message);
        setIsError(true);
      }
    });
  }, [searchParams]);

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      setMessage("Passwords do not match");
      setIsError(true);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setMessage("Invalid reset link");
      setIsError(true);
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        setMessage("Password updated successfully! Redirecting to login...");
        setIsError(false);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch {
      setMessage("An error occurred. Please try again.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!searchParams.get("code")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-center block"
            >
              Request New Reset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              control={control}
              name="password"
              type="password"
              label="New Password"
              placeholder="Enter your new password"
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
            />

            <Input
              control={control}
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm your new password"
              rules={{
                required: "Please confirm your password",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirmContent;