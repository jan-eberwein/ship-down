"use client";

import { Fragment } from "react";
import type { BoardCellState } from "@/lib/game/types";

type BoardProps = {
  board: BoardCellState[][];
  interactive?: boolean;
  title: string;
  locked?: boolean;
  onCellClick?: (x: number, y: number) => void;
};

const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function Board({ board, interactive, title, locked, onCellClick }: BoardProps) {
  return (
    <section className="panel board-panel">
      <div className="board-header">
        <h3>{title}</h3>
        <span>{locked ? "Gesperrt" : interactive ? "Tippen zum Spielen" : "Live"}</span>
      </div>

      <div className={`board-shell ${locked ? "is-locked" : ""}`}>
        <div className="board board-labels">
          <div className="corner" />
          {Array.from({ length: 10 }, (_, column) => (
            <div className="axis-label" key={`column-${column}`}>
              {column + 1}
            </div>
          ))}

          {board.map((row, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              <div className="axis-label" key={`row-label-${rowIndex}`}>
                {rowLabels[rowIndex]}
              </div>
              {row.map((cell, columnIndex) => {
                const disabled = !interactive || locked;

                return (
                  <button
                    className={`cell state-${cell}`}
                    disabled={disabled}
                    key={`${rowIndex}-${columnIndex}`}
                    onClick={() => onCellClick?.(columnIndex, rowIndex)}
                    type="button"
                  >
                    <span className="cell-core" />
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
