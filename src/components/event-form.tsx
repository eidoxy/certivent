"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, queryKeys, type AdminEvent } from "@/lib/api-client";
import {
  eventFormSchema,
  eventToFormValues,
  formToEventInput,
  type EventFormValues,
} from "@/lib/validations/event";

type EventFormProps = { mode: "create" } | { mode: "edit"; eventId: string };

const EMPTY_VALUES: EventFormValues = {
  title: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  registrationDeadline: "",
  capacity: "",
  isPublished: false,
};

const FORM_FIELDS = Object.keys(eventFormSchema.shape) as Array<keyof EventFormValues>;

function isFormField(name: string): name is keyof EventFormValues {
  return (FORM_FIELDS as string[]).includes(name);
}

export function EventForm(props: EventFormProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {props.mode === "create" ? "New event" : "Edit event"}
      </h1>
      {props.mode === "create" ? (
        <EventFormFields mode="create" initialValues={EMPTY_VALUES} />
      ) : (
        <EditEventLoader eventId={props.eventId} />
      )}
    </div>
  );
}

function EditEventLoader({ eventId }: { eventId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.adminEvent(eventId),
    queryFn: () => apiFetch<AdminEvent>(`/api/admin/events/${eventId}`),
  });

  if (isPending) return <EventFormSkeleton />;

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load this event</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError
            ? error.message
            : "The server could not be reached. Check your connection and try again."}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Spinner data-icon="inline-start" />}
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  // The form mounts only once the event is loaded, so its defaults are the stored values.
  return <EventFormFields mode="edit" eventId={eventId} initialValues={eventToFormValues(data)} />;
}

function FieldSkeleton({ inputClassName = "h-8" }: { inputClassName?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={`w-full ${inputClassName}`} />
    </div>
  );
}

/** Loading placeholder with the same silhouette as the form. */
function EventFormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <p role="status" className="sr-only">
        Loading event
      </p>
      <div aria-hidden="true" className="flex flex-col gap-5">
        <FieldSkeleton />
        <FieldSkeleton inputClassName="h-32" />
        <FieldSkeleton />
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton />
        <FieldSkeleton />
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-[18.4px] w-[32px] rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

type FieldsProps = { initialValues: EventFormValues } & (
  | { mode: "create" }
  | { mode: "edit"; eventId: string }
);

function EventFormFields(props: FieldsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: props.initialValues,
  });

  const save = useMutation({
    mutationFn: (values: EventFormValues) => {
      const body = JSON.stringify(formToEventInput(values));
      return props.mode === "create"
        ? apiFetch<AdminEvent>("/api/admin/events", { method: "POST", body })
        : apiFetch<AdminEvent>(`/api/admin/events/${props.eventId}`, { method: "PATCH", body });
    },
    onSuccess: () => {
      toast.success(props.mode === "create" ? "Event created" : "Event saved");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["event"] });
      router.push("/admin/events");
    },
    onError: (err) => {
      let mapped = false;
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [name, messages] of Object.entries(err.fieldErrors)) {
          const message = messages[0];
          if (message && isFormField(name)) {
            form.setError(name, { type: "server", message }, { shouldFocus: !mapped });
            mapped = true;
          }
        }
      }
      if (!mapped) toast.error(err.message);
    },
  });

  const pending = save.isPending;

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
      <FieldGroup className="gap-8">
        <FieldSet>
          <FieldLegend>Details</FieldLegend>
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                  <Input {...field} id={field.name} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea {...field} id={field.name} rows={6} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="location"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                  <Input {...field} id={field.name} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Schedule</FieldLegend>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="startsAt"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Starts at</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="datetime-local"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="endsAt"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Ends at</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="datetime-local"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="registrationDeadline"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Registration deadline</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="datetime-local"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={`${field.name}-description`}
                  />
                  <FieldDescription id={`${field.name}-description`}>
                    Optional. Defaults to the event start.
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Registration</FieldLegend>
          <FieldGroup>
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Capacity</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={`${field.name}-description`}
                  />
                  <FieldDescription id={`${field.name}-description`}>Leave empty for unlimited.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="isPublished"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                  <div className="flex flex-1 flex-col gap-1">
                    <FieldLabel htmlFor={field.name}>Published</FieldLabel>
                    <FieldDescription id={`${field.name}-description`}>
                      Draft events are hidden from participants.
                    </FieldDescription>
                  </div>
                  <Switch
                    id={field.name}
                    name={field.name}
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-describedby={`${field.name}-description`}
                    aria-invalid={fieldState.invalid}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {props.mode === "create" ? "Create event" : "Save changes"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/admin/events" />}
          >
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
