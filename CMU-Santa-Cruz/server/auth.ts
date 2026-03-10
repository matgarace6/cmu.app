import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { toUserWithAdminFlag } from "./admin";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
  }

  // Configuración de sesión optimizada para Replit y Postgres
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días de sesión
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'roomNumber' }, async (roomNumber, password, done) => {
      try {
        const user = await storage.getUserByRoomNumber(roomNumber);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });

  app.post("/api/register", async (req, res) => {
    console.log("--- PASO 1: El servidor ha recibido la solicitud ---");
    try {
      console.log("--- PASO 2: Datos recibidos:", req.body);

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("--- PASO 3: Los datos no son válidos:", result.error.format());
        return res.status(400).send(result.error.issues[0].message);
      }

      console.log("--- PASO 4: Buscando si la habitación existe...");
      const existingUser = await storage.getUserByRoomNumber(result.data.roomNumber);

      if (existingUser) {
        console.log("--- PASO 5: La habitación ya estaba registrada");
        return res.status(400).send("Esta habitación ya está registrada.");
      }

      console.log("--- PASO 6: Encriptando contraseña...");
      const hashedPassword = await hashPassword(result.data.password);

      console.log("--- PASO 7: Intentando guardar en la base de datos...");
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword
      });

      console.log("--- PASO 8: Usuario guardado con éxito. Iniciando sesión...");
      req.login(user, (err) => {
        if (err) {
           console.error("--- ERROR EN PASO 8:", err);
           return res.status(500).send("Error al iniciar sesión");
        }
        res.status(201).json(toUserWithAdminFlag(user));
      });
    } catch (e: any) {
      console.error("--- ¡BOOM! ERROR CRÍTICO DETECTADO ---");
      console.error("Mensaje del error:", e.message);
      console.error("Detalles:", e);
      res.status(500).send("Error interno: " + e.message);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).send("Número de habitación o contraseña incorrectos");
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(toUserWithAdminFlag(user));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).send("Error al cerrar sesión");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(toUserWithAdminFlag(req.user));
  });
}