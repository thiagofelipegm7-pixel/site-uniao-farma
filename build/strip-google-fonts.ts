import type { Plugin } from "vite";

const REMOTE_FONT = /@import\s+url\((['"]?)https:\/\/fonts\.googleapis\.com[^'"]*\1\)\s*;/g;

export function stripGoogleFonts(): Plugin {
  return {
    name: "strip-google-fonts",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("globals.css") || !REMOTE_FONT.test(code)) return null;
      return {
        code: code.replace(REMOTE_FONT, "/* remote Poppins import removed for LCP */"),
        map: null,
      };
    },
  };
}
