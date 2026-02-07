"use client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import Toast from "./components/feedback/Toast";
import AuthProvider from "./components/HOC/AuthProvider";
import TopLoadingBar from "./components/feedback/TopLoadingBar";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopLoadingBar />
      <Provider store={store}>
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV !== "test" && <Toast />}
      </Provider>
    </>
  );
}
