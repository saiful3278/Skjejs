"use client";
import React from "react";
import { useForm } from "react-hook-form";
import Input from "@/app/components/atoms/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "@/app/components/templates/MainLayout";
import { Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { useAppDispatch } from "@/app/hooks/state/useRedux";
import { setUser } from "@/app/store/slices/AuthSlice";

interface InputForm {
  email: string;
  password: string;
}

const SignIn = () => {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InputForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (formData: InputForm) => {
    setErrorMessage(null);
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    setIsLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    if (data.session) {
      const u = data.session.user;
      const meta = (u.user_metadata as any) || {};
      const rawRole =
        (typeof meta.role === "string" && meta.role) ||
        (typeof meta.user_role === "string" && meta.user_role) ||
        (typeof meta.role?.name === "string" && meta.role.name) ||
        undefined;
      const role = typeof rawRole === "string" ? rawRole.toUpperCase() : "USER";
      dispatch(
        setUser({
          user: {
            id: u.id,
            name: meta?.full_name || u.email || "User",
            email: u.email || "",
            role,
            avatar: meta?.avatar_url || null,
          },
        })
      );
      router.push("/");
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <main className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 text-center mb-6">
            Sign In
          </h2>

          {errorMessage && (
            <div className="bg-red-50 border border-red-300 text-red-600 text-center text-sm p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              name="email"
              type="text"
              placeholder="Email"
              control={control}
              validation={{ required: "Email is required" }}
              error={errors.email?.message}
              className="py-2.5 text-sm"
            />

            <Input
              name="password"
              type="password"
              placeholder="Password"
              control={control}
              validation={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters long",
                },
              }}
              error={errors.password?.message}
              className="py-2.5 text-sm"
            />

            <Link
              href="/password-reset"
              className="block text-sm text-indigo-600 hover:underline mb-4"
            >
              Forgot password?
            </Link>

            <button
              type="submit"
              className={`w-full py-2.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors ${
                isLoading ? "cursor-not-allowed bg-gray-400" : ""
              }`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-indigo-600 hover:underline">
              Sign up
            </Link>
          </div>

          {/* Testing Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              🧪 Testing Accounts
            </h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div>
                <strong>Superadmin:</strong> superadmin@example.com /
                password123
              </div>
              <div>
                <strong>Admin:</strong> admin@example.com / password123
              </div>
              <div>
                <strong>User:</strong> user@example.com / password123
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              These accounts have different permissions for testing various
              features.
            </p>
          </div>

          {/* OAuth removed: only email/password sign-in is available */}
        </main>
      </div>
    </MainLayout>
  );
};

export default SignIn;
