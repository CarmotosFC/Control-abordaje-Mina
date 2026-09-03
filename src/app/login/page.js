import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Iniciar sesión | Control de Abordaje" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
