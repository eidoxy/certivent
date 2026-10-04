"use client";

import { useState } from "react";
import { AuthIllustration } from "@/components/auth-illustration";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthMode = "login" | "register";

const COPY: Record<AuthMode, { title: string; description: string }> = {
  login: { title: "Log in", description: "Use the email and password you signed up with." },
  register: {
    title: "Create your account",
    description: "You need an account to register for events and download certificates.",
  },
};

/**
 * One shared container holds both sides: illustration on the left, form on the right, split by a
 * divider. The container is a single <Card> directly in the root <main>, whose width and padding
 * match the navbar container, so its left and right edges line up with the navbar. Below lg it is a
 * single column and the illustration is hidden.
 *
 * The active mode is React state, so switching is instant. The URL follows the mode
 * (history.replaceState), so /login and /register still work as deep links. Routes, guards and both
 * forms' submit logic are unchanged.
 */
export function AuthPanel({ initialMode, callbackUrl }: { initialMode: AuthMode; callbackUrl: string }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  function changeMode(next: AuthMode) {
    setMode(next);
    const loginPath = callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    window.history.replaceState(null, "", next === "login" ? loginPath : "/register");
  }

  const { title, description } = COPY[mode];

  return (
    // The root <main> already has pt-24 (navbar clearance) and pb-8, so 8rem is subtracted to centre
    // the card in the space that is left without creating a vertical scrollbar.
    <div className="lg:flex lg:min-h-[calc(100dvh-8rem)] lg:items-center">
      {/* min-h keeps the card the same height in both modes, so toggling does not make it jump. */}
      <Card className="w-full gap-0 overflow-hidden rounded-2xl border border-neutral-200 py-0 shadow-md ring-0 lg:min-h-[37rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] dark:border-neutral-800 lg:grid">
        <AuthIllustration />

        <div className="flex min-w-0 flex-col justify-center border-neutral-200 p-6 sm:p-8 lg:border-l dark:border-neutral-800">
          <Tabs
            value={mode}
            onValueChange={(value) => changeMode(value === "register" ? "register" : "login")}
            className="gap-4"
          >
            <TabsList aria-label="Account" className="w-full group-data-horizontal/tabs:h-9">
              <TabsTrigger value="login" className="text-sm">
                Log in
              </TabsTrigger>
              <TabsTrigger value="register" className="text-sm">
                Sign up
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <TabsContent value="login">
              <LoginForm callbackUrl={callbackUrl} />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
