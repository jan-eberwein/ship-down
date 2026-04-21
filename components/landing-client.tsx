"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type PendingState = "idle" | "creating" | "joining";

type CreateResponse = {
  roomCode: string;
  token: string;
  roomPath: string;
};

function persistToken(roomCode: string, token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`ship-down:${roomCode}`, token);
}

export function LandingClient() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState<PendingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => playerName.trim().length >= 2, [playerName]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Bitte gib einen Namen mit mindestens 2 Zeichen ein.");
      return;
    }

    setPending("creating");
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: playerName.trim() }),
      });
      const payload = (await response.json()) as CreateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Raum konnte nicht erstellt werden.");
      }

      persistToken(payload.roomCode, payload.token);
      router.push(payload.roomPath);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
      setPending("idle");
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Bitte gib zuerst deinen Namen ein.");
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      setError("Ein Raumcode besteht aus 6 Zeichen.");
      return;
    }

    setPending("joining");
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${normalizedCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: playerName.trim() }),
      });
      const payload = (await response.json()) as CreateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Beitritt nicht moeglich.");
      }

      persistToken(payload.roomCode, payload.token);
      router.push(payload.roomPath);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
      setPending("idle");
    }
  }

  return (
    <main className="screen landing-screen">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-card">
        <h1>Schiffe Versenken</h1>

        <div className="landing-grid">
          <form className="panel form-panel" onSubmit={handleCreate}>
            <h2>Neue Partie</h2>
            <label className="field">
              <span>Dein Name</span>
              <input
                maxLength={24}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="z. B. Jan"
                value={playerName}
              />
            </label>

            <button className="primary-button" disabled={pending !== "idle"} type="submit">
              {pending === "creating" ? "Raum wird gebaut..." : "Raum erstellen"}
            </button>
          </form>

          <form className="panel form-panel" onSubmit={handleJoin}>
            <h2>Bestehendem Raum beitreten</h2>
            <label className="field">
              <span>Raumcode</span>
              <input
                inputMode="text"
                maxLength={6}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                value={joinCode}
              />
            </label>

            <button className="secondary-button" disabled={pending !== "idle"} type="submit">
              {pending === "joining" ? "Trete bei..." : "Mitspielen"}
            </button>
          </form>
        </div>

        {error ? <p className="inline-error">{error}</p> : null}

      </section>
    </main>
  );
}
