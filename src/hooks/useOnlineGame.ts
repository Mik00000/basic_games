"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import type {
  GameState,
  Player,
  GameRoom,
  ChatMessage,
  CreateRoomData,
  JoinRoomData,
  CallbackResponse,
  ServerToClientEvents,
  ClientToServerEvents,
  RolePermissions,
} from "../types/gameTypes"

interface UseOnlineGameOptions {
  serverUrl?: string
  autoReconnect?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface UseOnlineGameReturn<T extends GameState> {
  isConnected: boolean
  isConnecting: boolean
  socketId: string | null
  currentRoom: Partial<GameRoom> | null
  currentPlayer: Player | null
  gameState: T | null
  canUndo: boolean
  canRedo: boolean
  chatMessages: ChatMessage[]
  error: string | null
  isRateLimited: boolean
  createRoom: (data: Omit<CreateRoomData, "initialState"> & { initialState: T }) => Promise<CallbackResponse>
  joinRoom: (data: JoinRoomData) => Promise<CallbackResponse>
  leaveRoom: () => Promise<CallbackResponse>
  makeMove: (moveData: any) => Promise<CallbackResponse>
  sendChatMessage: (text: string) => Promise<CallbackResponse>
  undoMove: () => Promise<CallbackResponse>
  redoMove: () => Promise<CallbackResponse>
  updateRolePermissions: (role: string, permissions: Partial<RolePermissions>) => Promise<CallbackResponse>
  clearError: () => void
  reconnect: () => void
  disconnect: () => void
}

export function useOnlineGame<T extends GameState = GameState>(
  options: UseOnlineGameOptions = {},
): UseOnlineGameReturn<T> {
  const {
    serverUrl = process.env.REACT_APP_SOCKET_SERVER_URL || "http://localhost:3001",
    autoReconnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [socketId, setSocketId] = useState<string | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Partial<GameRoom> | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [gameState, setGameState] = useState<T | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!socketRef.current) {
      setIsConnecting(true)

      const socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: autoReconnect,
        reconnectionAttempts,
        reconnectionDelay,
        timeout: 20000,
      })

      socketRef.current = socket

      socket.on("connect", () => {
        console.log("🔌 Connected to server")
        setIsConnected(true)
        setIsConnecting(false)
        setSocketId(socket.id || null)
        setError(null)
      })

      socket.on("disconnect", (reason) => {
        console.log("🔌 Disconnected from server:", reason)
        setIsConnected(false)
        setSocketId(null)
        if (reason === "io server disconnect") socket.connect()
      })

      socket.on("connect_error", (error) => {
        console.error("🔌 Connection error:", error)
        setIsConnecting(false)
        setError(`Connection failed: ${error.message}`)
      })

      socket.on("roomCreated", ({ roomId, room }) => {
        setCurrentRoom(room)
        setGameState(room.state as T)
        setChatMessages(room.chatHistory || [])
      })

      socket.on("roomJoined", ({ room, player }) => {
        setCurrentRoom(room)
        setCurrentPlayer(player)
        setGameState(room.state as T)
        setChatMessages(room.chatHistory || [])
      })

      // <--- НОВЕ: Обробка відновлення сесії
      socket.on("sessionRestored", ({ room, player, gameData }) => {
        console.log("🔄 Session restored successfully")
        setCurrentRoom(room)
        setCurrentPlayer(player)
        setGameState(room.state as T)
        setChatMessages(room.chatHistory || [])
        // Якщо потрібно відновити локальні дані гри, можна використати gameData
      })

      socket.on("roomLeft", ({ roomId }) => {
        setCurrentRoom(null)
        setCurrentPlayer(null)
        setGameState(null)
        setChatMessages([])
        setCanUndo(false)
        setCanRedo(false)
        localStorage.removeItem("game_session") // Очищаємо сесію при виході
      })

      socket.on("roomUpdated", ({ room }) => {
        setCurrentRoom(room)
        if (room.state) setGameState(room.state as T)
      })

      socket.on("gameStateUpdated", ({ state, canUndo: canUndoState, canRedo: canRedoState }) => {
        setGameState(state as T)
        setCanUndo(canUndoState)
        setCanRedo(canRedoState)
      })

