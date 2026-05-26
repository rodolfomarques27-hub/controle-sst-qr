import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("VITE_SUPABASE_URL:", supabaseUrl);
console.log("VITE_SUPABASE_ANON_KEY existe:", Boolean(supabaseAnonKey));

if (!supabaseUrl) {
    throw new Error(
        "VITE_SUPABASE_URL não encontrada. Confira se o arquivo .env está na raiz do projeto e se a variável começa com VITE_"
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        "VITE_SUPABASE_ANON_KEY não encontrada. Confira se o arquivo .env está na raiz do projeto e se a variável começa com VITE_"
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);