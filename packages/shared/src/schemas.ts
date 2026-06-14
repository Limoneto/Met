// MET — esquemas Zod compartidos (validación end-to-end front/back).
import { z } from "zod";
import {
  ALCANCE_ANUNCIO, ALCANCE_MOROSIDAD, ALCANCE_RESERVA, CATEGORIA_PRODUCTO,
  COMBINAR_MOROSIDAD, MEDIO_PAGO, MEDIO_VENTA, MODO_CHECKIN, SEVERIDAD_ANUNCIO,
  TIPO_PLAN, TIPO_RESERVA,
} from "./enums.js";

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const idInput = z.object({ id: z.string().uuid() });

export const crearSocioInput = z.object({
  nombre: z.string().min(2),
  documento: z.string().min(5),
  email: z.string().email(),
  sedeId: z.string().uuid(),
  planId: z.string().uuid().optional(),
});

export const crearPlanInput = z.object({
  sedeId: z.string().uuid(),
  nombre: z.string().min(2),
  tipo: z.enum(TIPO_PLAN),
  precio: z.number().int().nonnegative(),
  actividadIds: z.array(z.string().uuid()).default([]),
  clasesIncluidas: z.number().int().positive().nullable().default(null),
  vigenciaDias: z.number().int().positive().nullable().default(null),
  maxDiasPausa: z.number().int().nonnegative().default(30),
});

export const reservarInput = z.object({
  ocurrenciaId: z.string().uuid(),
  tipo: z.enum(TIPO_RESERVA).default("puntual"),
});

export const cancelarReservaInput = z.object({ reservaId: z.string().uuid() });

export const registrarPagoInput = z.object({
  cuotaId: z.string().uuid(),
  medio: z.enum(MEDIO_PAGO),
  monto: z.number().int().positive(),
});

export const checkinInput = z.object({
  token: z.string().min(1),
  sedeId: z.string().uuid(),
  modo: z.enum(MODO_CHECKIN).default("recepcion"),
  ocurrenciaId: z.string().uuid().nullable().default(null),
});

export const crearAnuncioInput = z.object({
  titulo: z.string().min(2),
  cuerpo: z.string().min(2),
  severidad: z.enum(SEVERIDAD_ANUNCIO).default("info"),
  alcance: z.enum(ALCANCE_ANUNCIO).default("global"),
  sedeId: z.string().uuid().nullable().default(null),
  actividadId: z.string().uuid().nullable().default(null),
});

export const crearProductoInput = z.object({
  nombre: z.string().min(2),
  categoria: z.enum(CATEGORIA_PRODUCTO),
  precio: z.number().int().nonnegative(),
});

export const crearVentaInput = z.object({
  sedeId: z.string().uuid(),
  socioId: z.string().uuid().nullable().default(null),
  medio: z.enum(MEDIO_VENTA),
  items: z
    .array(z.object({ productoId: z.string().uuid(), cantidad: z.number().int().positive() }))
    .min(1),
});

export const politicaMorosidadInput = z.object({
  alcance: z.enum(ALCANCE_MOROSIDAD).default("global"),
  maxCuotas: z.number().int().nonnegative().default(1),
  diasGracia: z.number().int().nonnegative().default(10),
  maxMonto: z.number().int().nonnegative().default(0),
  combinar: z.enum(COMBINAR_MOROSIDAD).default("primero"),
});

export const politicaReservaInput = z.object({
  alcance: z.enum(ALCANCE_RESERVA).default("global"),
  horasCancelacion: z.number().int().nonnegative().default(3),
  minCierreReserva: z.number().int().nonnegative().default(0),
});

export type LoginInput = z.infer<typeof loginInput>;
export type CrearSocioInput = z.infer<typeof crearSocioInput>;
export type ReservarInput = z.infer<typeof reservarInput>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoInput>;
export type CheckinInput = z.infer<typeof checkinInput>;
