import { AuthPanel } from "@/components/auth-panel";

export default function RegisterPage() {
  return <AuthPanel initialMode="register" callbackUrl="/" />;
}
