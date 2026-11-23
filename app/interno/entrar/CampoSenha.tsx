"use client";

import { useState } from "react";

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
export default function CampoSenha() {
  const [visivel, setVisivel] = useState(false);
  return (
    <label>
      Senha
      <span className="login-senha-wrap">
        <input name="pass" type={visivel ? "text" : "password"} autoComplete="current-password" required />
        <button
          type="button"
          className="login-senha-olho"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10 10 0 0112 6c5 0 9 6 9 6a15 15 0 01-2.6 3.1M6.6 6.6A15 15 0 003 12s4 6 9 6a9.7 9.7 0 004.4-1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </span>
    </label>
  );
}
