"use client";
import { useEffect } from "react";
import NProgress from "nprogress";
import { usePathname } from "next/navigation";

const TopLoadingBar: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

    // Route change tracking (removed console.log to reduce noise)
    NProgress.start();

    // Simulate route change complete after a delay
    const timer = setTimeout(() => {
      // Route change completed (removed console.log to reduce noise)
      NProgress.done();
    }, 150); // Reduced from 400ms for snappier feel

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname]);

  return null;
};

export default TopLoadingBar;
