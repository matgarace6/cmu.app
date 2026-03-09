import { z } from 'zod';
import { insertUserSchema, insertLaundryBookingSchema, insertGymBookingSchema, insertDiningOptOutSchema, users, laundryBookings, gymBookings, diningOptOuts } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

const UserSchema = z.custom<typeof users.$inferSelect>();
const LaundryBookingSchema = z.custom<typeof laundryBookings.$inferSelect>();
const GymBookingSchema = z.custom<typeof gymBookings.$inferSelect>();
const DiningOptOutSchema = z.custom<typeof diningOptOuts.$inferSelect>();

export const api = {
  users: {
    login: {
      method: 'POST' as const,
      path: '/api/users/login' as const,
      input: insertUserSchema,
      responses: {
        200: UserSchema,
        400: errorSchemas.validation,
      }
    },
  },
  laundry: {
    list: {
      method: 'GET' as const,
      path: '/api/laundry' as const,
      responses: { 200: z.array(LaundryBookingSchema) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/laundry' as const,
      input: insertLaundryBookingSchema,
      responses: { 201: LaundryBookingSchema, 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/laundry/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  gym: {
    list: {
      method: 'GET' as const,
      path: '/api/gym' as const,
      responses: { 200: z.array(GymBookingSchema) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/gym' as const,
      input: insertGymBookingSchema,
      responses: { 201: GymBookingSchema, 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/gym/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  dining: {
    list: {
      method: 'GET' as const,
      path: '/api/dining' as const,
      responses: { 200: z.array(DiningOptOutSchema) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/dining' as const,
      input: insertDiningOptOutSchema,
      responses: { 201: DiningOptOutSchema, 400: errorSchemas.validation }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/dining/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
