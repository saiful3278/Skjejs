const DEV_API_URL =
  process.env.NEXT_PUBLIC_DEV_API_URL || "http://localhost:5000";
const PROD_API_URL = process.env.NEXT_PUBLIC_PROD_API_URL || "";
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || DEV_API_URL || PROD_API_URL;
export const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || API_BASE_URL;
export const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || `${API_BASE_URL}/api/v1/graphql`;
