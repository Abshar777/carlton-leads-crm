"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store/authStore";
import { getSocket } from "@/lib/socket";

export function useOnlineUsers() {
  const { accessToken } = useAuthStore();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // Seed initial state from REST
  const { data } = useQuery<string[]>({
    queryKey: ["online-users"],
    queryFn: async () => {
      const { data } = await api.get("/auth/online-users");
      return data.data.onlineUserIds as string[];
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) setOnlineIds(new Set(data));
  }, [data]);

  // Real-time updates via socket
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function onOnline({ userId }: { userId: string }) {
      setOnlineIds((prev) => { const n = new Set(Array.from(prev)); n.add(userId); return n; });
    }
    function onOffline({ userId }: { userId: string }) {
      setOnlineIds((prev) => { const n = new Set(Array.from(prev)); n.delete(userId); return n; });
    }

    socket.on("user:online",  onOnline);
    socket.on("user:offline", onOffline);
    return () => {
      socket.off("user:online",  onOnline);
      socket.off("user:offline", onOffline);
    };
  }, [accessToken]);

  return onlineIds;
}

export function useIsOnline(userId?: string) {
  const onlineIds = useOnlineUsers();
  return userId ? onlineIds.has(userId) : false;
}
