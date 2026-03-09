import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(), 
  password: text("password").notNull(),
  allergies: text("allergies").notNull(),
});

const validRoomRanges = (val: string) => {
  const n = parseInt(val);
  return (n >= 101 && n <= 107) || 
         (n >= 201 && n <= 222) || 
         (n >= 301 && n <= 322) || 
         (n >= 401 && n <= 421) || 
         (n >= 501 && n <= 522) || 
         (n >= 601 && n <= 622);
};

export const insertUserSchema = createInsertSchema(users).extend({
  roomNumber: z.string().refine(validRoomRanges, {
    message: "Esta habitación no existe en la residencia"
  }),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  allergies: z.string().min(1, "Por favor, indica tus alergias o escribe 'no'")
});

export const laundryBookings = pgTable("laundry_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  machineType: text("machine_type").notNull(),
  machineId: integer("machine_id").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
});

export const gymBookings = pgTable("gym_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
});

export const diningOptOuts = pgTable("dining_opt_outs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(),
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