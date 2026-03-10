import type { User } from "@shared/schema";

export type UserWithAdminFlag = Omit<User, "password"> & { isAdmin: boolean };

export function isAdminRoom(roomNumber?: string): boolean {
  if (!roomNumber) return false;
  const adminRooms = (process.env.ADMIN_ROOMS || "422")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  return adminRooms.includes(roomNumber);
}

export function toUserWithAdminFlag(user: User): UserWithAdminFlag {
  const { password: _password, ...safeUser } = user;
  return { ...safeUser, isAdmin: isAdminRoom(user.roomNumber) };
}
