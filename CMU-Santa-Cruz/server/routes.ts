import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  // 1. Configura la seguridad (Login/Logout)
  setupAuth(app);

  // --- LAVANDERÍA ---
  app.get("/api/laundry", async (_req, res) => {
    const bookings = await storage.getLaundryBookings();
    res.json(bookings);
  });

  // --- LAVANDERÍA CON VALIDACIÓN DE CONFLICTOS ---
  app.post("/api/laundry", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { date, timeSlot, machineType, machineId } = req.body;
      const mId = Number(machineId);
      const userId = req.user.id;

      // 1. Obtener todas las reservas de lavandería
      const allBookings = await storage.getLaundryBookings();

      // 2. BUSCAR CONFLICTOS:
      // ¿Existe ya una reserva para ESE día, a ESA hora, de ESE tipo de máquina y con ESE número?
      const conflict = allBookings.find(b => 
        b.date === date && 
        b.timeSlot === timeSlot && 
        b.machineType === machineType && 
        b.machineId === mId
      );

      if (conflict) {
        // Si hay conflicto, devolvemos un error y no guardamos nada
        return res.status(400).send(`La ${machineType} ${mId} ya está reservada a esta hora.`);
      }

      // 3. Si no hay conflicto, guardamos la reserva
      const booking = await storage.createLaundryBooking({
        date,
        timeSlot,
        machineType,
        machineId: mId,
        userId: userId
      });

      res.json(booking);
    } catch (e) {
      res.status(400).send("Error al procesar la reserva de lavandería");
    }
  });
  // --- CANCELAR LAVANDERÍA ---
  app.post("/api/laundry/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { date, timeSlot, machineType, machineId } = req.body;
      const all = await storage.getLaundryBookings();

      const myBooking = all.find(b => 
        b.userId === req.user.id && 
        b.date === date && 
        b.timeSlot === timeSlot &&
        b.machineType === machineType &&
        b.machineId === Number(machineId)
      );

      if (myBooking) {
        await storage.deleteLaundryBooking(myBooking.id);
        return res.json({ success: true });
      }
      res.status(404).send("Reserva no encontrada");
    } catch (e) {
      res.status(500).send("Error");
    }
  });
  
  // --- GIMNASIO ---
  app.get("/api/gym", async (_req, res) => {
    const bookings = await storage.getGymBookings();
    res.json(bookings);
  });

  app.post("/api/gym", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const all = await storage.getGymBookings();
      const slotBookings = all.filter(b => b.date === req.body.date && b.timeSlot === req.body.timeSlot);

      // Máximo 3 personas
      if (slotBookings.length >= 3) {
        return res.status(400).send("Gimnasio lleno");
      }

      const booking = await storage.createGymBooking({ ...req.body, userId: req.user.id });
      res.json(booking);
    } catch (e) {
      res.status(400).send("Error en gimnasio");
    }
  });
  // --- RUTA PARA CANCELAR GIMNASIO (Versión Robusta) ---
  app.post("/api/gym/cancel", async (req, res) => {
    // Si no está logueado, intentamos forzar la lectura del usuario
    if (!req.user) {
      console.log("Error: Usuario no detectado en la sesión");
      return res.status(401).send("Debes iniciar sesión de nuevo");
    }

    try {
      const { date, timeSlot } = req.body;
      const userId = req.user.id;

      const all = await storage.getGymBookings();

      // Buscamos la reserva
      const myBooking = all.find(b => 
        b.userId === userId && 
        b.date === date && 
        b.timeSlot === timeSlot
      );

      if (myBooking) {
        await storage.deleteGymBooking(myBooking.id);
        console.log(`Reserva ${myBooking.id} borrada por el usuario ${userId}`);
        return res.json({ success: true });
      } else {
        console.log("No se encontró la reserva para borrar");
        return res.status(404).send("Reserva no encontrada");
      }
    } catch (e) {
      console.error("Error en el servidor al cancelar:", e);
      res.status(500).send("Error interno");
    }
  });

  // --- COMEDOR (LÓGICA INTERRUPTOR ON/OFF) ---
  app.get("/api/dining", async (_req, res) => {
    const optOuts = await storage.getDiningOptOuts();
    res.json(optOuts);
  });

  app.post("/api/dining", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { date, mealType } = req.body;
      const all = await storage.getDiningOptOuts();

      // Buscamos si ya existe esta falta específica para este usuario
      const existing = all.find(o => 
        o.userId === req.user.id && o.date === date && o.mealType === mealType
      );

      if (existing) {
        // SI EXISTE: El alumno ahora SÍ quiere venir. Borramos la falta.
        await storage.deleteDiningOptOut(existing.id);
        return res.json({ status: "removed" }); 
      } else {
        // SI NO EXISTE: El alumno NO vendrá. Creamos la falta.
        const optOut = await storage.createDiningOptOut({
          date,
          mealType,
          userId: req.user.id
        });
        return res.json(optOut);
      }
    } catch (e) {
      console.error(e);
      res.status(400).send("Error en comedor");
    }
  });

  // --- REPORTE PÚBLICO COCINA ---
  app.get("/api/kitchen/report", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      const optOuts = await storage.getDiningOptOuts();
      res.json({ users, optOuts });
    } catch (e) {
      res.status(500).send("Error en reporte");
    }
  });
  // --- BAJA DE CUENTA ---
  app.post("/api/user/delete-account", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userId = req.user.id;
    console.log(`Iniciando baja total del usuario ID: ${userId}`);

    try {
      // 1. Borrar de la base de datos
      await storage.deleteUserCompletely(userId);
      console.log("Datos borrados en base de datos");

      // 2. Destruir la sesión y limpiar la cookie
      req.logout((err) => {
        if (err) return res.status(500).send("Error al cerrar sesión");

        req.session.destroy((err) => {
          if (err) return res.status(500).send("Error al destruir sesión");
          res.clearCookie("connect.sid"); // Limpia la cookie de Replit
          res.json({ message: "OK" });
        });
      });
    } catch (e) {
      console.error("Error en la baja:", e);
      res.status(500).send("Error interno");
    }
  });
}