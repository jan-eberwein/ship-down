"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Board } from "@/components/board";
import { FLEET } from "@/lib/game/constants";
import { makePlacementFromInput } from "@/lib/game/engine";
import type {
  BoardCellState,
  Orientation,
  PublicRoomState,
  ShipPlacement,
} from "@/lib/game/types";

type GameRoomClientProps = {
  roomCode: string;
};

type PendingAction = "idle" | "joining" | "placing" | "attacking";

type PlacementDraft = {
  shipKey: string;
  orientation: Orientation;
  start?: {
    x: number;
    y: number;
  };
};

function getStoredToken(roomCode: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(`ship-down:${roomCode}`);
}

function persistToken(roomCode: string, token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`ship-down:${roomCode}`, token);
}

function buildPlacementBoard(placements: ShipPlacement[]): BoardCellState[][] {
  const board: BoardCellState[][] = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => "water"),
  );

  for (const ship of placements) {
    for (const cell of ship.cells) {
      const [x, y] = cell.split(",").map(Number);
      board[y][x] = "ship";
    }
  }

  return board;
}

function placementsFromDrafts(drafts: PlacementDraft[]): ShipPlacement[] {
  return drafts
    .filter((draft): draft is PlacementDraft & { start: { x: number; y: number } } => Boolean(draft.start))
    .map((draft) => makePlacementFromInput(draft.shipKey, draft.orientation, draft.start));
}

function coordinateLabel(coordinate?: string): string {
  if (!coordinate) {
    return "-";
  }

  const [x, y] = coordinate.split(",").map(Number);
  const row = "ABCDEFGHIJ"[y] ?? "?";
  return `${row}${x + 1}`;
}

