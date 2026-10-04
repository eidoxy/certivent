"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import type { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AUTH_FIELD_CLASS, AUTH_INPUT_CLASS, PasswordInput } from "@/components/auth-inputs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch } from "@/lib/api-client";
import { registerFormSchema } from "@/lib/validations/auth";

type RegisterFormValues = z.input<typeof registerFormSchema>;
type RegisterFieldName = keyof RegisterFormValues;

const FIELD_NAMES: readonly RegisterFieldName[] = ["name", "email", "password", "confirmPassword"];

// Form only. The card, heading and Login/Sign up toggle live in <AuthPanel>.
export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit({ name, email, password }: RegisterFormValues) {
    setFormError(null);
    try {
      await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_TAKEN") {
          form.setError("email", { message: err.message });
          return;
        }
        if (err.fieldErrors) {
          let mapped = false;
          for (const name of FIELD_NAMES) {
            const message = err.fieldErrors[name]?.[0];
            if (message) {
              form.setError(name, { message });
              mapped = true;
            }
          }
          if (mapped) return;
        }
        setFormError(err.message);
        return;
      }
      setFormError("Something went wrong. Please try again.");
      return;
    }

    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        toast.success("Account created. Please log in.");
        router.replace("/login");
        return;
      }
      router.replace("/events");
      router.refresh();
    } catch {
      toast.success("Account created. Please log in.");
      router.replace("/login");
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={AUTH_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                suppressHydrationWarning
                autoComplete="name"
                className={AUTH_INPUT_CLASS}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              />
              {fieldState.invalid && <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={AUTH_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                suppressHydrationWarning
                type="email"
                autoComplete="email"
                className={AUTH_INPUT_CLASS}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              />
              {fieldState.invalid && <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={AUTH_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <PasswordInput
                {...field}
                id={field.name}
                suppressHydrationWarning
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : `${field.name}-hint`}
              />
              {fieldState.invalid ? (
                <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
              ) : (
                <FieldDescription id={`${field.name}-hint`}>Use at least 8 characters.</FieldDescription>
              )}
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={AUTH_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
              <PasswordInput
                {...field}
                id={field.name}
                suppressHydrationWarning
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              />
              {fieldState.invalid && <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-10 w-full rounded-xl text-base font-semibold shadow-sm transition-all hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {submitting && <Spinner data-icon="inline-start" />}
          Sign up
        </Button>
      </FieldGroup>
    </form>
  );
}
