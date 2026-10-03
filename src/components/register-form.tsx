"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import type { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, apiFetch } from "@/lib/api-client";
import { registerFormSchema } from "@/lib/validations/auth";

type RegisterFormValues = z.input<typeof registerFormSchema>;
type RegisterFieldName = keyof RegisterFormValues;

const FIELD_NAMES: readonly RegisterFieldName[] = ["name", "email", "password", "confirmPassword"];

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
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        </CardTitle>
        <CardDescription>You need an account to register for events and download certificates.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input {...field} id={field.name} autoComplete="name" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Sign up
            </Button>
          </FieldGroup>
        </CardContent>
      </form>
      <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
        Already have an account?
        <Button variant="link" className="h-auto px-0" nativeButton={false} render={<Link href="/login" />}>
          Log in
        </Button>
      </CardFooter>
    </Card>
  );
}
