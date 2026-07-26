"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/auth-sync";

// --- ACCIONES DE TALLERES (TENANTS) ---

export async function getTalleres() {
  try {
    return await prisma.taller.findMany({
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Error al obtener talleres:", e);
    return [];
  }
}

export async function createTaller(nombre: string, slug: string, plan: string, ubicacion?: string, maxTrabajadores?: number) {
  try {
    const nuevo = await prisma.taller.create({
      data: { 
        nombre, 
        slug, 
        plan, 
        ubicacion: ubicacion || null,
        maxTrabajadores: maxTrabajadores || 5,
        activo: true 
      }
    });
    revalidatePath("/super-admin");
    return { success: true, taller: nuevo };
  } catch (error: any) {
    console.error("Error al crear taller:", error);
    return { success: false, error: error.message || "Error desconocido" };
  }
}

export async function toggleTallerActivo(id: string) {
  try {
    const taller = await prisma.taller.findUnique({ where: { id } });
    if (!taller) throw new Error("Taller no encontrado");
    
    const actualizado = await prisma.taller.update({
      where: { id },
      data: { activo: !taller.activo }
    });
    revalidatePath("/super-admin");
    return { success: true, taller: actualizado };
  } catch (error: any) {
    console.error("Error al togglear taller:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTallerPlan(id: string, plan: string) {
  try {
    const actualizado = await prisma.taller.update({
      where: { id },
      data: { plan }
    });
    revalidatePath("/super-admin");
    return { success: true, taller: actualizado };
  } catch (error: any) {
    console.error("Error al cambiar plan:", error);
    return { success: false, error: error.message };
  }
}

// --- ACCIONES DE USUARIOS Y ROLES ---

export async function getUsuarios() {
  try {
    return await prisma.usuario.findMany({
      include: { taller: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Error al obtener usuarios:", e);
    return [];
  }
}

export async function updateUserRoleAndTaller(userId: string, role: "SUPER_ADMIN" | "TALLER_ADMIN" | "TALLER_RECEP" | "TALLER_TECNICO", tallerId: string | null) {
  try {
    const actualizado = await prisma.usuario.update({
      where: { id: userId },
      data: { 
        role, 
        tallerId: tallerId || null 
      }
    });
    revalidatePath("/super-admin");
    revalidatePath("/dashboard");
    return { success: true, user: actualizado };
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return { success: false, error: error.message };
  }
}

// --- ACCIONES DE ÓRDENES DE TRABAJO (OT) ---

export async function getTallerOTs(tallerId: string) {
  try {
    const ots = await prisma.ordenTrabajo.findMany({
      where: { tallerId },
      include: { 
        vehiculo: {
          include: { cliente: true }
        },
        tecnico: true,
        itemsPresupuesto: true,
        bitacora: { orderBy: { createdAt: "desc" } },
        fotos: { orderBy: { createdAt: "desc" } },
        checklist: { orderBy: { tarea: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });
    return ots.map(o => ({
      ...o,
      costoManoObra: Number(o.costoManoObra),
      costoTotal: Number(o.costoTotal),
      presupuestoMonto: Number(o.presupuestoMonto || 0),
      itemsPresupuesto: o.itemsPresupuesto.map(i => ({
        id: i.id,
        tipo: i.tipo,
        descripcion: i.descripcion,
        monto: Number(i.monto)
      })),
      bitacora: o.bitacora.map(b => ({
        id: b.id,
        accion: b.accion,
        usuarioNombre: b.usuarioNombre,
        createdAt: b.createdAt.toISOString()
      })),
      fotos: o.fotos.map(f => ({
        id: f.id,
        url: f.url,
        descripcion: f.descripcion || "",
        createdAt: f.createdAt.toISOString()
      })),
      checklist: o.checklist.map(c => ({
        id: c.id,
        tarea: c.tarea,
        completada: c.completada
      })),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString()
    }));
  } catch (e) {
    console.error("Error al obtener OTs del taller:", e);
    return [];
  }
}

export async function createOT(data: {
  tallerId: string;
  clienteNombre: string;
  clienteRut: string;
  clienteTelefono: string;
  patente: string;
  marca: string;
  modelo: string;
  kilometraje: number;
  combustible: number;
  observaciones: string;
  tareasAdicionales?: string[];
}) {
  try {
    // 1. Buscar o crear cliente
    let cliente = await prisma.cliente.findFirst({
      where: { rutDni: data.clienteRut, tallerId: data.tallerId }
    });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: data.clienteNombre,
          rutDni: data.clienteRut,
          telefono: data.clienteTelefono,
          tallerId: data.tallerId
        }
      });
    }

    // 2. Buscar o crear vehículo
    let vehiculo = await prisma.vehiculo.findFirst({
      where: { patente: data.patente.toUpperCase(), tallerId: data.tallerId }
    });
    if (!vehiculo) {
      vehiculo = await prisma.vehiculo.create({
        data: {
          patente: data.patente.toUpperCase(),
          marca: data.marca,
          modelo: data.modelo,
          anio: new Date().getFullYear(),
          kilometraje: data.kilometraje,
          clienteId: cliente.id,
          tallerId: data.tallerId
        }
      });
    } else {
      // Actualizar kilometraje del vehículo si ya existe
      await prisma.vehiculo.update({
        where: { id: vehiculo.id },
        data: { kilometraje: data.kilometraje }
      });
    }

    // 3. Contar OTs para armar el correlativo
    const totalOT = await prisma.ordenTrabajo.count({
      where: { tallerId: data.tallerId }
    });
    const codigo = `OT-${1001 + totalOT}`;

    // 4. Armar listado de tareas (obligatorias + adicionales)
    const defaultTareas = [
      "Inspección de niveles y fluidos",
      "Revisión de frenos delanteros y traseros",
      "Escaneo de códigos de falla (OBD-II)",
      "Revisión visual de suspensión y dirección"
    ];
    const allTareas = [
      ...defaultTareas,
      ...(data.tareasAdicionales || []).filter(t => t.trim() !== "")
    ];

    // 5. Crear OT con checklist inicial
    const ot = await prisma.ordenTrabajo.create({
      data: {
        codigo,
        status: "INGRESADO",
        combustible: data.combustible,
        observaciones: data.observaciones,
        vehiculoId: vehiculo.id,
        tallerId: data.tallerId,
        checklist: {
          create: allTareas.map(t => ({ tarea: t }))
        }
      }
    });

    await logOTAction(ot.id, `Orden de Trabajo creada e ingresada con patente ${vehiculo.patente}`);

    revalidatePath("/dashboard");
    return {
      success: true,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        status: ot.status,
        tokenSeguro: ot.tokenSeguro,
        combustible: ot.combustible,
        observaciones: ot.observaciones,
        costoManoObra: Number(ot.costoManoObra),
        costoTotal: Number(ot.costoTotal),
        vehiculoId: ot.vehiculoId,
        tecnicoId: ot.tecnicoId,
        tallerId: ot.tallerId,
        createdAt: ot.createdAt.toISOString(),
        updatedAt: ot.updatedAt.toISOString()
      }
    };
  } catch (error: any) {
    console.error("Error al crear OT:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOTStatus(id: string, status: "INGRESADO" | "DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA" | "ENTREGADO") {
  try {
    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { status }
    });
    await logOTAction(id, `Estado cambiado de la orden a: ${status}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        status: ot.status,
        tokenSeguro: ot.tokenSeguro,
        costoManoObra: Number(ot.costoManoObra),
        costoTotal: Number(ot.costoTotal)
      }
    };
  } catch (error: any) {
    console.error("Error al actualizar estado de OT:", error);
    return { success: false, error: error.message };
  }
}

export async function assignOTMecanico(id: string, tecnicoId: string | null) {
  try {
    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { tecnicoId: tecnicoId || null }
    });
    
    const mec = tecnicoId 
      ? await prisma.usuario.findUnique({ where: { id: tecnicoId } }) 
      : null;
    await logOTAction(id, mec ? `Mecánico asignado: ${mec.nombre}` : "Mecánico desasignado de la orden");

    revalidatePath("/dashboard");
    return {
      success: true,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        status: ot.status,
        tokenSeguro: ot.tokenSeguro,
        costoManoObra: Number(ot.costoManoObra),
        costoTotal: Number(ot.costoTotal)
      }
    };
  } catch (error: any) {
    console.error("Error al asignar mecánico a OT:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteOT(id: string) {
  try {
    await prisma.$transaction([
      prisma.fotoOT.deleteMany({ where: { ordenTrabajoId: id } }),
      prisma.repuestoEnOT.deleteMany({ where: { ordenTrabajoId: id } }),
      prisma.tareaChecklist.deleteMany({ where: { ordenTrabajoId: id } }),
      prisma.ordenTrabajo.delete({ where: { id } })
    ]);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar OT:", error);
    return { success: false, error: error.message };
  }
}

export async function getTallerUsuarios(tallerId: string) {
  try {
    return await prisma.usuario.findMany({
      where: { tallerId },
      orderBy: { nombre: "asc" }
    });
  } catch (e) {
    console.error("Error al obtener usuarios del taller:", e);
    return [];
  }
}

export async function createTallerWorker(data: {
  tallerId: string;
  nombre: string;
  email: string;
  role: "TALLER_TECNICO" | "TALLER_RECEP" | "TALLER_ADMIN";
}) {
  try {
    const emailFormatted = data.email.toLowerCase().trim();

    // Validar si el email ya está registrado en el sistema
    const existing = await prisma.usuario.findUnique({
      where: { email: emailFormatted }
    });

    if (existing) {
      if (existing.tallerId === data.tallerId) {
        return { success: false, error: "Este correo ya está registrado en tu taller." };
      } else if (existing.tallerId) {
        return { success: false, error: "Este correo ya está registrado en otro taller." };
      } else {
        // Si el usuario existía pero estaba huérfano, lo vinculamos a este taller
        const actualizado = await prisma.usuario.update({
          where: { id: existing.id },
          data: {
            tallerId: data.tallerId,
            role: data.role
          }
        });
        revalidatePath("/dashboard");
        return { success: true, worker: actualizado };
      }
    }

    // Crear el usuario pre-registrado en Supabase
    const nuevo = await prisma.usuario.create({
      data: {
        clerkId: null, // Se vinculará automáticamente al iniciar sesión
        email: emailFormatted,
        nombre: data.nombre,
        role: data.role,
        tallerId: data.tallerId
      }
    });

    revalidatePath("/dashboard");
    return { success: true, worker: nuevo };
  } catch (error: any) {
    console.error("Error al crear trabajador:", error);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUserDbProfile() {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return null;
    return {
      id: dbUser.id,
      nombre: dbUser.nombre,
      email: dbUser.email,
      role: dbUser.role,
      tallerId: dbUser.tallerId,
      tallerName: dbUser.taller?.nombre || null,
      tallerSlug: dbUser.taller?.slug || null
    };
  } catch (error) {
    console.error("Error en getCurrentUserDbProfile server action:", error);
    return null;
  }
}

export async function getTecnicoOTs(tecnicoId: string) {
  try {
    const ots = await prisma.ordenTrabajo.findMany({
      where: { tecnicoId },
      include: {
        vehiculo: {
          include: {
            cliente: true
          }
        },
        checklist: {
          orderBy: { tarea: "asc" }
        },
        fotos: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return ots.map(o => ({
      ...o,
      costoManoObra: Number(o.costoManoObra),
      costoTotal: Number(o.costoTotal),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error("Error al obtener OTs del técnico:", error);
    return [];
  }
}

export async function toggleTareaChecklist(id: string, completada: boolean) {
  try {
    const tarea = await prisma.tareaChecklist.update({
      where: { id },
      data: { completada }
    });
    await logOTAction(tarea.ordenTrabajoId, `Tarea del checklist '${tarea.tarea}' marcada como ${completada ? "COMPLETADA" : "PENDIENTE"}`);
    revalidatePath("/dashboard/tecnico");
    return { success: true, tarea };
  } catch (error: any) {
    console.error("Error al cambiar estado de tarea:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOTDiagnostico(id: string, diagnostico: string) {
  try {
    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { diagnostico }
    });
    await logOTAction(id, `Diagnóstico técnico actualizado: "${diagnostico}"`);
    revalidatePath("/dashboard/tecnico");
    return { success: true, ot };
  } catch (error: any) {
    console.error("Error al guardar diagnóstico de OT:", error);
    return { success: false, error: error.message };
  }
}

export async function addOTFoto(data: { ordenTrabajoId: string; url: string; descripcion?: string }) {
  try {
    const foto = await prisma.fotoOT.create({
      data: {
        url: data.url,
        descripcion: data.descripcion || null,
        esRecepcion: false, // Avance del mecánico
        ordenTrabajoId: data.ordenTrabajoId
      }
    });
    await logOTAction(data.ordenTrabajoId, `Foto de progreso subida: "${data.descripcion || "Sin descripción"}"`);
    revalidatePath("/dashboard/tecnico");
    revalidatePath("/seguimiento/[token]");
    return { success: true, foto };
  } catch (error: any) {
    console.error("Error al subir foto de OT:", error);
    return { success: false, error: error.message };
  }
}

export async function getOTByToken(token: string) {
  try {
    const ot = await prisma.ordenTrabajo.findUnique({
      where: { tokenSeguro: token },
      include: {
        vehiculo: {
          include: {
            cliente: true
          }
        },
        fotos: {
          orderBy: { createdAt: "desc" }
        },
        taller: true,
        itemsPresupuesto: true,
        bitacora: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!ot) return null;
    return {
      id: ot.id,
      codigo: ot.codigo,
      status: ot.status,
      tokenSeguro: ot.tokenSeguro,
      combustible: ot.combustible,
      observaciones: ot.observaciones || "",
      diagnostico: ot.diagnostico || "",
      costoManoObra: Number(ot.costoManoObra),
      costoTotal: Number(ot.costoTotal),
      presupuestoDetalle: ot.presupuestoDetalle,
      presupuestoMonto: Number(ot.presupuestoMonto || 0),
      presupuestoEstado: ot.presupuestoEstado,
      vehiculo: {
        patente: ot.vehiculo.patente,
        marca: ot.vehiculo.marca,
        modelo: ot.vehiculo.modelo,
        cliente: {
          nombre: ot.vehiculo.cliente.nombre
        }
      },
      taller: {
        nombre: ot.taller.nombre
      },
      fotos: ot.fotos.map(f => ({
        url: f.url,
        descripcion: f.descripcion || "",
        fecha: new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })),
      itemsPresupuesto: ot.itemsPresupuesto.map(i => ({
        id: i.id,
        tipo: i.tipo,
        descripcion: i.descripcion,
        monto: Number(i.monto)
      })),
      bitacora: ot.bitacora.map(b => ({
        id: b.id,
        accion: b.accion,
        usuarioNombre: b.usuarioNombre,
        createdAt: b.createdAt.toISOString()
      }))
    };
  } catch (error) {
    console.error("Error al obtener OT por token:", error);
    return null;
  }
}

export async function updateOTCosts(id: string, data: { costoManoObra?: number; costoRepuestos?: number }) {
  try {
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
    if (!ot) return { success: false, error: "OT no encontrada" };

    const currentManoObra = data.costoManoObra !== undefined ? data.costoManoObra : Number(ot.costoManoObra);
    const currentRepuestos = data.costoRepuestos !== undefined ? data.costoRepuestos : (Number(ot.costoTotal) - Number(ot.costoManoObra));

    const costoTotal = currentManoObra + currentRepuestos;

    const updated = await prisma.ordenTrabajo.update({
      where: { id },
      data: {
        costoManoObra: currentManoObra,
        costoTotal: costoTotal
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return {
      success: true,
      ot: {
        id: updated.id,
        costoManoObra: Number(updated.costoManoObra),
        costoTotal: Number(updated.costoTotal)
      }
    };
  } catch (error: any) {
    console.error("Error al actualizar costos de OT:", error);
    return { success: false, error: error.message };
  }
}

async function recalculateOTCosts(otId: string) {
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: otId },
    include: { itemsPresupuesto: true }
  });
  if (!ot) return;

  const manoObra = ot.itemsPresupuesto
    .filter(i => i.tipo === "MANO_OBRA")
    .reduce((acc, curr) => acc + Number(curr.monto), 0);

  const repuestos = ot.itemsPresupuesto
    .filter(i => i.tipo === "REPUESTO")
    .reduce((acc, curr) => acc + Number(curr.monto), 0);

  let adicional = 0;
  if (ot.presupuestoEstado === "APROBADO" && ot.presupuestoMonto) {
    adicional = Number(ot.presupuestoMonto);
  }

  await prisma.ordenTrabajo.update({
    where: { id: otId },
    data: {
      costoManoObra: manoObra,
      costoTotal: manoObra + repuestos + adicional
    }
  });
}

export async function addPresupuestoItem(data: { otId: string; tipo: "MANO_OBRA" | "REPUESTO"; descripcion: string; monto: number }) {
  try {
    await prisma.itemPresupuesto.create({
      data: {
        tipo: data.tipo,
        descripcion: data.descripcion,
        monto: data.monto,
        ordenTrabajoId: data.otId
      }
    });

    await recalculateOTCosts(data.otId);
    await logOTAction(data.otId, `Agregado al presupuesto: ${data.tipo === "MANO_OBRA" ? "Mano de Obra" : "Repuesto"} "${data.descripcion}" por $${data.monto.toLocaleString("es-CL")}`);

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return { success: true };
  } catch (error: any) {
    console.error("Error al agregar item de presupuesto:", error);
    return { success: false, error: error.message };
  }
}

export async function deletePresupuestoItem(id: string, otId: string) {
  try {
    const item = await prisma.itemPresupuesto.findUnique({ where: { id } });
    await prisma.itemPresupuesto.delete({
      where: { id }
    });

    await recalculateOTCosts(otId);
    if (item) {
      await logOTAction(otId, `Eliminado del presupuesto: ${item.tipo === "MANO_OBRA" ? "Mano de Obra" : "Repuesto"} "${item.descripcion}"`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar item de presupuesto:", error);
    return { success: false, error: error.message };
  }
}

export async function setPresupuestoAdicional(data: { otId: string; detalle: string; monto: number }) {
  try {
    await prisma.ordenTrabajo.update({
      where: { id: data.otId },
      data: {
        presupuestoDetalle: data.detalle,
        presupuestoMonto: data.monto,
        presupuestoEstado: "PENDIENTE"
      }
    });

    await recalculateOTCosts(data.otId);
    await logOTAction(data.otId, `Cotización de presupuesto adicional enviada al cliente: "${data.detalle}" por $${data.monto.toLocaleString("es-CL")}`);

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return { success: true };
  } catch (error: any) {
    console.error("Error al configurar presupuesto adicional:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePresupuestoAdicionalEstado(otId: string, estado: "APROBADO" | "RECHAZADO") {
  try {
    await prisma.ordenTrabajo.update({
      where: { id: otId },
      data: {
        presupuestoEstado: estado
      }
    });

    await recalculateOTCosts(otId);
    await logOTAction(otId, `Cotización de trabajo adicional ${estado} por el cliente`, "Cliente");

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar estado de presupuesto adicional:", error);
    return { success: false, error: error.message };
  }
}

export async function logOTAction(otId: string, accion: string, customUserName?: string) {
  try {
    let userName = customUserName || "Sistema";
    
    if (!customUserName) {
      const userProfile = await getCurrentUserDbProfile();
      if (userProfile && userProfile.nombre) {
        userName = userProfile.nombre;
      }
    }

    await prisma.bitacoraAccion.create({
      data: {
        ordenTrabajoId: otId,
        accion,
        usuarioNombre: userName
      }
    });
  } catch (error) {
    console.error("Error al registrar bitácora de acción:", error);
  }
}

// --- ACCIONES DE BODEGA / INVENTARIO ---

export async function getInventarioItems(tallerId: string) {
  try {
    const items = await prisma.inventarioItem.findMany({
      where: { tallerId },
      orderBy: { nombre: "asc" }
    });
    return items.map(i => ({
      ...i,
      precioUnitario: Number(i.precioUnitario),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error("Error al obtener ítems de bodega:", error);
    return [];
  }
}

export async function createInventarioItem(data: {
  tallerId: string;
  nombre: string;
  sku: string;
  tipo: "REPUESTO" | "INSUMO";
  cantidad: number;
  precioUnitario: number;
  ubicacion?: string;
}) {
  try {
    const item = await prisma.inventarioItem.create({
      data: {
        tallerId: data.tallerId,
        nombre: data.nombre,
        sku: data.sku || null,
        tipo: data.tipo,
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        ubicacion: data.ubicacion || null
      }
    });
    revalidatePath("/dashboard");
    return { success: true, item };
  } catch (error: any) {
    console.error("Error al crear ítem de bodega:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInventarioItem(id: string, data: {
  nombre: string;
  sku: string;
  tipo: "REPUESTO" | "INSUMO";
  cantidad: number;
  precioUnitario: number;
  ubicacion?: string;
}) {
  try {
    const item = await prisma.inventarioItem.update({
      where: { id },
      data: {
        nombre: data.nombre,
        sku: data.sku || null,
        tipo: data.tipo,
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        ubicacion: data.ubicacion || null
      }
    });
    revalidatePath("/dashboard");
    return { success: true, item };
  } catch (error: any) {
    console.error("Error al editar ítem de bodega:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInventarioItem(id: string) {
  try {
    await prisma.inventarioItem.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar ítem de bodega:", error);
    return { success: false, error: error.message };
  }
}

export async function adjustInventarioStock(id: string, cantidadCambio: number) {
  try {
    const item = await prisma.inventarioItem.findUnique({ where: { id } });
    if (!item) return { success: false, error: "El ítem no existe en bodega" };
    const nuevaCantidad = Math.max(0, item.cantidad + cantidadCambio);
    const updated = await prisma.inventarioItem.update({
      where: { id },
      data: { cantidad: nuevaCantidad }
    });
    revalidatePath("/dashboard");
    return { success: true, item: updated };
  } catch (error: any) {
    console.error("Error al ajustar stock de bodega:", error);
    return { success: false, error: error.message };
  }
}

// --- ACCIONES DE MARKETPLACE DE REPUESTOS ---

export async function searchMarketplaceParts(query: string) {
  try {
    if (!query || query.trim() === "") return [];
    
    const token = process.env.MERCADOLIBRE_ACCESS_TOKEN;
    const headers: any = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json"
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Consultar API de Mercado Libre Chile (MLC)
    const res = await fetch(`https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=20`, { headers });
    
    if (!res.ok) {
      console.warn(`Mercado Libre API retornó estado ${res.status}.`);
      throw new Error(`API error ${res.status}`);
    }
    
    const data = await res.json();
    return (data.results || []).map((item: any) => ({
      id: item.id,
      nombre: item.title,
      precio: Number(item.price || 0),
      imagen: item.thumbnail ? item.thumbnail.replace("http://", "https://") : null,
      link: item.permalink,
      tienda: "Mercado Libre Chile"
    }));
  } catch (error: any) {
    console.error("Error al buscar repuestos en el marketplace:", error);
    throw new Error(error.message || "Error al buscar repuestos en el marketplace.");
  }
}

export async function asociarRepuestoAOT(otId: string, repuestoNombre: string, monto: number) {
  try {
    await prisma.itemPresupuesto.create({
      data: {
        tipo: "REPUESTO",
        descripcion: repuestoNombre,
        monto: monto,
        ordenTrabajoId: otId
      }
    });
    await recalculateOTCosts(otId);
    await logOTAction(otId, `Repuesto del Marketplace asociado: "${repuestoNombre}" por $${monto.toLocaleString("es-CL")}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error al asociar repuesto de marketplace a OT:", error);
    return { success: false, error: error.message };
  }
}

export async function upgradeToAdmin() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "No autenticado" };

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return { success: false, error: "Sin email" };

    let dbUser = await prisma.usuario.findUnique({ where: { clerkId: clerkUser.id } });
    if (!dbUser) return { success: false, error: "Usuario no encontrado" };

    let taller = await prisma.taller.findFirst({ where: { slug: 'taller-demo-propio' } });
    if (!taller) {
      taller = await prisma.taller.create({
        data: {
          nombre: `Taller de ${dbUser.nombre}`,
          slug: `taller-demo-propio-${Date.now()}`
        }
      });
    }

    await prisma.usuario.update({
      where: { id: dbUser.id },
      data: {
        role: "TALLER_ADMIN",
        tallerId: taller.id
      }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error upgradeToAdmin:", error);
    return { success: false, error: error.message };
  }
}
