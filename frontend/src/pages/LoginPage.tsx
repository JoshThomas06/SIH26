import OperatorAccessGate from "@/components/ui/modern-login-signup";
import { getToken } from "@/lib/auth";
import { Navigate } from "react-router-dom";

export default function LoginPage() {
  if (getToken()) return <Navigate to="/" replace />;
  return <OperatorAccessGate />;
}
