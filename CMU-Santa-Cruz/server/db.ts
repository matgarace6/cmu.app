import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function ensureDatabaseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      room_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      allergies TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS laundry_bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      machine_type TEXT NOT NULL,
      machine_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS laundry_machine_slot_unique
      ON laundry_bookings (date, time_slot, machine_type, machine_id);
    CREATE UNIQUE INDEX IF NOT EXISTS laundry_user_slot_unique
      ON laundry_bookings (user_id, date, time_slot);

    CREATE TABLE IF NOT EXISTS gym_bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gym_user_slot_unique
      ON gym_bookings (user_id, date, time_slot);

    CREATE TABLE IF NOT EXISTS dining_opt_outs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_laundry_machines (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      machine_type TEXT NOT NULL,
      machine_id INTEGER NOT NULL,
      blocked_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS blocked_laundry_machine_unique
      ON blocked_laundry_machines (date, time_slot, machine_type, machine_id);

    CREATE TABLE IF NOT EXISTS blocked_time_slots (
      id SERIAL PRIMARY KEY,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      blocked_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS blocked_time_slot_unique
      ON blocked_time_slots (service, date, time_slot);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS session (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
  `);
}
