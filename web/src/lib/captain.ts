/** A case has a named captain once one is assigned (paid plans); leads show the Kiyos team. */
export const hasCaptain = (name: string | null | undefined) => !!name && !["unassigned", "demo", ""].includes(name.trim().toLowerCase());
