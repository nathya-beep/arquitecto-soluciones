import { defineConfig } from "vitest/config";
import path from "node:path";

// Resuelve el alias "@/..." (igual que tsconfig.json) para los tests que
// importan módulos de la app, p. ej. trimHistory desde la route de chat.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
