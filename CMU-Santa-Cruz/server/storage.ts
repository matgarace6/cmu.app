import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import {
  users, laundryBookings, gymBookings, diningOptOuts,
  type User, type InsertUser,
  type LaundryBooking, type InsertLaundryBooking,
  type GymBooking, type InsertGymBooking,
  type DiningOptOut, type InsertDiningOptOut
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(roomNumber: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  getLaundryBookings(): Promise<LaundryBooking[]>;
  createLaundryBooking(booking: InsertLaundryBooking): Promise<LaundryBooking>;
  deleteLaundryBooking(id: number): Promise<void>;

  getGymBookings(): Promise<GymBooking[]>;
  createGymBooking(booking: InsertGymBooking): Promise<GymBooking>;
  deleteGymBooking(id: number): Promise<void>;

  getDiningOptOuts(): Promise<DiningOptOut[]>;
  createDiningOptOut(optOut: InsertDiningOptOut): Promise<DiningOptOut>;
  deleteDiningOptOut(id: number): Promise<void>;

  // Mantenemos tus funciones de administración
  deleteUserCompletely(userId: number): Promise<void>;
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
      // Buscamos por la columna roomNumber que definimos en el schema
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

  // --- FUNCIONES DE LAVANDERÍA (Mantenidas intactas) ---
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

  // --- FUNCIONES DE GIMNASIO (Mantenidas intactas) ---
  async getGymBookings(): Promise<any[]> {
    return await db
      .select({
        id: gymBookings.id,
        userId: gymBookings.userId,
        date: gymBookings.date,
        timeSlot: gymBookings.timeSlot,
        roomNumber: users.roomNumber, // <--- Aquí pedimos el número de habitación
      })
      .from(gymBookings)
      .leftJoin(users, eq(gymBookings.userId, users.id)); // <--- Aquí cruzamos las tablas
  }
  async createGymBooking(booking: InsertGymBooking): Promise<GymBooking> {
    const [b] = await db.insert(gymBookings).values(booking).returning();
    return b;
  }
  async deleteGymBooking(id: number): Promise<void> {
    await db.delete(gymBookings).where(eq(gymBookings.id, id));
  }

  // --- FUNCIONES DE COMEDOR (Mantenidas intactas) ---
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

  // --- FUNCIONES DE ADMINISTRACIÓN RESIDENCIA ---
  async deleteUserCompletely(userId: number): Promise<void> {
    await db.delete(laundryBookings).where(eq(laundryBookings.userId, userId));
    await db.delete(gymBookings).where(eq(gymBookings.userId, userId));
    await db.delete(diningOptOuts).where(eq(diningOptOuts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async resetAllSystemData(): Promise<void> {
    await db.delete(laundryBookings);
    await db.delete(gymBookings);
    await db.delete(diningOptOuts);
    await db.delete(users);
    console.log("--- RESETEO ANUAL COMPLETADO: Base de datos limpia ---");
  }
}

export const storage = new DatabaseStorage();