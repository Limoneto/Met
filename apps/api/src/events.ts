// MET — event bus interno (in-process). Los módulos emiten eventos de dominio
// y reaccionan; las tareas no sincrónicas (envíos, etc.) las toman los workers.
import { EventEmitter } from "node:events";

export type DomainEvent =
  | { type: "pago.registrado"; pagoId: string; cuotaId: string; socioId?: string }
  | { type: "socio.suspendido"; socioId: string }
  | { type: "reserva.cancelada"; reservaId: string; socioId: string; ocurrenciaId: string }
  | { type: "ocurrencia.cancelada"; ocurrenciaId: string }
  | { type: "anuncio.publicado"; anuncioId: string; severidad: string };

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export function emit(ev: DomainEvent) {
  emitter.emit(ev.type, ev);
  emitter.emit("*", ev);
}

export function on<T extends DomainEvent["type"]>(type: T, fn: (ev: Extract<DomainEvent, { type: T }>) => void) {
  emitter.on(type, fn as (ev: DomainEvent) => void);
}
