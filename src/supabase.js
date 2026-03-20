import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getSessionId() {
  let id = localStorage.getItem("brief_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("brief_session_id", id);
  }
  return id;
}

export function hasSeenOnboarding() {
  return localStorage.getItem("brief_onboarding_done") === "true";
}

export function markOnboardingDone() {
  localStorage.setItem("brief_onboarding_done", "true");
}