export function GameRoomClient({ roomCode }: GameRoomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<PublicRoomState | null>(null);
  const [joinName, setJoinName] = useState("");
  const [pending, setPending] = useState<PendingAction>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedShipKey, setSelectedShipKey] = useState<string>(FLEET[0].key);
  const [drafts, setDrafts] = useState<PlacementDraft[]>(
    FLEET.map((ship) => ({ shipKey: ship.key, orientation: "horizontal" })),
  );

  useEffect(() => {
    const fromQuery = searchParams.get("token");
    const stored = getStoredToken(roomCode);
    const chosenToken = fromQuery ?? stored;

    if (chosenToken) {
      persistToken(roomCode, chosenToken);
      setToken(chosenToken);
    }

    if (fromQuery) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, [roomCode, searchParams]);

  useEffect(() => {
    let active = true;

    async function loadRoom() {
      try {
        const url = token ? `/api/rooms/${roomCode}?token=${token}` : `/api/rooms/${roomCode}`;
        const response = await fetch(url, { cache: "no-store" });
        const payload = (await response.json()) as PublicRoomState & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Raum konnte nicht geladen werden.");
        }

        if (!active) {
          return;
        }

        setState(payload);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
      }
    }

    void loadRoom();
    const interval = window.setInterval(loadRoom, 1400);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [roomCode, token]);

  const localPlacements = useMemo(() => placementsFromDrafts(drafts), [drafts]);
  const placementBoard = useMemo(() => buildPlacementBoard(localPlacements), [localPlacements]);

  const selectedDraft = drafts.find((draft) => draft.shipKey === selectedShipKey);
  const isPlacementComplete = localPlacements.length === FLEET.length;
  const isMyTurn = Boolean(
    state?.you?.side &&
      state.phase === "battle" &&
      state.currentTurn === state.you.side,
  );
  const isReady = Boolean(state?.you?.isReady);
  const placementPreviewBoard = isReady ? state?.ownBoard ?? placementBoard : placementBoard;

  function mutateDraft(shipKey: string, updater: (current: PlacementDraft) => PlacementDraft) {
    setDrafts((current) =>
      current.map((draft) => (draft.shipKey === shipKey ? updater(draft) : draft)),
    );
  }

  function handlePlacementCellClick(x: number, y: number) {
    if (!selectedDraft) {
      return;
    }

    mutateDraft(selectedDraft.shipKey, (draft) => ({
      ...draft,
      start: { x, y },
    }));
    setError(null);
  }

  async function submitPlacement() {
    if (!token) {
      setError("Dir fehlt der Spielerzugang fuer diesen Raum.");
      return;
    }

    if (!isPlacementComplete) {
      setError("Bitte positioniere zuerst alle Schiffe.");
      return;
    }

    setPending("placing");
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          placements: drafts
            .filter((draft) => draft.start)
            .map((draft) => ({
              shipKey: draft.shipKey,
              orientation: draft.orientation,
              start: draft.start,
            })),
        }),
      });
      const payload = (await response.json()) as PublicRoomState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Platzierung fehlgeschlagen.");
      }

      setState(payload);
      setPending("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
      setPending("idle");
    }
  }

  async function handleAttack(x: number, y: number) {
    if (!token || !isMyTurn || pending !== "idle") {
      return;
    }

    setPending("attacking");
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          coordinate: `${x},${y}`,
        }),
      });
      const payload = (await response.json()) as PublicRoomState & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Angriff fehlgeschlagen.");
      }

      setState(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
    } finally {
      setPending("idle");
    }
  }

  async function joinRoom() {
    if (!joinName.trim()) {
      setError("Bitte gib zuerst deinen Namen ein.");
      return;
    }

    setPending("joining");
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const payload = (await response.json()) as
        | { token: string; roomCode: string; error?: string }
        | { error?: string };

      if (!response.ok || !("token" in payload)) {
        throw new Error(payload.error ?? "Beitritt fehlgeschlagen.");
      }

      persistToken(payload.roomCode, payload.token);
      setToken(payload.token);
      setJoinName("");
      setPending("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unbekannter Fehler.");
      setPending("idle");
    }
  }

  const opponentName = state?.you?.side === "A" ? state.players.B.name : state?.players.A.name;
  const ownName = state?.you?.side ? state.players[state.you.side].name : undefined;

  return (
    <main className="screen game-screen">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-c" />

      <section className="game-shell">
        <header className="topbar panel">
          <div>
            <h1>Raum: {roomCode}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="ghost-button"
              onClick={() => {
                const shareUrl = `${window.location.origin}/game/${roomCode}`;
                navigator.clipboard
                  .writeText(shareUrl)
                  .then(() => setError("Link kopiert."))
                  .catch(() => setError("Kopieren hat gerade nicht geklappt."));
              }}
              type="button"
            >
              Link kopieren
            </button>
            <button className="ghost-button" onClick={() => router.push("/")} type="button">
              Neuer Raum
            </button>
          </div>
        </header>

        {!state ? (
          <section className="panel status-panel">
            <div className="status-badge">Lade Raum...</div>
          </section>
        ) : (
          <>
            <section className="panel status-panel">
              <div className="status-stack">
                <div className={`status-badge phase-${state.phase}`}>
                  {state.phase === "waiting" ? "Warten" : state.phase === "placement" ? "Aufstellen" : state.phase === "battle" ? "Kampf" : "Ende"}
                </div>
                <p className="status-copy">
                  {state.phase === "waiting" && "Warten auf Spieler 2..."}
                  {state.phase === "placement" && "Platziere deine Schiffe."}
                  {state.phase === "battle" && (isMyTurn ? "Du bist dran!" : "Gegner ist dran.")}
                  {state.phase === "finished" && (state.winner === state.you?.side ? "Du hast gewonnen!" : "Gegner hat gewonnen.")}
                </p>
              </div>

              <div className="players-inline">
                <div className={`player-chip ${state.currentTurn === "A" ? "is-active-blue" : ""}`}>
                  <span>{state.players.A.name ?? "Wartet..."}</span>
                  <small>{state.players.A.isReady ? "Bereit" : "Nicht bereit"}</small>
                </div>
                <div className={`player-chip ${state.currentTurn === "B" ? "is-active-pink" : ""}`}>
                  <span>{state.players.B.name ?? "Freier Platz"}</span>
                  <small>{state.players.B.isReady ? "Bereit" : "Nicht bereit"}</small>
                </div>
              </div>
            </section>

            {!state.you?.hasToken && !state.players.B.joined ? (
              <section className="panel join-panel">
                <h2>Diesem Raum beitreten</h2>
                <div className="join-controls">
                  <input
                    maxLength={24}
                    onChange={(event) => setJoinName(event.target.value)}
                    placeholder="Dein Name"
                    value={joinName}
                  />
                  <button
                    className="primary-button"
                    disabled={pending !== "idle"}
                    onClick={() => void joinRoom()}
                    type="button"
                  >
                    {pending === "joining" ? "Trete bei..." : "Als zweite Seite beitreten"}
                  </button>
                </div>
              </section>
            ) : null}

            {!state.you?.hasToken && state.players.B.joined ? (
              <section className="panel spectator-panel">
                <h2>Dieser Raum ist bereits voll.</h2>
                <p>
                  Wenn das dein Spiel ist, oeffne den Raum auf demselben Geraet noch einmal oder
                  nutze den gespeicherten Spielerlink.
                </p>
              </section>
            ) : null}

            {state.you?.hasToken ? (
              <>
                {state.phase !== "battle" && state.phase !== "finished" ? (
                  <section className="placement-grid">
                    <section className="panel placement-panel">
                      <div className="board-header">
                        <h2>Flotte platzieren</h2>
                        <span>{ownName}</span>
                      </div>

                      <Board
                        board={placementPreviewBoard}
                        interactive={!isReady}
                        locked={pending === "placing" || isReady}
                        onCellClick={handlePlacementCellClick}
                        title="Dein Startfeld"
                      />

                      <div className="fleet-list">
                        {FLEET.map((ship) => {
                          const draft = drafts.find((item) => item.shipKey === ship.key);
                          const placed = Boolean(draft?.start);

                          return (
                          <button
                              className={`fleet-card ${selectedShipKey === ship.key ? "is-selected" : ""}`}
                              key={ship.key}
                              disabled={isReady}
                              onClick={() => setSelectedShipKey(ship.key)}
                              type="button"
                            >
                              <strong>{ship.label}</strong>
                              <span>{ship.length} Felder</span>
                              <small>{placed ? "Positioniert" : "Noch offen"}</small>
                            </button>
                          );
                        })}
                      </div>

                      {selectedDraft ? (
                        <div className="placement-toolbar">
                          <button
                            className="ghost-button"
                            disabled={isReady}
                            onClick={() =>
                              mutateDraft(selectedDraft.shipKey, (draft) => ({
                                ...draft,
                                orientation:
                                  draft.orientation === "horizontal" ? "vertical" : "horizontal",
                              }))
                            }
                            type="button"
                          >
                            Drehen: {selectedDraft.orientation === "horizontal" ? "Waagrecht" : "Senkrecht"}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={isReady}
                            onClick={() =>
                              mutateDraft(selectedDraft.shipKey, (draft) => ({
                                ...draft,
                                start: undefined,
                              }))
                            }
                            type="button"
                          >
                            Aktuelles Schiff zuruecksetzen
                          </button>
                          <button
                            className="primary-button"
                            disabled={pending !== "idle" || isReady}
                            onClick={() => void submitPlacement()}
                            type="button"
                          >
                            {isReady
                              ? "Flotte ist bestaetigt"
                              : pending === "placing"
                                ? "Speichere..."
                                : "Flotte bestaetigen"}
                          </button>
                        </div>
                      ) : null}
                    </section>
                  </section>
                ) : null}

                {state.phase === "battle" || state.phase === "finished" ? (
                  <section className="battle-grid">
                    <Board board={state.ownBoard} title="Deine Flotte" />
                    <Board
                      board={state.targetBoard}
                      interactive={isMyTurn}
                      locked={!isMyTurn || pending !== "idle" || state.phase === "finished"}
                      onCellClick={(x, y) => void handleAttack(x, y)}
                      title={`Zielerfassung gegen ${opponentName ?? "Gegenseite"}`}
                    />
                  </section>
                ) : null}

                <section className="bottom-grid">
                  <section className="panel telemetry-panel">
                    <h2>Status</h2>
                    <div className="telemetry-row">
                      <span>Zuege</span>
                      <strong>{state.moveCount}</strong>
                    </div>
                    <div className="telemetry-row">
                      <span>Letzter Schuss</span>
                      <strong>{coordinateLabel(state.lastMove?.coordinate)}</strong>
                    </div>
                    <div className="telemetry-row">
                      <span>Ergebnis</span>
                      <strong>{state.lastMove?.outcome ?? "-"}</strong>
                    </div>
                  </section>

                  <section className="panel telemetry-panel">
                    <h2>Schiffe</h2>
                    <div className="ship-status-list">
                      {state.you?.side
                        ? state.players[state.you.side].shipStatuses.map((ship) => (
                            <div className="ship-status-row" key={ship.shipKey}>
                              <span>{ship.label}</span>
                              <strong>
                                {ship.hits}/{ship.length} {ship.sunk ? "versenkt" : "intakt"}
                              </strong>
                            </div>
                          ))
                        : null}
                    </div>
                  </section>
                </section>
              </>
            ) : null}
          </>
        )}

        {error ? <div className="toast">{error}</div> : null}

        <footer className="footer-note">
          <Link href="/">Startseite</Link>
        </footer>
      </section>
    </main>
  );
}
