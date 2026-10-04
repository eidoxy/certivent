"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Class for the <Field> wrapper in the auth forms.
 *
 * <Field> (vertical) ships with `*:w-full`, which forces width: 100% on EVERY child. Password managers
 * and autofill extensions insert their own elements next to an input (for example an absolutely
 * positioned <shark-icon-container>). Such an element is positioned against the page, not the card, so
 * `width: 100%` makes it as wide as the whole page starting from the input's left edge, and the card's
 * overflow-hidden cannot clip it. That is what produced the page-wide horizontal scrollbar. `*:w-auto`
 * stops Field from sizing children it does not own. Our own children still fill the row: a flex column
 * stretches auto-width children, and Input and InputGroup carry their own w-full.
 */
export const AUTH_FIELD_CLASS = "gap-1.5 *:w-auto";

/**
 * Shared field look for the auth forms: rounded-xl, neutral border, solid primary focus ring.
 * Text stays 16px on small screens so iOS Safari does not zoom the page when a field is focused.
 */
export const AUTH_INPUT_CLASS =
  "h-10 rounded-xl border-neutral-300 bg-transparent px-4 py-2 text-base transition-all md:text-sm dark:border-neutral-700 dark:bg-transparent focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive";

/** Password field with a show/hide button inside the input. The button is a real <button>, so Tab and Space/Enter work. */
export function PasswordInput({
  className,
  id,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className="h-10 rounded-xl border-neutral-300 dark:border-neutral-700 dark:bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-primary">
      <InputGroupInput
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={cn("h-full px-4 text-base md:text-sm", className)}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
