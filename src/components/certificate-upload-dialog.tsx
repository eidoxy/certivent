"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch, queryKeys } from "@/lib/api-client";
import { CERT_MAX_BYTES, CERT_MIME_TYPES } from "@/lib/constants";

type CertificateUploadDialogProps = {
  eventId: string;
  registrationId: string;
  participantName: string;
  hasCertificate: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type UploadResult = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  issuedAt: string;
};

const FILE_INPUT_ID = "certificate-file";
const FILE_ERROR_ID = "certificate-file-error";

/** Mirrors the server checks (steps 4 and 5) so obvious mistakes fail before the upload. The server stays authoritative. */
function checkFile(file: File): string | null {
  if (file.size === 0 || file.size > CERT_MAX_BYTES) return "File must be between 1 byte and 4 MB";
  if (!(CERT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Only PDF, PNG or JPEG files are allowed";
  }
  return null;
}

export function CertificateUploadDialog({
  eventId,
  registrationId,
  participantName,
  hasCertificate,
  open,
  onOpenChange,
}: CertificateUploadDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (selected: File) => {
      // No Content-Type here: apiFetch leaves it unset for FormData so the browser adds the multipart boundary.
      const body = new FormData();
      body.append("file", selected);
      return apiFetch<UploadResult>(`/api/admin/registrations/${registrationId}/certificate`, {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      toast.success("Certificate uploaded");
      resetForm();
      onOpenChange(false);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminEvent(eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() }),
      ]);
    },
    onError: (err) => setServerError(err.message),
  });

  function resetForm() {
    setFile(null);
    setFileError(null);
    setServerError(null);
  }

  function handleOpenChange(next: boolean) {
    // The upload cannot be cancelled once sent, so keep the dialog in place until it settles.
    if (mutation.isPending) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(selected ? checkFile(selected) : null);
    setServerError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!file) {
      setFileError("Choose a file to upload");
      return;
    }
    const problem = checkFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    setServerError(null);
    mutation.mutate(file);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{hasCertificate ? "Replace certificate" : "Upload certificate"}</DialogTitle>
          <DialogDescription className="wrap-break-word">
            PDF, PNG or JPEG, max 4 MB. Issued to {participantName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={FILE_INPUT_ID}>Certificate file</Label>
            <Input
              id={FILE_INPUT_ID}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              disabled={mutation.isPending}
              aria-invalid={fileError !== null}
              aria-describedby={fileError ? FILE_ERROR_ID : undefined}
            />
            {fileError && (
              <p id={FILE_ERROR_ID} className="text-sm text-destructive">
                {fileError}
              </p>
            )}
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || fileError !== null || mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {hasCertificate ? "Replace" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
