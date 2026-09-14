"use client";
import { useMemo } from "react";
import { useTeams } from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import { LEAD_STATUSES, GENERAL_LEAD_STATUSES, type LeadStatus } from "@/lib/leadStatus";

/**
 * True when the signed-in user may set the Closing-only statuses — i.e. they are a
 * leader or member of the team tagged "closing", or a Super Admin.
 *
 * This only hides options in the UI. The real gate is server-side in
 * leadController.updateLeadStatus, so a crafted request still gets a 403.
 */
export function useCanSetClosingStatuses(): boolean {
  const { user } = useAuthStore();
  const { data: teamsData } = useTeams({ status: "active", limit: 200 });

  return useMemo(() => {
    const role = (user as { role?: { roleName?: string } } | null)?.role;
    if (role?.roleName === "Super Admin") return true;
    if (!user?._id) return false;

    const closing = (teamsData?.data ?? []).find((t) =>
      (t.tags ?? []).some((tag) => tag.name?.trim().toLowerCase() === "closing"),
    );
    if (!closing) return false;

    const ids = [...(closing.leaders ?? []), ...(closing.members ?? [])].map((m) =>
      typeof m === "object" && m !== null ? (m as { _id: string })._id : String(m),
    );
    return ids.includes(user._id);
  }, [user, teamsData]);
}

/** Statuses this user may SET, in display order. */
export function useSettableStatuses(): readonly LeadStatus[] {
  const canSetClosing = useCanSetClosingStatuses();
  return canSetClosing ? LEAD_STATUSES : GENERAL_LEAD_STATUSES;
}

/**
 * Who may see the transfer-date filter: Closing-team members, any team leader,
 * and Super Admin. This is a UI convenience only — the filter itself leaks
 * nothing, since every user still sees only the leads their role allows.
 */
export function useCanSeeTransferFilter(): boolean {
  const { user } = useAuthStore();
  const { data: teamsData } = useTeams({ status: "active", limit: 200 });
  const isClosingMember = useCanSetClosingStatuses();

  return useMemo(() => {
    if (isClosingMember) return true;          // covers Closing member + Super Admin
    if (!user?._id) return false;
    return (teamsData?.data ?? []).some((t) =>
      (t.leaders ?? []).some((l) =>
        (typeof l === "object" && l !== null ? (l as { _id: string })._id : String(l)) === user._id,
      ),
    );
  }, [isClosingMember, user, teamsData]);
}
