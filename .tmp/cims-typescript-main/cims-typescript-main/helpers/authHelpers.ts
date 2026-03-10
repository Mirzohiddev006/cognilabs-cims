// helpers for forms: serialization + validation

export function serializeRegisterForm(form: FormData) {
  return {
    email: form.get("email")?.toString().trim() || "",
    name: form.get("name")?.toString().trim() || "",
    surname: form.get("surname")?.toString().trim() || "",
    password: form.get("password")?.toString() || "",
    confirm: form.get("confirm")?.toString() || "",
    company_code: form.get("company_code")?.toString().trim() || "",
    telegram_id: form.get("telegram_id")?.toString().trim() || "",
    role: form.get("role")?.toString() || "Customer",
  };
}

export function validateRegister(
  values: ReturnType<typeof serializeRegisterForm>
): string | null {
  if (!values.email) return "Email is required.";
  if (!values.name) return "Name is required.";
  if (!values.surname) return "Surname is required.";
  if (!values.password) return "Password is required.";
  if (values.password.length < 6) return "Password must be at least 6 characters.";
  if (values.password !== values.confirm) return "Passwords do not match.";
  
  if (!/^\S+@\S+\.\S+$/.test(values.email)) return "Email is invalid.";
  return null;
}

export function validateLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}): string | null {
  if (!email) return "Email is required.";
  if (!password) return "Password is required.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Email is invalid.";
  return null;
}

// ✅ Authentication helper
const TOKEN_KEY = "token";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}
