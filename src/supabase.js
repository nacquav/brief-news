console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "found" : "MISSING");

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