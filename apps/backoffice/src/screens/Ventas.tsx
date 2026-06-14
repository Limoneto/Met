import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { C, fmtFecha, fonts, formatARS } from "../lib/theme.js";
import { trpc } from "../lib/trpc.js";
import { Badge, Button, Card, Empty, PageTitle, Select, Spinner, Table, Td } from "../lib/ui.js";

const MEDIO_LABEL: Record<string, string> = { manual: "Efectivo", mp: "Mercado Pago", cuenta: "A cuenta" };

export default function Ventas({ sedeId }: { sedeId: string | null }) {
  const utils = trpc.useUtils();
  const sedes = trpc.catalogo.sedes.useQuery();
  const productos = trpc.erp.productos.useQuery();
  const ventas = trpc.erp.ventas.useQuery();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [medio, setMedio] = useState<"manual" | "mp" | "cuenta">("manual");
  const [socioId, setSocioId] = useState("");
  const socios = trpc.socios.list.useQuery(undefined, { enabled: medio === "cuenta" });

  const sede = sedeId ?? sedes.data?.[0]?.id ?? "";
  const crear = trpc.erp.crearVenta.useMutation({
    onSuccess: () => {
      setCart({});
      setSocioId("");
      utils.erp.ventas.invalidate();
      utils.erp.productos.invalidate();
    },
    onError: (e) => alert(e.message),
  });

  const add = (id: string, d: number) =>
    setCart((c) => {
      const n = Math.max(0, (c[id] ?? 0) + d);
      const next = { ...c };
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const items = Object.entries(cart);
  const total = items.reduce((a, [id, qty]) => {
    const p = productos.data?.find((x) => x.id === id);
    return a + (p ? p.precio * qty : 0);
  }, 0);

  const confirmar = () => {
    if (!items.length) return;
    crear.mutate({
      sedeId: sede,
      socioId: medio === "cuenta" ? socioId || null : null,
      medio,
      items: items.map(([productoId, cantidad]) => ({ productoId, cantidad })),
    });
  };

  return (
    <div>
      <PageTitle title="Ventas" subtitle="Punto de venta y productos" />
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Productos</div>
          {productos.isLoading ? (
            <Spinner />
          ) : (
            <div style={{ padding: "6px 16px 14px" }}>
              {productos.data?.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.surface2}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: C.textSubtle }}>{p.categoria}{p.stock != null ? ` · stock ${p.stock}` : ""}</div>
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 13.5, width: 90, textAlign: "right" }}>{formatARS(p.precio)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => add(p.id, -1)} style={iconBtn}><Minus size={14} /></button>
                    <span style={{ fontFamily: fonts.mono, width: 18, textAlign: "center" }}>{cart[p.id] ?? 0}</span>
                    <button onClick={() => add(p.id, 1)} style={iconBtn}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><ShoppingCart size={17} /> Carrito</div>
          {items.length === 0 ? (
            <Empty>Agregá productos.</Empty>
          ) : (
            <>
              {items.map(([id, qty]) => {
                const p = productos.data?.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0" }}>
                    <span>{qty}× {p.nombre}</span>
                    <span style={{ fontFamily: fonts.mono }}>{formatARS(p.precio * qty)}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: `1px solid ${C.border}`, margin: "10px 0", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontFamily: fonts.mono }}>{formatARS(total)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 5px" }}>Medio de pago</div>
              <Select value={medio} onChange={(e) => setMedio(e.target.value as typeof medio)}>
                <option value="manual">Efectivo / transferencia</option>
                <option value="mp">Mercado Pago</option>
                <option value="cuenta">A cuenta del socio</option>
              </Select>
              {medio === "cuenta" && (
                <div style={{ marginTop: 10 }}>
                  <Select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
                    <option value="">Elegí el socio…</option>
                    {socios.data?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </Select>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <Button disabled={crear.isPending || (medio === "cuenta" && !socioId)} onClick={confirmar}>
                  {crear.isPending ? "Registrando…" : `Cobrar ${formatARS(total)}`}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card style={{ padding: 0, marginTop: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>Ventas recientes</div>
        {ventas.isLoading ? (
          <Spinner />
        ) : !ventas.data?.length ? (
          <Empty>Sin ventas.</Empty>
        ) : (
          <div style={{ padding: "6px 6px 2px" }}>
            <Table head={["Fecha", "Socio", "Medio", "Total"]}>
              {ventas.data.map((v) => (
                <tr key={v.id}>
                  <Td mono>{fmtFecha(v.fecha)}</Td>
                  <Td>{v.socioNombre ?? "Consumidor final"}</Td>
                  <Td><Badge kind="neutral">{MEDIO_LABEL[v.medio] ?? v.medio}</Badge></Td>
                  <Td mono>{formatARS(v.total)}</Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.text,
};
