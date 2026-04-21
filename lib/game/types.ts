export type PlayerSide = "A" | "B";
export type Orientation = "horizontal" | "vertical";
export type RoomPhase = "waiting" | "placement" | "battle" | "finished";
export type AttackOutcome = "miss" | "hit" | "sunk";
export type BoardCellState =
  | "unknown"
  | "water"
  | "ship"
  | "miss"
  | "hit"
  | "sunk"
  | "blocked";

export type Point = {
  x: number;
  y: number;
};

export type ShipDefinition = {
  key: string;
  label: string;
  length: number;
};

export type ShipPlacement = {
  shipKey: string;
  length: number;
  orientation: Orientation;
  start: Point;
  cells: string[];
};

export type AttackRecord = {
  by: PlayerSide;
  coordinate: string;
  outcome: AttackOutcome;
  targetShipKey?: string;
  at: string;
};

export type PlayerBoardState = {
  ships: ShipPlacement[];
  shotsReceived: string[];
};

export type PlayerState = {
  name: string;
  token: string;
  board: PlayerBoardState;
  joinedAt: string;
  readyAt?: string;
};

export type RoomState = {
  roomCode: string;
  phase: RoomPhase;
  currentTurn?: PlayerSide;
  winner?: PlayerSide;
  createdAt: string;
  updatedAt: string;
  players: Partial<Record<PlayerSide, PlayerState>>;
  moveHistory: AttackRecord[];
};

export type PublicShipStatus = {
  shipKey: string;
  label: string;
  length: number;
  hits: number;
  sunk: boolean;
};

export type PublicRoomState = {
  roomCode: string;
  phase: RoomPhase;
  currentTurn?: PlayerSide;
  winner?: PlayerSide;
  you?: {
    side?: PlayerSide;
    name?: string;
    hasToken: boolean;
    isReady: boolean;
  };
  players: Record<
    PlayerSide,
    {
      joined: boolean;
      name?: string;
      isReady: boolean;
      shipStatuses: PublicShipStatus[];
    }
  >;
  ownBoard: BoardCellState[][];
  targetBoard: BoardCellState[][];
  lastMove?: AttackRecord;
  moveCount: number;
  roomUrlPath: string;
};
