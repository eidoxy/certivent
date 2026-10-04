import { AuthPanel } from "@/components/auth-panel";

/** Accept only same-origin relative paths: must start with "/" and not "//" or "/\". */
function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  return "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return <AuthPanel initialMode="login" callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
