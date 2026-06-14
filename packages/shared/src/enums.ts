// MET — enumeraciones del dominio (string-literal unions compartidas front/back)

export const ROLES = ["admin", "contador", "empleado", "cliente"] as const;
export type RolCodigo = (typeof ROLES)[number];

export const PUESTOS = ["recepcionista", "profe", "profe_rehab", "gerente"] as const;
export type PuestoCodigo = (typeof PUESTOS)[number];

export const ESTADO_EMPLEADO = ["activo", "licencia", "baja"] as const;
export type EstadoEmpleado = (typeof ESTADO_EMPLEADO)[number];

// Estado del socio = derivado de su suscripción (máquina de estado §8 del diseño)
export const ESTADO_SOCIO = ["al_dia", "vencido", "suspendido", "pausado", "baja"] as const;
export type EstadoSocio = (typeof ESTADO_SOCIO)[number];

export const TIPO_PLAN = ["mensual_act", "mensual_libre", "pack", "pase"] as const;
export type TipoPlan = (typeof TIPO_PLAN)[number];

export const ESTADO_SUSCRIPCION = ["activa", "pausada", "baja"] as const;
export type EstadoSuscripcion = (typeof ESTADO_SUSCRIPCION)[number];

export const ESTADO_CUOTA = ["pendiente", "pagada", "vencida"] as const;
export type EstadoCuota = (typeof ESTADO_CUOTA)[number];

export const MEDIO_PAGO = ["manual", "mercadopago"] as const;
export type MedioPago = (typeof MEDIO_PAGO)[number];

export const TIPO_COMPROBANTE = ["B", "C"] as const;
export type TipoComprobante = (typeof TIPO_COMPROBANTE)[number];

export const ESTADO_COMPROBANTE = ["pendiente", "emitido", "error"] as const;
export type EstadoComprobante = (typeof ESTADO_COMPROBANTE)[number];

export const ORIGEN_COMPROBANTE = ["auto", "pedido"] as const;
export type OrigenComprobante = (typeof ORIGEN_COMPROBANTE)[number];

export const ALCANCE_MOROSIDAD = ["global", "plan", "sede"] as const;
export type AlcanceMorosidad = (typeof ALCANCE_MOROSIDAD)[number];

export const COMBINAR_MOROSIDAD = ["primero", "todas"] as const;
export type CombinarMorosidad = (typeof COMBINAR_MOROSIDAD)[number];

export const ESTADO_OCURRENCIA = ["programada", "cancelada", "realizada"] as const;
export type EstadoOcurrencia = (typeof ESTADO_OCURRENCIA)[number];

export const TIPO_RESERVA = ["recurrente", "puntual"] as const;
export type TipoReserva = (typeof TIPO_RESERVA)[number];

export const ESTADO_RESERVA = ["confirmada", "asistio", "liberada", "cancelada"] as const;
export type EstadoReserva = (typeof ESTADO_RESERVA)[number];

export const ESTADO_INSCRIPCION = ["activa", "suspendida"] as const;
export type EstadoInscripcion = (typeof ESTADO_INSCRIPCION)[number];

export const ALCANCE_RESERVA = ["global", "sede", "actividad"] as const;
export type AlcanceReserva = (typeof ALCANCE_RESERVA)[number];

export const MODO_CHECKIN = ["recepcion", "kiosko"] as const;
export type ModoCheckin = (typeof MODO_CHECKIN)[number];

export const RESULTADO_CHECKIN = ["permitido", "rechazado", "offline_pend"] as const;
export type ResultadoCheckin = (typeof RESULTADO_CHECKIN)[number];

export const SEVERIDAD_ANUNCIO = ["info", "aviso", "urgente"] as const;
export type SeveridadAnuncio = (typeof SEVERIDAD_ANUNCIO)[number];

export const ALCANCE_ANUNCIO = ["global", "sede", "actividad", "clase"] as const;
export type AlcanceAnuncio = (typeof ALCANCE_ANUNCIO)[number];

export const ESTADO_ANUNCIO = ["borrador", "publicado", "archivado"] as const;
export type EstadoAnuncio = (typeof ESTADO_ANUNCIO)[number];

export const CATEGORIA_PRODUCTO = ["suplemento", "merch", "bebida", "otro"] as const;
export type CategoriaProducto = (typeof CATEGORIA_PRODUCTO)[number];

export const MEDIO_VENTA = ["manual", "mp", "cuenta"] as const;
export type MedioVenta = (typeof MEDIO_VENTA)[number];

export const TIPO_FICHADA = ["entrada", "salida"] as const;
export type TipoFichada = (typeof TIPO_FICHADA)[number];

export const DIAS_SEMANA = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];