      socket.on("playerJoined", (player) => console.log("👤 Player joined:", player.username))
      socket.on("playerLeft", ({ username }) => console.log("👤 Player left:", username))
      socket.on("adminChanged", ({ username }) => console.log("👑 New admin:", username))
      
      socket.on("chatMessage", (message) => setChatMessages((prev) => [...prev, message]))
      
      socket.on("error", ({ code, message }) => {
        console.error("❌ Server error:", code, message)
        setError(`${code}: ${message}`)
      })

      socket.on("rateLimited", ({ message, retryAfter }) => {
        setError(message)
        setIsRateLimited(true)
        setTimeout(() => setIsRateLimited(false), retryAfter * 1000)
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [serverUrl, autoReconnect, reconnectionAttempts, reconnectionDelay])

  // <--- НОВЕ: Логіка автоматичного реконнекту
  useEffect(() => {
    // Якщо ми підключені, але ще не в кімнаті, пробуємо відновити сесію
    if (isConnected && !currentRoom && !currentPlayer) {
      const savedSession = localStorage.getItem("game_session")
      if (savedSession) {
        try {
          const { roomId, playerId, username } = JSON.parse(savedSession)
          console.log("🔄 Attempting to rejoin session:", roomId)
          
          socketRef.current?.emit("rejoinRoom", { roomId, playerId, username }, (response) => {
            if (!response.success) {
              console.warn("❌ Rejoin failed:", response.error)
              localStorage.removeItem("game_session") // Сесія невалідна, видаляємо
            }
          })
        } catch (e) {
          localStorage.removeItem("game_session")
        }
      }
    }
  }, [isConnected, currentRoom, currentPlayer])

  // <--- НОВЕ: Збереження сесії при успішному вході
  useEffect(() => {
    if (currentRoom?.id && currentPlayer?.id) {
      localStorage.setItem("game_session", JSON.stringify({
        roomId: currentRoom.id,
        playerId: currentPlayer.id,
        username: currentPlayer.username
      }))
    }
  }, [currentRoom?.id, currentPlayer?.id, currentPlayer?.username])

  // Actions
  const createRoom = useCallback(async (data: Omit<CreateRoomData, "initialState"> & { initialState: T }) => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("createRoom", data, resolve)
    })
  }, [isConnected])

  const joinRoom = useCallback(async (data: JoinRoomData) => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("joinRoom", data, resolve)
    })
  }, [isConnected])

  const leaveRoom = useCallback(async () => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("leaveRoom", (response) => {
        if (response.success) {
          setError(null)
          localStorage.removeItem("game_session") // Важливо: очищаємо сесію
        }
        resolve(response)
      })
    })
  }, [isConnected])

  const makeMove = useCallback(async (moveData: any) => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("makeMove", moveData, (response) => {
        if (response.success) setError(null)
        else setError(response.error?.message || "Failed to make move")
        resolve(response)
      })
    })
  }, [isConnected])

  const sendChatMessage = useCallback(async (text: string) => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("sendChatMessage", { text }, resolve)
    })
  }, [isConnected])

  const undoMove = useCallback(async () => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => socketRef.current!.emit("undoMove", resolve))
  }, [isConnected])

  const redoMove = useCallback(async () => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => socketRef.current!.emit("redoMove", resolve))
  }, [isConnected])

  const updateRolePermissions = useCallback(async (role: string, permissions: Partial<RolePermissions>) => {
    if (!socketRef.current || !isConnected) return { success: false, error: { code: "OFFLINE", message: "Offline" } }
    return new Promise<CallbackResponse>((resolve) => {
      socketRef.current!.emit("updateRolePermissions", { role, permissions }, resolve)
    })
  }, [isConnected])

  const clearError = useCallback(() => {
    setError(null)
    setIsRateLimited(false)
  }, [])

  const reconnect = useCallback(() => socketRef.current?.connect(), [])
  const disconnect = useCallback(() => socketRef.current?.disconnect(), [])

  return {
    isConnected, isConnecting, socketId,
    currentRoom, currentPlayer, gameState,
    canUndo, canRedo, chatMessages,
    error, isRateLimited,
    createRoom, joinRoom, leaveRoom, makeMove,
    sendChatMessage, undoMove, redoMove, updateRolePermissions,
    clearError, reconnect, disconnect,
  }
}