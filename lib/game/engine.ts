import { BOARD_SIZE, FLEET } from "@/lib/game/constants";
import type {
  AttackRecord,
  BoardCellState,
  Orientation,
  PlayerSide,
  Point,
  PublicRoomState,
  PublicShipStatus,
  RoomPhase,
  RoomState,
  ShipPlacement,
} from "@/lib/game/types";

function pointToCoordinate(point: Point): string {
  return `${point.x},${point.y}`;
}

function coordinateToPoint(coordinate: string): Point {
  const [x, y] = coordinate.split(",").map(Number);
  return { x, y };
}

function isInsideBoard({ x, y }: Point): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomCode = "";

  for (let index = 0; index < 6; index += 1) {
    roomCode += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return roomCode;
}

export function createEmptyGrid(fill: BoardCellState): BoardCellState[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => fill),
  );
}

function cellsForPlacement(start: Point, orientation: Orientation, length: number): string[] {
  return Array.from({ length }, (_, index) => {
    const x = start.x + (orientation === "horizontal" ? index : 0);
    const y = start.y + (orientation === "vertical" ? index : 0);
    return pointToCoordinate({ x, y });
  });
}

function surroundingCoordinates(cells: string[]): string[] {
  const neighbors = new Set<string>();

  for (const cell of cells) {
    const point = coordinateToPoint(cell);

    for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        const candidate = { x: point.x + xOffset, y: point.y + yOffset };
        if (isInsideBoard(candidate)) {
          neighbors.add(pointToCoordinate(candidate));
        }
      }
    }
  }

  return [...neighbors];
}

function validatePlacements(placements: ShipPlacement[]): void {
  if (placements.length !== FLEET.length) {
    throw new Error("Es muessen genau 5 Schiffe platziert werden.");
  }

  const expectedKeys = unique(FLEET.map((ship) => ship.key)).sort();
  const providedKeys = unique(placements.map((ship) => ship.shipKey)).sort();

  if (expectedKeys.join(",") !== providedKeys.join(",")) {
    throw new Error("Die Flotte ist unvollstaendig oder enthaelt doppelte Schiffe.");
  }

  const occupied = new Set<string>();
  const blocked = new Set<string>();

  for (const definition of FLEET) {
    const placement = placements.find((item) => item.shipKey === definition.key);

    if (!placement) {
      throw new Error(`Das Schiff ${definition.label} fehlt.`);
    }

    if (placement.length !== definition.length) {
      throw new Error(`Das Schiff ${definition.label} hat die falsche Laenge.`);
    }

    const expectedCells = cellsForPlacement(
      placement.start,
      placement.orientation,
      placement.length,
    );

    if (expectedCells.join("|") !== placement.cells.join("|")) {
      throw new Error(`Die Felder fuer ${definition.label} passen nicht zur Ausrichtung.`);
    }

    for (const cell of placement.cells) {
      const point = coordinateToPoint(cell);
      if (!isInsideBoard(point)) {
        throw new Error("Alle Schiffe muessen vollstaendig innerhalb des Spielfelds liegen.");
      }

      if (occupied.has(cell)) {
        throw new Error("Schiffe duerfen sich nicht ueberlappen.");
      }

      if (blocked.has(cell)) {
        throw new Error("Schiffe duerfen sich auch diagonal nicht beruehren.");
      }
    }

    for (const cell of placement.cells) {
      occupied.add(cell);
    }

    for (const cell of surroundingCoordinates(placement.cells)) {
      if (!occupied.has(cell)) {
        blocked.add(cell);
      }
    }
  }
}

function inferPhase(room: RoomState): RoomPhase {
  const playerA = room.players.A;
  const playerB = room.players.B;

  if (!playerA) {
    return "waiting";
  }

  if (!playerB) {
    return playerA.readyAt ? "placement" : "waiting";
  }

  if (!playerA.readyAt || !playerB.readyAt) {
    return "placement";
  }

  if (room.winner) {
    return "finished";
  }

  return "battle";
}

export function createRoom(name: string): { room: RoomState; token: string; side: PlayerSide } {
  const now = new Date().toISOString();
  const token = generateToken();

  return {
    side: "A",
    token,
    room: {
      roomCode: generateRoomCode(),
      phase: "waiting",
      createdAt: now,
      updatedAt: now,
      players: {
        A: {
          name: name.trim(),
          token,
          joinedAt: now,
          board: {
            ships: [],
            shotsReceived: [],
          },
        },
      },
      moveHistory: [],
    },
  };
}

