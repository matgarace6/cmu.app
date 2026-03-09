import { db } from "./db";
import { and, desc, eq, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import {
  users,
  laundryBookings,
  gymBookings,
  diningOptOuts,
  blockedLaundryMachines,
  blockedTimeSlots,
  auditLogs,
  type User,
  type InsertUser,
  type LaundryBooking,
  type InsertLaundryBooking,
  type GymBooking,
  type InsertGymBooking,
  type DiningOptOut,
  type InsertDiningOptOut,
  type BlockedLaundryMachine,
  type BlockedTimeSlot,
  type AuditLog,
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export type GymBookingWithRoom = GymBooking & {
  roomNumber: string | null;
};

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(roomNumber: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, input: { name: string; allergies: string }): Promise<User | undefined>;

  getLaundryBookings(): Promise<LaundryBooking[]>;
  createLaundryBooking(booking: InsertLaundryBooking): Promise<LaundryBooking>;
  deleteLaundryBooking(id: number): Promise<void>;

  getGymBookings(): Promise<GymBookingWithRoom[]>;
  createGymBooking(booking: InsertGymBooking): Promise<GymBooking>;
  deleteGymBooking(id: number): Promise<void>;

  getDiningOptOuts(): Promise<DiningOptOut[]>;
  createDiningOptOut(optOut: InsertDiningOptOut): Promise<DiningOptOut>;
  deleteDiningOptOut(id: number): Promise<void>;

  getBlockedLaundryMachines(): Promise<BlockedLaundryMachine[]>;
  blockLaundryMachine(input: {
    date: string;
    timeSlot: string;
    machineType: string;
    machineId: number;
    blockedByUserId: number;
  }): Promise<void>;
  unblockLaundryMachine(input: {
    date: string;
    timeSlot: string;
    machineType: string;
    machineId: number;
  }): Promise<void>;

  getBlockedTimeSlots(): Promise<BlockedTimeSlot[]>;
  blockTimeSlot(input: {
    service: "laundry" | "gym";
    date: string;
    timeSlot: string;
    blockedByUserId: number;
  }): Promise<void>;
  unblockTimeSlot(input: { service: "laundry" | "gym"; date: string; timeSlot: string }): Promise<void>;

  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(input: { action: string; details: string; userId: number }): Promise<void>;

  deleteUserCompletely(userId: number): Promise<void>;
  cleanupOldBookings(daysToKeep?: number): Promise<{
    laundryDeleted: number;
    gymDeleted: number;
    diningDeleted: number;
  }>;
  resetAllSystemData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (e) {
      console.error("Error al obtener usuario por ID:", e);
      return undefined;
    }
  }

  async getUserByUsername(roomNumber: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.roomNumber, roomNumber));
      return user;
    } catch (e) {
      console.error("ERROR CRÍTICO: Falló la búsqueda de habitación en la base de datos.", e);
      throw e;
    }
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (e) {
      console.error("ERROR CRÍTICO: No se pudo insertar el usuario en la base de datos.", e);
      throw e;
    }
  }

  async updateUserProfile(userId: number, input: { name: string; allergies: string }): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ name: input.name, allergies: input.allergies })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getLaundryBookings(): Promise<LaundryBooking[]> {
    return await db.select().from(laundryBookings);
  }

  async createLaundryBooking(booking: InsertLaundryBooking): Promise<LaundryBooking> {
    const [b] = await db.insert(laundryBookings).values(booking).returning();
    return b;
  }

  async deleteLaundryBooking(id: number): Promise<void> {
    await db.delete(laundryBookings).where(eq(laundryBookings.id, id));
  }

  async getGymBookings(): Promise<GymBookingWithRoom[]> {
    return await db
      .select({
        id: gymBookings.id,
        userId: gymBookings.userId,
        date: gymBookings.date,
        timeSlot: gymBookings.timeSlot,
        roomNumber: users.roomNumber,
      })
      .from(gymBookings)
      .leftJoin(users, eq(gymBookings.userId, users.id));
  }

  async createGymBooking(booking: InsertGymBooking): Promise<GymBooking> {
    const [b] = await db.insert(gymBookings).values(booking).returning();
    return b;
  }

  async deleteGymBooking(id: number): Promise<void> {
    await db.delete(gymBookings).where(eq(gymBookings.id, id));
  }

  async getDiningOptOuts(): Promise<DiningOptOut[]> {
    return await db.select().from(diningOptOuts);
  }

  async createDiningOptOut(optOut: InsertDiningOptOut): Promise<DiningOptOut> {
    const [o] = await db.insert(diningOptOuts).values(optOut).returning();
    return o;
  }

  async deleteDiningOptOut(id: number): Promise<void> {
    await db.delete(diningOptOuts).where(eq(diningOptOuts.id, id));
  }

  async getBlockedLaundryMachines(): Promise<BlockedLaundryMachine[]> {
    return await db.select().from(blockedLaundryMachines);
  }

  async blockLaundryMachine(input: {
    date: string;
    timeSlot: string;
    machineType: string;
    machineId: number;
    blockedByUserId: number;
  }): Promise<void> {
    await this.unblockLaundryMachine(input);
    await db.insert(blockedLaundryMachines).values(input);
  }

  async unblockLaundryMachine(input: {
    date: string;
    timeSlot: string;
    machineType: string;
    machineId: number;
  }): Promise<void> {
    await db.delete(blockedLaundryMachines).where(and(
      eq(blockedLaundryMachines.date, input.date),
      eq(blockedLaundryMachines.timeSlot, input.timeSlot),
      eq(blockedLaundryMachines.machineType, input.machineType),
      eq(blockedLaundryMachines.machineId, input.machineId),
    ));
  }

  async getBlockedTimeSlots(): Promise<BlockedTimeSlot[]> {
    return await db.select().from(blockedTimeSlots);
  }

  async blockTimeSlot(input: {
    service: "laundry" | "gym";
    date: string;
    timeSlot: string;
    blockedByUserId: number;
  }): Promise<void> {
    await this.unblockTimeSlot(input);
    await db.insert(blockedTimeSlots).values(input);
  }

  async unblockTimeSlot(input: { service: "laundry" | "gym"; date: string; timeSlot: string }): Promise<void> {
    await db.delete(blockedTimeSlots).where(and(
      eq(blockedTimeSlots.service, input.service),
      eq(blockedTimeSlots.date, input.date),
      eq(blockedTimeSlots.timeSlot, input.timeSlot),
    ));
  }

  async getAuditLogs(limit = 200): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async createAuditLog(input: { action: string; details: string; userId: number }): Promise<void> {
    await db.insert(auditLogs).values(input);
  }

  async deleteUserCompletely(userId: number): Promise<void> {
    await db.delete(laundryBookings).where(eq(laundryBookings.userId, userId));
    await db.delete(gymBookings).where(eq(gymBookings.userId, userId));
    await db.delete(diningOptOuts).where(eq(diningOptOuts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }


  async cleanupOldBookings(daysToKeep = 7): Promise<{
    laundryDeleted: number;
    gymDeleted: number;
    diningDeleted: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    const deletedLaundry = await db.delete(laundryBookings)
      .where(lt(laundryBookings.date, cutoff))
      .returning({ id: laundryBookings.id });

    const deletedGym = await db.delete(gymBookings)
      .where(lt(gymBookings.date, cutoff))
      .returning({ id: gymBookings.id });

    const deletedDining = await db.delete(diningOptOuts)
      .where(lt(diningOptOuts.date, cutoff))
      .returning({ id: diningOptOuts.id });

    return {
      laundryDeleted: deletedLaundry.length,
      gymDeleted: deletedGym.length,
      diningDeleted: deletedDining.length,
    };
  }

  async resetAllSystemData(): Promise<void> {
    await db.delete(laundryBookings);
    await db.delete(gymBookings);
    await db.delete(diningOptOuts);
    await db.delete(blockedLaundryMachines);
    await db.delete(blockedTimeSlots);
    await db.delete(auditLogs);
    await db.delete(users);
    console.log("--- RESETEO ANUAL COMPLETADO: Base de datos limpia ---");
  }
}

export const storage = new DatabaseStorage();
