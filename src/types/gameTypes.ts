export interface GameState {
  [key: string]: any;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  role: string; // Змінено для гнучкості
  joinedAt: number;
  isOnline: boolean;
}
export interface PlayerTimer {
  totalTime: number; // Загальний час на гру (наприклад, 4 хв)
  turnTime: number; // Час на хід (наприклад, 22 сек)
  lastMoveTimestamp: number; // Коли почався відлік
}

export interface RolePermissions {
  canPlay: boolean;
  canChat: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canKickPlayers: boolean;
  canChangeSettings: boolean;
  canTransferAdmin: boolean;
  canViewGameState: boolean;
  canSpectate: boolean;
  [key: string]: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  gameType: string;
  players: Player[]; // Змінено з Map на Array
  spectators: Player[]; // Змінено з Map на Array
  adminId: string | null;
  maxPlayers: number;
  maxSpectators: number;
  isPrivate: boolean;
  password?: string;
  state: GameState;
  stateHistory: GameState[];
  redoStack: GameState[];
  chatHistory: ChatMessage[];
  settings: RoomSettings;
  rolePermissions: Record<string, RolePermissions>; // Змінено з Map на Record
  createdAt: number;
  lastActivity: number;
  status: RoomStatus;
  activeVote: VoteState;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  type: "message" | "system" | "action";
}

export interface RoomSettings {
  allowSpectators: boolean;
  allowChat: boolean;
  allowUndo: boolean;
  maxUndoSteps: number;
  autoCleanup: boolean;
  cleanupTimeout: number;
  warningTimeout?: number;
}

export type RoomStatus = "waiting" | "playing" | "paused" | "finished";

export interface VoteState {
  type: VoteType;
  voters: string[]; // ID гравців, які проголосували "ЗА"
}

export interface ServerToClientEvents {
  roomCreated: (data: { roomId: string; room: GameRoom }) => void;
  roomJoined: (data: { room: GameRoom; player: Player }) => void;
  roomLeft: (data: { roomId: string }) => void;
  roomUpdated: (data: { room: GameRoom }) => void;
  sessionRestored: (data: {
    room: GameRoom;
    player: Player;
    gameData: any;
  }) => void;
  gameStateUpdated: (data: {
    state: GameState;
    canUndo: boolean;
    canRedo: boolean;
  }) => void;
  chatMessage: (message: ChatMessage) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (data: { playerId: string; username: string }) => void;
  adminChanged: (data: { newAdminId: string; username: string }) => void;
  error: (data: { code: string; message: string; details?: any }) => void;
  rateLimited: (data: { message: string; retryAfter: number }) => void;
  gameStarted: (data: { roomId: string }) => void;
  inactivityWarning: (data: { message: string; timeLeft: number }) => void;
}

export interface ClientToServerEvents {
  createRoom: (
    data: CreateRoomData,
    callback: (response: CallbackResponse) => void
  ) => void;
  joinRoom: (
    data: JoinRoomData,
    callback: (response: CallbackResponse) => void
  ) => void;
  leaveRoom: (callback: (response: CallbackResponse) => void) => void;
  rejoinRoom: (
    data: { roomId: string; playerId: string; username: string },
    callback: (response: CallbackResponse) => void
  ) => void;
  // --- БУЛО: updateGameState ---
  // --- СТАЛО: makeMove ---
  makeMove: (data: any, callback: (response: CallbackResponse) => void) => void;
  updatePlayerData: (
    payload: {
      gameData: { username?: string; color?: string; [key: string]: any };
    },
    callback: (res: CallbackResponse) => void
  ) => void;
  sendChatMessage: (
    data: { text: string },
    callback: (response: CallbackResponse) => void
  ) => void;
  sendVote: (
    data: { type: VoteType },
    callback: (response: CallbackResponse) => void
  ) => void;
  undoMove: (callback: (response: CallbackResponse) => void) => void;
  redoMove: (callback: (response: CallbackResponse) => void) => void;
  updateRoomSettings: (
    data: Partial<RoomSettings>,
    callback: (response: CallbackResponse) => void
  ) => void;
  updateRolePermissions: (
    data: { role: string; permissions: Partial<RolePermissions> },
    callback: (response: CallbackResponse) => void
  ) => void;
  kickPlayer: (
    data: { playerId: string },
    callback: (response: CallbackResponse) => void
  ) => void;
  transferAdmin: (
    data: { playerId: string },
    callback: (response: CallbackResponse) => void
  ) => void;
  heartbeat: (callback: (response: CallbackResponse) => void) => void;
  startGame: (callback: (response: CallbackResponse) => void) => void;
}

export interface CreateRoomData {
  name: string;
  gameType: string;
  maxPlayers: number;
  maxSpectators?: number;
  isPrivate?: boolean;
  password?: string;
  initialState: GameState;
  settings?: Partial<RoomSettings>;
  rolePermissions?: Record<string, Partial<RolePermissions>>;
  username: string;
}

export interface JoinRoomData {
  roomId: string;
  username: string;
  password?: string;
  asSpectator?: boolean;
}

export interface CallbackResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
export type VoteType = "restart" | "draw" | "pause";