export function joinRoom(room: RoomState, name: string): { room: RoomState; token: string; side: PlayerSide } {
  if (room.players.B) {
    throw new Error("Dieser Raum ist bereits voll.");
  }

  const token = generateToken();
  const now = new Date().toISOString();

  room.players.B = {
    name: name.trim(),
    token,
    joinedAt: now,
    board: {
      ships: [],
      shotsReceived: [],
    },
  };
  room.updatedAt = now;
  room.phase = inferPhase(room);

  return { room, token, side: "B" };
}

export function findPlayerByToken(room: RoomState, token?: string | null): PlayerSide | undefined {
  if (!token) {
    return undefined;
  }

  if (room.players.A?.token === token) {
    return "A";
  }

  if (room.players.B?.token === token) {
    return "B";
  }

  return undefined;
}

function otherSide(side: PlayerSide): PlayerSide {
  return side === "A" ? "B" : "A";
}

function getShipStatusesForViewer(room: RoomState, side: PlayerSide): PublicShipStatus[] {
  const player = room.players[side];

  if (!player) {
    return FLEET.map((ship) => ({
      shipKey: ship.key,
      label: ship.label,
      length: ship.length,
      hits: 0,
      sunk: false,
    }));
  }

  const shotSet = new Set(player.board.shotsReceived);

  return FLEET.map((definition) => {
    const placement = player.board.ships.find((ship) => ship.shipKey === definition.key);
    const hits = placement ? placement.cells.filter((cell) => shotSet.has(cell)).length : 0;

    return {
      shipKey: definition.key,
      label: definition.label,
      length: definition.length,
      hits,
      sunk: hits === definition.length && definition.length > 0,
    };
  });
}

function hiddenShipStatuses(): PublicShipStatus[] {
  return FLEET.map((ship) => ({
    shipKey: ship.key,
    label: ship.label,
    length: ship.length,
    hits: 0,
    sunk: false,
  }));
}

function buildOwnBoard(room: RoomState, side?: PlayerSide): BoardCellState[][] {
  const grid = createEmptyGrid("water");

  if (!side) {
    return grid;
  }

  const player = room.players[side];
  if (!player) {
    return grid;
  }

  const shotSet = new Set(player.board.shotsReceived);

  for (const ship of player.board.ships) {
    const sunk = ship.cells.every((cell) => shotSet.has(cell));

    for (const cell of ship.cells) {
      const point = coordinateToPoint(cell);
      grid[point.y][point.x] = sunk ? "sunk" : shotSet.has(cell) ? "hit" : "ship";
    }
  }

  for (const shot of shotSet) {
    const point = coordinateToPoint(shot);
    if (grid[point.y][point.x] === "water") {
      grid[point.y][point.x] = "miss";
    }
  }

  return grid;
}

function buildTargetBoard(room: RoomState, side?: PlayerSide): BoardCellState[][] {
  const grid = createEmptyGrid("unknown");

  if (!side) {
    return grid;
  }

  const opponent = room.players[otherSide(side)];
  const yourShots = room.moveHistory.filter((move) => move.by === side);

  for (const move of yourShots) {
    const point = coordinateToPoint(move.coordinate);
    grid[point.y][point.x] = move.outcome === "miss" ? "miss" : move.outcome === "sunk" ? "sunk" : "hit";
  }

  if (!opponent) {
    return grid;
  }

  const sunkShips = opponent.board.ships.filter((ship) =>
    ship.cells.every((cell) =>
      yourShots.some((move) => move.coordinate === cell && move.outcome !== "miss"),
    ),
  );

  for (const ship of sunkShips) {
    for (const neighbor of surroundingCoordinates(ship.cells)) {
      const point = coordinateToPoint(neighbor);
      if (grid[point.y][point.x] === "unknown") {
        grid[point.y][point.x] = "blocked";
      }
    }

    for (const cell of ship.cells) {
      const point = coordinateToPoint(cell);
      grid[point.y][point.x] = "sunk";
    }
  }

  return grid;
}

