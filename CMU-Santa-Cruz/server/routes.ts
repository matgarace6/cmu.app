import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { isAdminRoom } from "./admin";
import { z } from "zod";

function parseSlotHour(timeSlot: string): number {
  const [hour] = timeSlot.split(":");
  return Number(hour);
}

function createsRunOfThreeOrMore(existingSlots: string[], nextSlot: string): boolean {
  const hours = Array.from(new Set([...existingSlots, nextSlot].map(parseSlotHour))).sort((a, b) => a - b);

  let runLength = 1;
  for (let i = 1; i < hours.length; i += 1) {
    if (hours[i] === hours[i - 1] + 1) {
      runLength += 1;
      if (runLength >= 3) return true;
    } else {
      runLength = 1;
    }
  }

  return false;
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "23505";
}

const blockMachineSchema = z.object({
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  machineType: z.string().min(1),
  machineId: z.coerce.number().int().positive(),
  blocked: z.boolean(),
});

const blockSlotSchema = z.object({
  service: z.enum(["laundry", "gym"]),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  blocked: z.boolean(),
});

const adminUpdateUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "El nombre no puede estar vacío"),
  allergies: z.string().trim().min(1, "Las alergias no pueden estar vacías"),
});

const adminDeleteUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (!isAdminRoom(req.user?.roomNumber)) return res.status(403).send("No autorizado");
  return next();
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/laundry", async (_req, res) => {
    const bookings = await storage.getLaundryBookings();
    res.json(bookings);
  });

  app.post("/api/laundry", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { date, timeSlot, machineType, machineId } = req.body;
      const mId = Number(machineId);
      const userId = req.user.id;

      if (!date || !timeSlot || !machineType || Number.isNaN(mId)) {
        return res.status(400).send("Datos de reserva inválidos");
      }

      const allBookings = await storage.getLaundryBookings();
      const blockedMachines = await storage.getBlockedLaundryMachines();
      const blockedSlots = await storage.getBlockedTimeSlots();

      const machineBlocked = blockedMachines.some(
        (b) => b.date === date && b.timeSlot === timeSlot && b.machineType === machineType && b.machineId === mId,
      );
      if (machineBlocked) {
        return res.status(400).send(`La ${machineType} ${mId} está bloqueada por administración.`);
      }

      const slotBlocked = blockedSlots.some((b) => b.service === "laundry" && b.date === date && b.timeSlot === timeSlot);
      if (slotBlocked) {
        return res.status(400).send("Esta franja de lavandería está bloqueada por administración.");
      }

      const conflict = allBookings.find(
        (b) => b.date === date && b.timeSlot === timeSlot && b.machineType === machineType && b.machineId === mId,
      );

      if (conflict) {
        return res.status(400).send(`La ${machineType} ${mId} ya está reservada a esta hora.`);
      }

      const alreadyBookedInSlot = allBookings.some(
        (b) => b.userId === userId && b.date === date && b.timeSlot === timeSlot,
      );
      if (alreadyBookedInSlot) {
        return res.status(400).send("Ya tienes una reserva de lavandería en esa franja.");
      }

      const mySameMachineBookings = allBookings.filter(
        (b) => b.userId === userId && b.date === date && b.machineType === machineType && b.machineId === mId,
      );

      if (createsRunOfThreeOrMore(mySameMachineBookings.map((b) => b.timeSlot), timeSlot)) {
        return res.status(400).send("No puedes reservar la misma máquina más de dos horas seguidas.");
      }

      const booking = await storage.createLaundryBooking({
        date,
        timeSlot,
        machineType,
        machineId: mId,
        userId,
      });

      await storage.createAuditLog({
        action: "laundry_booking_created",
        details: `${req.user.roomNumber} reservó ${machineType} ${mId} el ${date} ${timeSlot}`,
        userId,
      });

      res.json(booking);
    } catch (e) {
      if (isUniqueViolation(e)) {
        return res.status(400).send(`La ${req.body.machineType} ${req.body.machineId} ya está reservada a esta hora.`);
      }
      res.status(400).send("Error al procesar la reserva de lavandería");
    }
  });

  app.post("/api/laundry/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { date, timeSlot, machineType, machineId } = req.body;
      const all = await storage.getLaundryBookings();

      const myBooking = all.find(
        (b) =>
          b.userId === req.user.id
          && b.date === date
          && b.timeSlot === timeSlot
          && b.machineType === machineType
          && b.machineId === Number(machineId),
      );

      if (myBooking) {
        await storage.deleteLaundryBooking(myBooking.id);
        await storage.createAuditLog({
          action: "laundry_booking_cancelled",
          details: `${req.user.roomNumber} canceló ${machineType} ${machineId} el ${date} ${timeSlot}`,
          userId: req.user.id,
        });
        return res.json({ success: true });
      }
      res.status(404).send("Reserva no encontrada");
    } catch (_e) {
      res.status(500).send("Error");
    }
  });

  app.get("/api/gym", async (_req, res) => {
    const bookings = await storage.getGymBookings();
    res.json(bookings);
  });

  app.post("/api/gym", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { date, timeSlot } = req.body;
      if (!date || !timeSlot) {
        return res.status(400).send("Datos de reserva inválidos");
      }

      const all = await storage.getGymBookings();
      const blockedSlots = await storage.getBlockedTimeSlots();
      const slotBookings = all.filter((b) => b.date === date && b.timeSlot === timeSlot);

      const slotBlocked = blockedSlots.some(
        (b) => b.service === "gym" && b.date === date && b.timeSlot === timeSlot,
      );
      if (slotBlocked) {
        return res.status(400).send("Esta franja de gimnasio está bloqueada por administración.");
      }

      if (slotBookings.length >= 3) {
        return res.status(400).send("Gimnasio lleno");
      }

      const alreadyBookedByUser = slotBookings.some((b) => b.userId === req.user.id);
      if (alreadyBookedByUser) {
        return res.status(400).send("Ya estás apuntado al gimnasio en esa franja.");
      }

      const mySameDayBookings = all.filter((b) => b.userId === req.user.id && b.date === date);

      if (createsRunOfThreeOrMore(mySameDayBookings.map((b) => b.timeSlot), timeSlot)) {
        return res.status(400).send("No puedes reservar el gimnasio más de dos horas seguidas.");
      }

      const booking = await storage.createGymBooking({ date, timeSlot, userId: req.user.id });

      await storage.createAuditLog({
        action: "gym_booking_created",
        details: `${req.user.roomNumber} reservó gimnasio el ${date} ${timeSlot}`,
        userId: req.user.id,
      });

      res.json(booking);
    } catch (e) {
      if (isUniqueViolation(e)) {
        return res.status(400).send("Ya tienes una reserva de gimnasio en esa franja.");
      }
      res.status(400).send("Error en gimnasio");
    }
  });

  app.post("/api/gym/cancel", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Debes iniciar sesión de nuevo");
    }

    try {
      const { date, timeSlot } = req.body;
      const userId = req.user.id;

      const all = await storage.getGymBookings();
      const myBooking = all.find((b) => b.userId === userId && b.date === date && b.timeSlot === timeSlot);

      if (myBooking) {
        await storage.deleteGymBooking(myBooking.id);
        await storage.createAuditLog({
          action: "gym_booking_cancelled",
          details: `${req.user.roomNumber} canceló gimnasio el ${date} ${timeSlot}`,
          userId,
        });
        return res.json({ success: true });
      }
      return res.status(404).send("Reserva no encontrada");
    } catch (_e) {
      res.status(500).send("Error interno");
    }
  });

  app.get("/api/dining", async (_req, res) => {
    const optOuts = await storage.getDiningOptOuts();
    res.json(optOuts);
  });

  app.post("/api/dining", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { date, mealType } = req.body;
      const all = await storage.getDiningOptOuts();

      const existing = all.find((o) => o.userId === req.user.id && o.date === date && o.mealType === mealType);

      if (existing) {
        await storage.deleteDiningOptOut(existing.id);
        return res.json({ status: "removed" });
      }

      const optOut = await storage.createDiningOptOut({
        date,
        mealType,
        userId: req.user.id,
      });
      return res.json(optOut);
    } catch (_e) {
      res.status(400).send("Error en comedor");
    }
  });

  app.get("/api/kitchen/report", async (_req, res) => {
    try {
      const users = (await storage.getUsers()).filter((u) => !isAdminRoom(u.roomNumber));
      const optOuts = await storage.getDiningOptOuts();
      res.json({ users, optOuts });
    } catch (_e) {
      res.status(500).send("Error en reporte");
    }
  });

  app.post("/api/user/delete-account", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user.id;

    try {
      await storage.deleteUserCompletely(userId);
      await storage.createAuditLog({
        action: "user_deleted_account",
        details: `${req.user.roomNumber} eliminó su cuenta`,
        userId,
      });

      req.logout((err) => {
        if (err) return res.status(500).send("Error al cerrar sesión");

        req.session.destroy((sessionErr) => {
          if (sessionErr) return res.status(500).send("Error al destruir sesión");
          res.clearCookie("connect.sid");
          return res.json({ message: "OK" });
        });
      });
    } catch (_e) {
      res.status(500).send("Error interno");
    }
  });

  // --- ADMIN ---
  app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
    const users = await storage.getUsers();
    const blockedMachines = await storage.getBlockedLaundryMachines();
    const blockedSlots = await storage.getBlockedTimeSlots();
    const auditLogs = await storage.getAuditLogs(300);
    res.json({ users, blockedMachines, blockedSlots, auditLogs });
  });

  app.post("/api/admin/laundry/block-machine", requireAdmin, async (req, res) => {
    const adminUser = req.user;
    if (!adminUser) return res.sendStatus(401);

    const parsed = blockMachineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send("Datos inválidos");

    const { date, timeSlot, machineType, machineId: mId, blocked } = parsed.data;

    if (blocked) {
      await storage.blockLaundryMachine({
        date,
        timeSlot,
        machineType,
        machineId: mId,
        blockedByUserId: adminUser.id,
      });
      await storage.createAuditLog({
        action: "admin_block_laundry_machine",
        details: `${adminUser.roomNumber} bloqueó ${machineType} ${mId} el ${date} ${timeSlot}`,
        userId: adminUser.id,
      });
    } else {
      await storage.unblockLaundryMachine({ date, timeSlot, machineType, machineId: mId });
      await storage.createAuditLog({
        action: "admin_unblock_laundry_machine",
        details: `${adminUser.roomNumber} desbloqueó ${machineType} ${mId} el ${date} ${timeSlot}`,
        userId: adminUser.id,
      });
    }

    return res.json({ success: true });
  });

  app.post("/api/admin/user/update", requireAdmin, async (req, res) => {
    const adminUser = req.user;
    if (!adminUser) return res.sendStatus(401);

    const parsed = adminUpdateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.issues[0]?.message || "Datos inválidos");

    const { userId, name, allergies } = parsed.data;

    const updated = await storage.updateUserProfile(userId, {
      name,
      allergies,
    });

    if (!updated) return res.status(404).send("Usuario no encontrado");

    await storage.createAuditLog({
      action: "admin_update_user_profile",
      details: `${adminUser.roomNumber} actualizó perfil de ${updated.roomNumber} (${updated.name})`,
      userId: adminUser.id,
    });

    return res.json(updated);
  });


  app.post("/api/admin/user/delete", requireAdmin, async (req, res) => {
    const adminUser = req.user;
    if (!adminUser) return res.sendStatus(401);

    const parsed = adminDeleteUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send("Usuario inválido");

    const { userId: targetUserId } = parsed.data;
    if (targetUserId === adminUser.id) {
      return res.status(400).send("No puedes borrar tu propio perfil desde el panel de administración.");
    }

    const users = await storage.getUsers();
    const target = users.find((u) => u.id === targetUserId);

    if (!target) return res.status(404).send("Usuario no encontrado");

    await storage.deleteUserCompletely(targetUserId);

    await storage.createAuditLog({
      action: "admin_delete_user",
      details: `${adminUser.roomNumber} eliminó el perfil de ${target.roomNumber} (${target.name})`,
      userId: adminUser.id,
    });

    return res.json({ success: true });
  });

  app.post("/api/admin/block-slot", requireAdmin, async (req, res) => {
    const adminUser = req.user;
    if (!adminUser) return res.sendStatus(401);

    const parsed = blockSlotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send("Datos inválidos");

    const { service, date, timeSlot, blocked } = parsed.data;

    if (blocked) {
      await storage.blockTimeSlot({ service, date, timeSlot, blockedByUserId: adminUser.id });
      await storage.createAuditLog({
        action: "admin_block_slot",
        details: `${adminUser.roomNumber} bloqueó ${service} el ${date} ${timeSlot}`,
        userId: adminUser.id,
      });
    } else {
      await storage.unblockTimeSlot({ service, date, timeSlot });
      await storage.createAuditLog({
        action: "admin_unblock_slot",
        details: `${adminUser.roomNumber} desbloqueó ${service} el ${date} ${timeSlot}`,
        userId: adminUser.id,
      });
    }

    return res.json({ success: true });
  });

  return server;
}
