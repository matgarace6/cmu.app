import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  allergies: text("allergies").notNull(),
});

const validRoomRanges = (val: string) => {
  const n = parseInt(val);
  return (n >= 101 && n <= 107)
    || (n >= 201 && n <= 222)
    || (n >= 301 && n <= 322)
    || (n >= 401 && n <= 422)
    || (n >= 501 && n <= 522)
    || (n >= 601 && n <= 622);
};

export const insertUserSchema = createInsertSchema(users).extend({
  roomNumber: z.string().refine(validRoomRanges, {
    message: "Esta habitación no existe en la residencia",
  }),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  allergies: z.string().min(1, "Por favor, indica tus alergias o escribe 'no'"),
});

export const laundryBookings = pgTable("laundry_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  machineType: text("machine_type").notNull(),
  machineId: integer("machine_id").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
}, (table) => ({
  machineSlotUnique: uniqueIndex("laundry_machine_slot_unique").on(table.date, table.timeSlot, table.machineType, table.machineId),
  userSlotUnique: uniqueIndex("laundry_user_slot_unique").on(table.userId, table.date, table.timeSlot),
}));

export const gymBookings = pgTable("gym_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
}, (table) => ({
  userSlotUnique: uniqueIndex("gym_user_slot_unique").on(table.userId, table.date, table.timeSlot),
}));

export const diningOptOuts = pgTable("dining_opt_outs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(),
});

export const blockedLaundryMachines = pgTable("blocked_laundry_machines", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  machineType: text("machine_type").notNull(),
  machineId: integer("machine_id").notNull(),
  blockedByUserId: integer("blocked_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  slotMachineUnique: uniqueIndex("blocked_laundry_machine_unique").on(table.date, table.timeSlot, table.machineType, table.machineId),
}));

export const blockedTimeSlots = pgTable("blocked_time_slots", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(), // laundry | gym
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  blockedByUserId: integer("blocked_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  serviceSlotUnique: uniqueIndex("blocked_time_slot_unique").on(table.service, table.date, table.timeSlot),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const insertLaundryBookingSchema = createInsertSchema(laundryBookings).omit({ id: true });
export const insertGymBookingSchema = createInsertSchema(gymBookings).omit({ id: true });
export const insertDiningOptOutSchema = createInsertSchema(diningOptOuts).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LaundryBooking = typeof laundryBookings.$inferSelect;
export type GymBooking = typeof gymBookings.$inferSelect;
export type DiningOptOut = typeof diningOptOuts.$inferSelect;
export type BlockedLaundryMachine = typeof blockedLaundryMachines.$inferSelect;
export type BlockedTimeSlot = typeof blockedTimeSlots.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertLaundryBooking = z.infer<typeof insertLaundryBookingSchema>;
export type InsertGymBooking = z.infer<typeof insertGymBookingSchema>;
export type InsertDiningOptOut = z.infer<typeof insertDiningOptOutSchema>;
