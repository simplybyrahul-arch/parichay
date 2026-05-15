"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    assignParichayCoordinator,
    changeParichayCoordinator,
    unassignParichayCoordinator,
} from "@/app/actions/parichay";

type Coordinator = {
    id: string;
    full_name: string | null;
};

type Props = {
    projectId: string;
    coordinators: Coordinator[];
    currentCoordinatorId?: string | null;
    mode: "assign" | "change";
};

export function ParichayAssignmentControls({ projectId, coordinators, currentCoordinatorId, mode }: Props) {
    const [selectedCoordinator, setSelectedCoordinator] = useState(currentCoordinatorId || coordinators[0]?.id || "");
    const [isPending, startTransition] = useTransition();

    const submit = () => {
        if (!selectedCoordinator) {
            toast.error("Select a coordinator first.");
            return;
        }

        startTransition(async () => {
            const result = mode === "assign"
                ? await assignParichayCoordinator(projectId, selectedCoordinator)
                : await changeParichayCoordinator(projectId, selectedCoordinator);

            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    const unassign = () => {
        startTransition(async () => {
            const result = await unassignParichayCoordinator(projectId);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <select
                value={selectedCoordinator}
                onChange={(event) => setSelectedCoordinator(event.target.value)}
                disabled={isPending || coordinators.length === 0}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            >
                {coordinators.length === 0 ? (
                    <option value="">No admin coordinators</option>
                ) : (
                    coordinators.map((coordinator) => (
                        <option key={coordinator.id} value={coordinator.id}>
                            {coordinator.full_name || "Admin user"}
                        </option>
                    ))
                )}
            </select>
            <button
                onClick={submit}
                disabled={isPending || !selectedCoordinator}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
                {isPending ? "Saving..." : mode === "assign" ? "Assign" : "Change"}
            </button>
            {mode === "change" && (
                <button
                    onClick={unassign}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                    Unassign
                </button>
            )}
        </div>
    );
}
