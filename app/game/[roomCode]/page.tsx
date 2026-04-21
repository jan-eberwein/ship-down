import { GameRoomClient } from "@/components/game-room-client";

type GameRoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function GameRoomPage({ params }: GameRoomPageProps) {
  const { roomCode } = await params;

  return <GameRoomClient roomCode={roomCode.toUpperCase()} />;
}
