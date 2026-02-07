"use client";
import React from "react";
import { useForm } from "react-hook-form";
import Input from "@/app/components/atoms/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PasswordField from "@/app/components/molecules/PasswordField";
import { z } from "zod";
import MainLayout from "@/app/components/templates/MainLayout";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { useAppDispatch } from "@/app/hooks/state/useRedux";
import { setUser } from "@/app/store/slices/AuthSlice";

interface InputForm {
  name: string;
  email: string;
  password: string;
}

const nameSchema = (value: string) => {
  const result = z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .safeParse(value);
  return result.success || result.error.errors[0].message;
};

const emailSchema = (value: string) => {
  const result = z.string().email("Invalid email address").safeParse(value);
  return result.success || result.error.errors[0].message;
};

const Signup = () => {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    register,
    watch,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InputForm>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (formData: InputForm) => {
    setErrorMessage(null);
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: formData.name },
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    });
    setIsLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        setErrorMessage("Too many sign-up attempts. Please try again later.");
      } else {
        setErrorMessage(error.message);
      }
      return;
    }
    // If email confirmation is enabled, user may need to verify before sign-in.
    if (data.user) {
      dispatch(
        setUser({
          user: {
            id: data.user.id,
            name: formData.name || data.user.email || "User",
            email: data.user.email || "",
            role: "user",
            avatar: null,
          },
        })
      );
    }
    router.push("/");
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <main className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 text-center mb-6">
            Sign Up
          </h2>

          {errorMessage && (
            <div className="bg-red-50 border border-red-300 text-red-600 text-center text-sm p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              name="name"
              type="text"
              placeholder="Name"
              control={control}
              validation={{
                required: "Name is required",
                validate: nameSchema,
              }}
              error={errors.name?.message}
              className="py-2.5 text-sm"
            />

            <Input
              name="email"
              type="text"
              placeholder="Email"
              control={control}
              validation={{
                required: "Email is required",
                validate: emailSchema,
              }}
              error={errors.email?.message}
              className="py-2.5 text-sm"
            />

            <PasswordField register={register} watch={watch} errors={errors} />

            <button
              type="submit"
              className={`w-full py-2.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors ${
                isLoading ? "cursor-not-allowed bg-gray-400" : ""
              }`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-indigo-600 hover:underline">
              Sign in
            </Link>
          </div>

          {/* OAuth removed: only email/password sign-up is available */}
        </main>
      </div>
    </MainLayout>
  );
};

export default Signup;
