"use client";

import { FormEvent, useState } from "react";

export function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Er ging iets mis");
        return;
      }
      setStatus("ok");
      setMessage(data.message ?? "Check je inbox.");
    } catch {
      setStatus("error");
      setMessage("Netwerkfout. Probeer het opnieuw.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="email-form">
      <label htmlFor="email" className="sr-only">
        E-mailadres
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="jij@voorbeeld.nl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="email-input"
      />
      <button type="submit" className="cta" disabled={status === "loading"}>
        {status === "loading" ? "Versturen…" : "Start met volgen"}
      </button>
      {message ? (
        <p className={`form-msg ${status === "error" ? "error" : "ok"}`} role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
