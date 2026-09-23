export const ClaimingStore = {
  tasks: {} as Record<string, {
    id: string;
    payload: any;
    claimedBy?: string;
    claimedAt?: number;
  }>
};