export function sanitizeRoomForViewer(room: RoomState, viewerSide?: PlayerSide): PublicRoomState {
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    currentTurn: room.currentTurn,
    winner: room.winner,
    you: {
      side: viewerSide,
      name: viewerSide ? room.players[viewerSide]?.name : undefined,
      hasToken: Boolean(viewerSide),
      isReady: viewerSide ? Boolean(room.players[viewerSide]?.readyAt) : false,
    },
    players: {
      A: {
        joined: Boolean(room.players.A),
        name: room.players.A?.name,
        isReady: Boolean(room.players.A?.readyAt),
        shipStatuses: viewerSide === "A" ? getShipStatusesForViewer(room, "A") : hiddenShipStatuses(),
      },
      B: {
        joined: Boolean(room.players.B),
        name: room.players.B?.name,
        isReady: Boolean(room.players.B?.readyAt),
        shipStatuses: viewerSide === "B" ? getShipStatusesForViewer(room, "B") : hiddenShipStatuses(),
      },
    },
    ownBoard: buildOwnBoard(room, viewerSide),
    targetBoard: buildTargetBoard(room, viewerSide),
    lastMove: room.moveHistory.at(-1),
    moveCount: room.moveHistory.length,
    roomUrlPath: `/game/${room.roomCode}`,
  };
}

export function placeFleet(room: RoomState, side: PlayerSide, placements: ShipPlacement[]): RoomState {
  if (room.phase === "battle" || room.phase === "finished") {
    throw new Error("Die Platzierungsphase ist bereits abgeschlossen.");
  }

  const player = room.players[side];
  if (!player) {
    throw new Error("Spieler nicht gefunden.");
  }

  validatePlacements(placements);

  const now = new Date().toISOString();
  player.board.ships = placements;
  player.readyAt = now;
  room.updatedAt = now;

  const bothReady = Boolean(room.players.A?.readyAt && room.players.B?.readyAt);
  room.phase = inferPhase(room);

  if (bothReady && !room.currentTurn) {
    room.currentTurn = Math.random() > 0.5 ? "A" : "B";
    room.phase = "battle";
  }

  return room;
}

function lookupShipByCoordinate(room: RoomState, defendingSide: PlayerSide, coordinate: string): ShipPlacement | undefined {
  return room.players[defendingSide]?.board.ships.find((ship) => ship.cells.includes(coordinate));
}

function hasPlayerWon(room: RoomState, attackingSide: PlayerSide): boolean {
  const defender = room.players[otherSide(attackingSide)];
  if (!defender) {
    return false;
  }

  return defender.board.ships.every((ship) =>
    ship.cells.every((cell) => defender.board.shotsReceived.includes(cell)),
  );
}

export function attackCoordinate(room: RoomState, side: PlayerSide, coordinate: string): RoomState {
  if (room.phase !== "battle") {
    throw new Error("Das Spiel ist noch nicht in der Kampfphase.");
  }

  if (room.currentTurn !== side) {
    throw new Error("Du bist gerade nicht am Zug.");
  }

  const point = coordinateToPoint(coordinate);
  if (!isInsideBoard(point)) {
    throw new Error("Dieses Feld ist ungueltig.");
  }

  const defendingSide = otherSide(side);
  const defender = room.players[defendingSide];

  if (!defender) {
    throw new Error("Die Gegenseite fehlt noch.");
  }

  const duplicateShot = room.moveHistory.some(
    (move) => move.by === side && move.coordinate === coordinate,
  );

  if (duplicateShot) {
    throw new Error("Dieses Feld wurde bereits angegriffen.");
  }

  if (defender.board.shotsReceived.includes(coordinate)) {
    throw new Error("Dieses Feld wurde bereits getroffen.");
  }

  const ship = lookupShipByCoordinate(room, defendingSide, coordinate);
  defender.board.shotsReceived.push(coordinate);

  let outcome: AttackRecord["outcome"] = "miss";
  let targetShipKey: string | undefined;

  if (ship) {
    targetShipKey = ship.shipKey;
    const isSunk = ship.cells.every((cell) => defender.board.shotsReceived.includes(cell));
    outcome = isSunk ? "sunk" : "hit";
  }

  room.moveHistory.push({
    by: side,
    coordinate,
    outcome,
    targetShipKey,
    at: new Date().toISOString(),
  });

  room.updatedAt = new Date().toISOString();

  if (ship && hasPlayerWon(room, side)) {
    room.winner = side;
    room.phase = "finished";
    room.currentTurn = undefined;
    return room;
  }

  room.currentTurn = outcome === "miss" ? defendingSide : side;
  room.phase = inferPhase(room);

  return room;
}

export function ensureRoomFresh(room: RoomState): RoomState {
  room.phase = inferPhase(room);
  return room;
}

export function makePlacementFromInput(
  shipKey: string,
  orientation: Orientation,
  start: Point,
): ShipPlacement {
  const definition = FLEET.find((ship) => ship.key === shipKey);

  if (!definition) {
    throw new Error("Unbekannter Schiffstyp.");
  }

  return {
    shipKey,
    length: definition.length,
    orientation,
    start,
    cells: cellsForPlacement(start, orientation, definition.length),
  };
}
