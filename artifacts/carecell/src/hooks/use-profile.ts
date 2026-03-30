import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchProfile() {
  const res = await fetch(`${BASE}/api/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

async function updateProfile(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json() as Promise<{ url: string; originalName: string; mimetype: string; size: number }>;
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile, staleTime: 30_000 });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadFile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
