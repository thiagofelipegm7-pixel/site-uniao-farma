// Deixa o Node (strip-types) abrir imports sem extensão entre arquivos .ts do app, como o Vite/TypeScript fazem.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error && error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    throw error;
  }
}`),
);
