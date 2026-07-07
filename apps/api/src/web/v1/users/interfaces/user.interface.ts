export interface UserRow {
  id: number;
  username: string;
  balance: number;
}

export interface UserListItem {
  id: number;
  username: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
}

export interface DepositResponse {
  userId: number;
  balance: number;
  ledgerEntryId: number;
}
