import { useAppDispatch } from "@/app/store/hooks";
import { logout, setUser } from "@/app/store/slices/AuthSlice";
import { useEffect } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    const applySession = (session: any) => {
      if (!active) return;
      if (session?.user) {
        const u = session.user;
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
      } else {
        dispatch(logout());
      }
    };

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        applySession(data.session);
      } catch {
        if (active) dispatch(logout());
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
