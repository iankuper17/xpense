"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

export async function login(formData: FormData) {
  const supabase = createClient();

  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    console.error("Login error:", error.message);
    return { error: "Credenciales incorrectas. Intenta de nuevo." };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const supabase = createClient();

  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
      },
    },
  });

  if (error) {
    console.error("Register error:", error.message);
    if (error.message.includes("already registered")) {
      return { error: "Este email ya está registrado." };
    }
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  redirect("/onboarding");
}

export async function loginWithGoogle() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      scopes: "openid email profile",
    },
  });

  if (error) {
    console.error("Google login error:", error.message);
    return { error: "No se pudo iniciar sesión con Google." };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
