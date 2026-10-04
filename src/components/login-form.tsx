"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AUTH_FIELD_CLASS, AUTH_INPUT_CLASS, PasswordInput } from "@/components/auth-inputs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

// Form only. The card, heading and Login/Sign up toggle live in <AuthPanel>.
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      const res = await signIn("credentials", { email: values.email, password: values.password, redirect: false });
      if (res?.error) {
        setFormError("Invalid email or password");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
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
                autoComplete="current-password"
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
          Log in
        </Button>
      </FieldGroup>
    </form>
  );
}
