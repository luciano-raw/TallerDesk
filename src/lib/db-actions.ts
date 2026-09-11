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

export async function updateUserRoleAndTaller(userId: string, roles: ("SUPER_ADMIN" | "TALLER_ADMIN" | "TALLER_RECEP" | "TALLER_TECNICO" | "TALLER_JEFE")[], tallerId: string | null) {
  try {
    const actualizado = await prisma.usuario.update({
      where: { id: userId },
      data: { 
        roles, 
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
        checklist: { orderBy: { tarea: "asc" } },
        trabajos: { include: { tecnico: true } },
        trabajosAdicionales: { orderBy: { createdAt: "desc" } }
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
      trabajos: o.trabajos,
      trabajosAdicionales: o.trabajosAdicionales,
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
  reservaId?: string;
  anio?: number;
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
    } else {
      // Actualizar nombre y teléfono si ya existe
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: { nombre: data.clienteNombre, telefono: data.clienteTelefono }
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
          marca: data.marca.toUpperCase(),
          modelo: data.modelo.toUpperCase(),
          anio: data.anio || new Date().getFullYear(),
          kilometraje: data.kilometraje,
          clienteId: cliente.id,
          tallerId: data.tallerId
        }
      });
    } else {
      // Actualizar kilometraje, marca y modelo del vehículo si ya existe
      vehiculo = await prisma.vehiculo.update({
        where: { id: vehiculo.id },
        data: { 
          kilometraje: data.kilometraje, 
          marca: data.marca.toUpperCase(), 
          modelo: data.modelo.toUpperCase(),
          ...(data.anio ? { anio: data.anio } : {}),
          clienteId: cliente.id 
        }
      });
    }

    // 3. Contar OTs para armar el correlativo
    const totalOT = await prisma.ordenTrabajo.count({
      where: { tallerId: data.tallerId }
    });
    const codigo = `OT-${1001 + totalOT}`;

    // 4. Crear OT sin checklist directo, sino a traves de un TrabajoOT inicial
    const ot = await prisma.ordenTrabajo.create({
      data: {
        codigo,
        status: "INGRESADO",
        combustible: data.combustible,
        kilometraje: data.kilometraje,
        observaciones: data.observaciones,
        vehiculoId: vehiculo.id,
        tallerId: data.tallerId,
        trabajos: {
          create: [{
            titulo: "Revisión Inicial",
            estado: "PENDIENTE"
          }]
        }
      }
    });

    if (data.reservaId) {
      await prisma.reserva.update({
        where: { id: data.reservaId },
        data: { 
          estado: "CONVERTIDA_A_OT",
          ordenTrabajoId: ot.id
        }
      });
    }

    await logOTAction(ot.id, `Orden de Trabajo creada e ingresada con patente ${vehiculo.patente}`);

    revalidatePath("/dashboard");
    const resultData = {
      success: true,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        status: ot.status,
        tokenSeguro: ot.tokenSeguro,
        combustible: ot.combustible,
        kilometraje: ot.kilometraje,
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
    return JSON.parse(JSON.stringify(resultData));
  } catch (error: any) {
    console.error("Error al crear OT:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOTStatus(id: string, status: "INGRESADO" | "DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA" | "ENTREGADO" | "CERRADO" | "ANULADO") {
  try {
    const otPrev = await prisma.ordenTrabajo.findUnique({ where: { id } });
    if (!otPrev) return { success: false, error: "OT no encontrada" };
    
    const wasFinalState = otPrev.status === "CERRADO";
    const isFinalState = status === "CERRADO";
    const wasAnulado = otPrev.status === "ANULADO";
    const isAnulado = status === "ANULADO";

    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { status },
      include: { 
        itemsPresupuesto: { include: { inventarioItem: true } },
        trabajos: { include: { repuestos: { include: { inventarioItem: true } } } }
      }
    });
    await logOTAction(id, `Estado cambiado de la orden a: `);
    
    const allRepuestos: {inventarioItemId: string, cantidad: number, precio: any}[] = [];
    
    // Legacy
    for (const item of ot.itemsPresupuesto) {
      if (item.tipo === "REPUESTO" && item.inventarioItemId && item.inventarioItem) {
        const match = item.descripcion.match(/^(\d+)x /);
        const cantidad = match ? parseInt(match[1], 10) : 1;
        allRepuestos.push({ inventarioItemId: item.inventarioItemId, cantidad, precio: item.inventarioItem.precioUnitario });
      }
    }
    
    // Task-Based
    for (const t of ot.trabajos) {
      if (t.estadoAprobacion === "APROBADO") {
        for (const rep of t.repuestos) {
          if (rep.inventarioItemId && rep.inventarioItem) {
            allRepuestos.push({ inventarioItemId: rep.inventarioItemId, cantidad: rep.cantidad, precio: rep.inventarioItem.precioUnitario });
          }
        }
      }
    }
    
    if (!wasFinalState && isFinalState) {
      for (const item of allRepuestos) {
        await prisma.inventarioItem.update({
          where: { id: item.inventarioItemId },
          data: { 
            cantidad: { decrement: item.cantidad },
            stockReservado: { decrement: item.cantidad }
          }
        });

        await prisma.movimientoInventario.create({
          data: {
            tipo: "CONSUMO",
            cantidad: item.cantidad,
            costoUnitario: item.precio,
            referencia: ot.codigo + " (CERRADA)",
            inventarioItemId: item.inventarioItemId
          }
        });
      }
    }
    else if (wasFinalState && !isFinalState && !isAnulado) {
      for (const item of allRepuestos) {
        await prisma.inventarioItem.update({
          where: { id: item.inventarioItemId },
          data: { 
            cantidad: { increment: item.cantidad },
            stockReservado: { increment: item.cantidad }
          }
        });

        await prisma.movimientoInventario.create({
          data: {
            tipo: "RESERVA",
            cantidad: item.cantidad,
            costoUnitario: item.precio,
            referencia: ot.codigo + " (REVERSO CERRADA)",
            inventarioItemId: item.inventarioItemId
          }
        });
      }
    }
    
    if (!wasAnulado && isAnulado) {
      for (const item of allRepuestos) {
        if (wasFinalState) {
          await prisma.inventarioItem.update({
            where: { id: item.inventarioItemId },
            data: { cantidad: { increment: item.cantidad } }
          });
          await prisma.movimientoInventario.create({
            data: { tipo: "INGRESO", cantidad: item.cantidad, costoUnitario: item.precio, referencia: ot.codigo + " (ANULADO)", inventarioItemId: item.inventarioItemId }
          });
        } else {
          await prisma.inventarioItem.update({
            where: { id: item.inventarioItemId },
            data: { stockReservado: { decrement: item.cantidad } }
          });
        }
      }
    } else if (wasAnulado && !isAnulado) {
      for (const item of allRepuestos) {
        if (isFinalState) {
           await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { cantidad: { decrement: item.cantidad } }
           });
        } else {
           await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { stockReservado: { increment: item.cantidad } }
           });
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error("Error updateOTStatus:", error);
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
      ? await prisma.usuario.findFirst({ where: { id: tecnicoId } }) 
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
    await updateOTStatus(id, "ANULADO");
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
  roles: ("TALLER_TECNICO" | "TALLER_RECEP" | "TALLER_ADMIN" | "TALLER_JEFE")[];
}) {
  try {
    const emailFormatted = data.email.toLowerCase().trim();

    // Validar si el email ya está registrado en este taller específicamente
    const existingInThisTaller = await prisma.usuario.findFirst({
      where: { email: emailFormatted, tallerId: data.tallerId }
    });

    if (existingInThisTaller) {
      return { success: false, error: "Este correo ya está registrado en tu taller." };
    }

    // Buscar si el email existe en OTRO taller para heredar su clerkId y nombre
    const existingAnywhere = await prisma.usuario.findFirst({
      where: { email: emailFormatted }
    });

    let clerkIdToUse = null;
    let nombreToUse = data.nombre;

    if (existingAnywhere) {
      clerkIdToUse = existingAnywhere.clerkId;
    }

    // Definir permisos por defecto según rol
    let defaultPermisos = {};
    if (data.roles.includes("TALLER_ADMIN") || data.roles.includes("TALLER_JEFE")) {
      defaultPermisos = { CAN_EDIT_OT: true, CAN_DELETE_OT: data.roles.includes("TALLER_ADMIN"), CAN_VIEW_BODEGA: true, CAN_MANAGE_BODEGA: true, CAN_MANAGE_WORKERS: data.roles.includes("TALLER_ADMIN"), CAN_MANAGE_PLANTILLAS: true };
    } else if (data.roles.includes("TALLER_RECEP")) {
      defaultPermisos = { CAN_EDIT_OT: true, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false, CAN_MANAGE_PLANTILLAS: false };
    } else if (data.roles.includes("TALLER_TECNICO")) {
      defaultPermisos = { CAN_EDIT_OT: false, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false, CAN_MANAGE_PLANTILLAS: false };
    }

    // Crear el usuario pre-registrado (o multi-taller) en Supabase
    const nuevo = await prisma.usuario.create({
      data: {
        clerkId: clerkIdToUse, // Heredado o null si es nuevo
        email: emailFormatted,
        nombre: nombreToUse,
        roles: data.roles,
        tallerId: data.tallerId,
        permisos: defaultPermisos
      }
    });

    revalidatePath("/dashboard");
    return { success: true, worker: nuevo };
  } catch (error: any) {
    console.error("Error al crear trabajador:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPermissionsAndRoles(userId: string, permisos: any, roles?: any[]) {
  try {
    const dataToUpdate: any = { permisos };
    if (roles) {
      dataToUpdate.roles = roles;
    }
    const actualizado = await prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate
    });
    revalidatePath("/dashboard");
    return { success: true, worker: actualizado };
  } catch (error: any) {
    console.error("Error al actualizar permisos y roles:", error);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUserDbProfile(clerkData: { id: string, email: string, fullName: string }) {
  try {
    const { id: clerkId, email, fullName } = clerkData;
    const emailLower = email.toLowerCase().trim();
    
    // Buscar usuario
    let dbUser = await prisma.usuario.findFirst({
      where: { clerkId },
      include: { taller: true }
    });
    
    if (!dbUser) {
      // Ver si existe por email
      const existingEmail = await prisma.usuario.findFirst({
        where: { email: emailLower }
      });

      if (existingEmail) {
        dbUser = await prisma.usuario.update({
          where: { id: existingEmail.id },
          data: { clerkId },
          include: { taller: true }
        });
      } else {
        const isSuperAdmin = emailLower === "luciano.raw04@gmail.com";
        dbUser = await prisma.usuario.create({
          data: {
            clerkId,
            email: emailLower,
            nombre: fullName || "Usuario sin nombre",
            roles: isSuperAdmin ? ["SUPER_ADMIN"] : ["TALLER_TECNICO"],
          },
          include: { taller: true }
        });
      }
    } else {
      // Forzar super admin
      const isSuperAdmin = emailLower === "luciano.raw04@gmail.com";
      if (isSuperAdmin && (!dbUser.roles || !dbUser.roles.includes("SUPER_ADMIN"))) {
        dbUser = await prisma.usuario.update({
          where: { id: dbUser.id },
          data: { roles: ["SUPER_ADMIN"] },
          include: { taller: true }
        });
      }
    }
    
    return {
      id: dbUser.id,
      nombre: dbUser.nombre,
      email: dbUser.email,
      roles: dbUser.roles || [],
      permisos: dbUser.permisos || {},
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
      where: {
        trabajos: { some: { tecnicoId } }
      },
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
        },
        itemsPresupuesto: {
          include: {
            inventarioItem: true
          }
        },
        trabajos: { include: { tecnico: true, tareas: { orderBy: { tarea: "asc" } }, repuestos: { include: { inventarioItem: true } } } },
        trabajosAdicionales: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" }
    });
    return JSON.parse(JSON.stringify(ots));
  } catch (error) {
    console.error("Error getTecnicoOTs:", error);
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
    return JSON.parse(JSON.stringify({ success: true, tarea }));
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
    return JSON.parse(JSON.stringify({ success: true, ot }));
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
    return JSON.parse(JSON.stringify({ success: true, foto }));
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
        bitacora: { orderBy: { createdAt: "desc" } },
        trabajos: { include: { tecnico: true, tareas: true, repuestos: { include: { inventarioItem: true } } }, orderBy: { createdAt: "desc" } },
        trabajosAdicionales: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!ot) return null;
    
    // Convertir trabajos adicionales nuevos al formato esperado temporalmente
    const adicionalesNuevos = ot.trabajos.filter(t => t.esAdicional).map(t => ({
       id: t.id,
       titulo: t.titulo,
       descripcion: t.tareas?.[0]?.tarea || t.titulo,
       monto: Number(t.costoManoObra) + t.repuestos.reduce((acc, r) => acc + Number(r.monto), 0),
       estadoAprobacion: t.estadoAprobacion,
       createdAt: t.createdAt,
       repuestos: t.repuestos.map(r => ({
          nombre: r.inventarioItem?.nombre || 'Repuesto',
          cantidad: r.cantidad,
          monto: Number(r.monto)
       }))
    }));

    // Combinar con los viejos para compatibilidad
    const trabajosAdicionalesCombinados = [...adicionalesNuevos, ...ot.trabajosAdicionales.map((ta: any) => ({
       id: ta.id,
       titulo: ta.titulo,
       descripcion: ta.descripcion,
       monto: Number(ta.monto),
       estadoAprobacion: ta.estadoAprobacion,
       createdAt: ta.createdAt,
       repuestos: []
    }))];

    const resultData = {
      id: ot.id,
      codigo: ot.codigo,
      status: ot.status,
      tokenSeguro: ot.tokenSeguro,
      combustible: ot.combustible,
      observaciones: ot.observaciones || "",
      diagnostico: ot.diagnostico || "",
      costoManoObra: Number(ot.costoManoObra),
      costoTotal: Number(ot.costoTotal),
      vehiculo: ot.vehiculo,
      fotos: ot.fotos,
      taller: ot.taller,
      itemsPresupuesto: ot.itemsPresupuesto,
      bitacora: ot.bitacora,
      trabajos: ot.trabajos.filter(t => !t.esAdicional || t.estadoAprobacion === 'APROBADO'),
      trabajosAdicionales: trabajosAdicionalesCombinados
    };
    return JSON.parse(JSON.stringify(resultData));
  } catch (error) {
    console.error("Error getOTByToken:", error);
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
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id: data.otId } });
    if (!ot) return { success: false, error: "OT no encontrada" };
    if (ot.status === "ENTREGADO" || ot.status === "LISTO_ENTREGA") {
      return { success: false, error: "No se puede modificar el presupuesto de una OT entregada o lista." };
    }

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
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id: otId } });
    if (!ot) return { success: false, error: "OT no encontrada" };
    if (ot.status === "ENTREGADO" || ot.status === "LISTO_ENTREGA") {
      return { success: false, error: "No se puede modificar el presupuesto de una OT entregada o lista." };
    }

    const item = await prisma.itemPresupuesto.findUnique({ where: { id } });
    if (!item) return { success: false, error: "Ítem no encontrado" };
    
    // Si era un repuesto de bodega, liberar reserva
    if (item.tipo === "REPUESTO" && item.inventarioItemId) {
      const match = item.descripcion.match(/^(\d+)x /);
      const cantidad = match ? parseInt(match[1], 10) : 1;
      
      const inventarioItem = await prisma.inventarioItem.update({
        where: { id: item.inventarioItemId },
        data: { stockReservado: { decrement: cantidad } }
      });
      
      await prisma.movimientoInventario.create({
        data: {
          tipo: "LIBERACION",
          cantidad: cantidad,
          costoUnitario: inventarioItem.precioUnitario,
          referencia: "Lib de OT",
          inventarioItemId: item.inventarioItemId
        }
      });
    }

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
    const updated = await prisma.ordenTrabajo.update({
      where: { id: otId },
      data: {
        presupuestoEstado: estado
      }
    });

    if (estado === "APROBADO" && updated.presupuestoDetalle) {
      // Añadir el trabajo adicional como tarea a la checklist del mecánico
      await prisma.tareaChecklist.create({
        data: {
          tarea: `Adicional Aprobado: ${updated.presupuestoDetalle}`,
          ordenTrabajoId: otId
        }
      });
    }

    await recalculateOTCosts(otId);
    await logOTAction(otId, `Cotización de trabajo adicional ${estado} por el cliente`, "Cliente");

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    revalidatePath("/dashboard/tecnico");
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
      const dbUser = await syncUser();
      if (dbUser && dbUser.nombre) {
        userName = dbUser.nombre;
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
  unidad?: string;
  cantidad: number;
  stockMinimo?: number;
  precioUnitario: number;
  precioVenta?: number;
  ubicacion?: string;
}) {
  try {
    const item = await prisma.inventarioItem.create({
      data: {
        tallerId: data.tallerId,
        nombre: data.nombre,
        sku: data.sku || null,
        tipo: data.tipo,
        unidad: data.unidad || "UNIDAD",
        cantidad: data.cantidad,
        stockMinimo: data.stockMinimo || 0,
        precioUnitario: data.precioUnitario,
        precioVenta: data.precioVenta || 0.0,
        ubicacion: data.ubicacion || null
      }
    });

    if (data.cantidad > 0) {
      await prisma.movimientoInventario.create({
        data: {
          tipo: "ENTRADA",
          cantidad: data.cantidad,
          costoUnitario: data.precioUnitario,
          referencia: "Stock Inicial",
          inventarioItemId: item.id
        }
      });
    }

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
  unidad?: string;
  cantidad: number;
  stockMinimo?: number;
  precioUnitario: number;
  precioVenta?: number;
  ubicacion?: string;
}) {
  try {
    const oldItem = await prisma.inventarioItem.findUnique({ where: { id } });
    const item = await prisma.inventarioItem.update({
      where: { id },
      data: {
        nombre: data.nombre,
        sku: data.sku || null,
        tipo: data.tipo,
        unidad: data.unidad,
        cantidad: data.cantidad,
        stockMinimo: data.stockMinimo,
        precioUnitario: data.precioUnitario,
        precioVenta: data.precioVenta,
        ubicacion: data.ubicacion || null
      }
    });

    if (oldItem && data.cantidad !== oldItem.cantidad) {
      const diff = data.cantidad - oldItem.cantidad;
      await prisma.movimientoInventario.create({
        data: {
          tipo: diff > 0 ? "ENTRADA" : "SALIDA",
          cantidad: Math.abs(diff),
          costoUnitario: data.precioUnitario,
          referencia: "Actualización manual",
          inventarioItemId: item.id
        }
      });
    }

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

    if (cantidadCambio !== 0) {
      await prisma.movimientoInventario.create({
        data: {
          tipo: "AJUSTE",
          cantidad: Math.abs(cantidadCambio),
          costoUnitario: item.precioUnitario,
          referencia: "Ajuste de inventario",
          inventarioItemId: item.id
        }
      });
    }

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
    
    // 1. Buscar en la red local de proveedores
    const localItems = await prisma.marketplaceItem.findMany({
      where: {
        nombre: {
          contains: query,
          mode: "insensitive"
        }
      },
      include: {
        proveedor: true
      },
      take: 10
    });

    const localResults = localItems.map(item => ({
      id: item.id,
      nombre: item.nombre,
      precio: Number(item.precio),
      imagen: null,
      link: null,
      tienda: item.proveedor.nombre,
      isLocal: true,
      proveedorTelefono: item.proveedor.telefono
    }));

    return localResults;
  } catch (error: any) {
    console.error("Error al buscar repuestos en el marketplace local:", error);
    throw new Error("Error al buscar repuestos en el marketplace local.");
  }
}

export async function asociarRepuestoAOT(otId: string, repuestoNombre: string, monto: number) {
  try {
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id: otId } });
    if (!ot) return { success: false, error: "OT no encontrada." };
    if (ot.status === "ENTREGADO" || ot.status === "LISTO_ENTREGA") {
      return { success: false, error: "No se pueden añadir repuestos a una OT entregada o lista." };
    }

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

    let dbUser = await prisma.usuario.findFirst({ where: { clerkId: clerkUser.id } });
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
        roles: ["TALLER_ADMIN"],
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

export async function searchDirectorio(tallerId: string, query: string) {
  try {
    const q = query.trim().toLowerCase();
    
    // Buscar clientes por rutDni o nombre
    const clientes = await prisma.cliente.findMany({
      where: {
        tallerId,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { rutDni: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { vehiculos: true },
      take: 20
    });

    // Buscar vehiculos por patente
    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        tallerId,
        OR: [
          { patente: { contains: q, mode: "insensitive" } },
          { marca: { contains: q, mode: "insensitive" } },
          { modelo: { contains: q, mode: "insensitive" } }
        ]
      },
      include: { cliente: true },
      take: 20
    });

    return JSON.parse(JSON.stringify({ success: true, clientes, vehiculos }));
  } catch (error: any) {
    console.error("Error searchDirectorio:", error);
    return { success: false, error: error.message };
  }
}

export async function getVehiculoHistory(vehiculoId: string) {
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: vehiculoId },
      include: {
        cliente: true,
        ots: {
          orderBy: { createdAt: "desc" },
          include: {
            tecnico: true,
            itemsPresupuesto: true
          }
        },
        recomendaciones: {
          orderBy: { createdAt: "desc" }
        },
        garantias: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!vehiculo) return { success: false, error: "Vehículo no encontrado" };

    return JSON.parse(JSON.stringify({ success: true, vehiculo }));
  } catch (error: any) {
    console.error("Error getVehiculoHistory:", error);
    return { success: false, error: error.message };
  }
}

export async function addRecomendacion(vehiculoId: string, descripcion: string, fechaSugerida?: string) {
  try {
    const rec = await prisma.recomendacion.create({
      data: {
        vehiculoId,
        descripcion,
        fechaSugerida: fechaSugerida ? new Date(fechaSugerida) : null,
        estado: "PENDIENTE"
      }
    });
    return JSON.parse(JSON.stringify({ success: true, recomendacion: rec }));
  } catch (error: any) {
    console.error("Error addRecomendacion:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRecomendacion(id: string) {
  try {
    await prisma.recomendacion.delete({
      where: { id }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleteRecomendacion:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================
// NUEVAS ACCIONES: TRABAJOS (MÚLTIPLES MECÁNICOS)
// =========================================================

export async function createTrabajoOT(ordenTrabajoId: string, titulo: string, tecnicoId?: string, tareas?: string[], estimacionMinutos?: number, costoManoObra?: number, esAdicional?: boolean, estadoAprobacion?: string) {
  try {
    const trabajo = await prisma.trabajoOT.create({
      data: {
        ordenTrabajoId,
        titulo,
        estado: "PENDIENTE",
        tecnicoId: tecnicoId || null,
        estimacionMinutos: estimacionMinutos || 0,
        costoManoObra: costoManoObra || 0,
        esAdicional: esAdicional || false,
        estadoAprobacion: estadoAprobacion || "APROBADO",
        fechaAprobacion: estadoAprobacion == "APROBADO" ? new Date() : null,
        tareas: tareas && tareas.length > 0 ? {
          create: tareas.map(t => ({ tarea: t, ordenTrabajoId }))
        } : undefined
      },
      include: {
        tecnico: true,
        tareas: true,
        repuestos: { include: { inventarioItem: true } }
      }
    });

    // Update global OT cost if approved
    if (estadoAprobacion !== "PENDIENTE_APROBACION" && costoManoObra) {
       await prisma.ordenTrabajo.update({
         where: { id: ordenTrabajoId },
         data: { costoTotal: { increment: costoManoObra } }
       });
    }

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, trabajo }));
  } catch (error: any) {
    console.error("Error createTrabajoOT:", error);
    return { success: false, error: error.message };
  }
}


export async function assignTrabajoMecanico(trabajoId: string, tecnicoId: string | null) {
  try {
    const trabajo = await prisma.trabajoOT.update({
      where: { id: trabajoId },
      data: { tecnicoId }
    });
    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, trabajo }));
  } catch (error: any) {
    console.error("Error assignTrabajoMecanico:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTrabajoEstado(trabajoId: string, estado: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO") {
  try {
    const dataToUpdate: any = { estado };
    if (estado === "EN_PROGRESO") {
      dataToUpdate.startedAt = new Date();
      dataToUpdate.finishedAt = null;
    } else if (estado === "FINALIZADO") {
      dataToUpdate.finishedAt = new Date();
    } else if (estado === "PENDIENTE") {
      dataToUpdate.startedAt = null;
      dataToUpdate.finishedAt = null;
    }

    const trabajo = await prisma.trabajoOT.update({
      where: { id: trabajoId },
      data: dataToUpdate
    });

    // --- LÓGICA DE AUTOMATIZACIÓN DE ESTADOS ---
    if (estado === "FINALIZADO") {
      // Verificar todos los trabajos de esta OT
      const ot = await prisma.ordenTrabajo.findUnique({
        where: { id: trabajo.ordenTrabajoId },
        include: { trabajos: true }
      });

      if (ot) {
        const todosFinalizados = ot.trabajos.every(t => t.estado === "FINALIZADO");
        
        // Si todos están finalizados y la OT aún está en progreso, la pasamos a CONTROL_CALIDAD
        if (todosFinalizados && ot.status === "EN_PROGRESO") {
          await prisma.ordenTrabajo.update({
            where: { id: ot.id },
            data: { status: "CONTROL_CALIDAD" }
          });

          // Registrar en la bitácora
          await prisma.bitacoraAccion.create({
            data: {
              ordenTrabajoId: ot.id,
              accion: "Estado automático: CONTROL CALIDAD. Todos los trabajos finalizados."
            }
          });
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tecnico");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true, trabajo }));
  } catch (error: any) {
    console.error("Error updateTrabajoEstado:", error);
    return { success: false, error: error.message };
  }
}

// =========================================================
// NUEVAS ACCIONES: TRABAJOS ADICIONALES Y BODEGA
// =========================================================

export async function createTrabajoAdicional(ordenTrabajoId: string, titulo: string, descripcion: string, monto: number, repuestos: {inventarioItemId: string, cantidad: number}[] = []) {
  try {
    const trabajo = await prisma.trabajoOT.create({
      data: {
        ordenTrabajoId,
        titulo,
        estado: "PENDIENTE",
        costoManoObra: monto,
        esAdicional: true,
        estadoAprobacion: "PENDIENTE_APROBACION",
        // Almacenamos la descripción inicial en una tarea para no perderla
        tareas: {
          create: [{ tarea: descripcion, ordenTrabajoId }]
        }
      }
    });

    for (const rep of repuestos) {
      await asociarRepuestoATrabajo(trabajo.id, rep.inventarioItemId, rep.cantidad);
    }

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true, trabajo }));
  } catch (error: any) {
    console.error("Error createTrabajoAdicional:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTrabajoAdicionalEstado(id: string, estado: "APROBADO" | "RECHAZADO") {
  try {
    const trabajo = await prisma.trabajoOT.update({
      where: { id },
      data: { estadoAprobacion: estado, fechaAprobacion: estado === "APROBADO" ? new Date() : null },
      include: { repuestos: true }
    });
    
    if (estado === "APROBADO") {
      const otActual = await prisma.ordenTrabajo.findUnique({ where: { id: trabajo.ordenTrabajoId }});
      
      const totalRepuestos = trabajo.repuestos.reduce((acc, curr) => acc + Number(curr.monto), 0);
      const montoTotal = Number(trabajo.costoManoObra) + totalRepuestos;

      await prisma.ordenTrabajo.update({
        where: { id: trabajo.ordenTrabajoId },
        data: {
          costoTotal: { increment: montoTotal },
          ...(otActual && (otActual.status === "PRESUPUESTADO" || otActual.status === "DIAGNOSTICO" || otActual.status === "INGRESADO") 
              ? { status: "EN_PROGRESO" } : {})
        }
      });
      await logOTAction(trabajo.ordenTrabajoId, `Trabajo Adicional Aprobado por el cliente`);
    } else {
      await logOTAction(trabajo.ordenTrabajoId, `Trabajo Adicional Rechazado`);
      
      // Liberar stock reservado de los repuestos no aprobados
      for (const rep of trabajo.repuestos) {
        if (rep.inventarioItemId) {
          await prisma.inventarioItem.update({
            where: { id: rep.inventarioItemId },
            data: { stockReservado: { decrement: rep.cantidad } }
          });
        }
      }
    }

    revalidatePath("/seguimiento/[token]");
    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, trabajo }));
  } catch (error: any) {
    console.error("Error updateTrabajoAdicionalEstado:", error);
    return { success: false, error: error.message };
  }
}


export async function asociarBodegaAOT(otId: string, inventarioItemId: string, cantidad: number) {
  try {
    const item = await prisma.inventarioItem.findUnique({ where: { id: inventarioItemId } });
    if (!item) return { success: false, error: "Item de bodega no encontrado." };
    if (item.cantidad - item.stockReservado < cantidad) {
      return { success: false, error: "Stock disponible insuficiente." };
    }

    const ot = await prisma.ordenTrabajo.findUnique({ where: { id: otId } });
    if (!ot) return { success: false, error: "OT no encontrada." };
    if (ot.status === "ENTREGADO" || ot.status === "LISTO_ENTREGA") {
      return { success: false, error: "No se pueden añadir repuestos a una OT entregada o lista." };
    }

    // Reservar stock
    await prisma.inventarioItem.update({
      where: { id: inventarioItemId },
      data: { stockReservado: { increment: cantidad } }
    });

    // Registrar en MovimientoInventario
    await prisma.movimientoInventario.create({
      data: {
        tipo: "RESERVA",
        cantidad: cantidad,
        costoUnitario: item.precioUnitario,
        referencia: ot.codigo,
        inventarioItemId: inventarioItemId
      }
    });

    // Añadirlo como ItemPresupuesto
    const monto = Number(item.precioVenta) > 0 ? Number(item.precioVenta) * cantidad : Number(item.precioUnitario) * cantidad;
    
    await prisma.itemPresupuesto.create({
      data: {
        tipo: "REPUESTO",
        descripcion: `${cantidad}x ${item.nombre}`,
        monto: monto,
        ordenTrabajoId: otId,
        inventarioItemId: inventarioItemId
      }
    });

    await recalculateOTCosts(otId);
    await logOTAction(otId, `Repuesto de bodega asignado: ${cantidad}x ${item.nombre}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Error al asociar bodega a OT:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// MÓDULO DE AGENDA Y RESERVAS
// ==========================================

export async function createReserva(data: {
  tallerId: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteRut: string;
  patente: string;
  marca: string;
  modelo: string;
  fechaHora: Date;
  tipoServicio: string;
  observaciones?: string;
}) {
  try {
    const reserva = await prisma.reserva.create({
      data: {
        tallerId: data.tallerId,
        clienteNombre: data.clienteNombre,
        clienteTelefono: data.clienteTelefono,
        clienteRut: data.clienteRut,
        patente: data.patente.toUpperCase(),
        marca: data.marca,
        modelo: data.modelo,
        fechaHora: data.fechaHora,
        tipoServicio: data.tipoServicio,
        observaciones: data.observaciones
      }
    });
    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, reserva }));
  } catch (error: any) {
    console.error("Error al crear reserva:", error);
    return { error: error.message };
  }
}

export async function getReservas(tallerId: string, fechaInicio?: Date, fechaFin?: Date) {
  try {
    const whereClause: any = { tallerId };
    
    if (fechaInicio && fechaFin) {
      whereClause.fechaHora = {
        gte: fechaInicio,
        lte: fechaFin
      };
    }
    
    const reservas = await prisma.reserva.findMany({
      where: whereClause,
      orderBy: { fechaHora: "asc" }
    });
    return JSON.parse(JSON.stringify(reservas));
  } catch (error: any) {
    console.error("Error al obtener reservas:", error);
    return [];
  }
}

export async function updateReservaEstado(id: string, estado: "AGENDADA" | "CONFIRMADA" | "NO_ASISTIO" | "CONVERTIDA_A_OT" | "CANCELADA") {
  try {
    const reserva = await prisma.reserva.update({
      where: { id },
      data: { estado }
    });
    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, reserva }));
  } catch (error: any) {
    console.error("Error al actualizar estado de reserva:", error);
    return { error: error.message };
  }
}

export async function getTallerLimiteReservas(tallerId: string) {
  try {
    const taller = await prisma.taller.findUnique({
      where: { id: tallerId },
      select: { limiteReservasDiarias: true, horaApertura: true, horaCierre: true }
    });
    return {
      limite: taller?.limiteReservasDiarias || 10,
      horaApertura: taller?.horaApertura || "08:00",
      horaCierre: taller?.horaCierre || "19:00"
    };
  } catch (error) {
    return { limite: 10, horaApertura: "08:00", horaCierre: "19:00" };
  }
}

export async function updateLimiteReservas(tallerId: string, limite: number, horaApertura: string, horaCierre: string) {
  try {
    const taller = await prisma.taller.update({
      where: { id: tallerId },
      data: { limiteReservasDiarias: limite, horaApertura, horaCierre }
    });
    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, config: { limite: taller.limiteReservasDiarias, horaApertura: taller.horaApertura, horaCierre: taller.horaCierre } }));
  } catch (error: any) {
    console.error("Error al actualizar config de agenda:", error);
    return { error: error.message };
  }
}


export async function getOTForPrint(id: string) { return await prisma.ordenTrabajo.findUnique({ where: { id }, include: { vehiculo: { include: { cliente: true } }, taller: true, tecnico: true, itemsPresupuesto: { include: { inventarioItem: true } }, trabajosAdicionales: true } }); }
// --- PROVEEDORES LOCALES (B2B) ---

export async function getProveedores() {
  return await prisma.proveedor.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createProveedor(data: { nombre: string, telefono: string, ciudad: string, direccion?: string }) {
  try {
    await prisma.proveedor.create({ data });
    revalidatePath("/super-admin/proveedores");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProveedor(id: string) {
  try {
    await prisma.proveedor.delete({ where: { id } });
    revalidatePath("/super-admin/proveedores");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleProveedorActivo(id: string) {
  try {
    const p = await prisma.proveedor.findUnique({ where: { id } });
    if (p) {
      await prisma.proveedor.update({ where: { id }, data: { activo: !p.activo } });
      revalidatePath("/super-admin/proveedores");
      return { success: true };
    }
    return { success: false, error: "Not found" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadProveedorCatalog(proveedorId: string, items: any[]) {
  try {
    // items is array of { sku, nombre, marca, precio, stock, categoria }
    // First delete all existing items for this provider
    await prisma.marketplaceItem.deleteMany({ where: { proveedorId } });
    // Insert new items
    await prisma.marketplaceItem.createMany({
      data: items.map(item => ({
        proveedorId,
        sku: item.sku ? String(item.sku) : null,
        nombre: String(item.nombre || "Sin nombre"),
        marca: item.marca ? String(item.marca) : null,
        precio: Number(item.precio) || 0,
        stock: Number(item.stock) || 0,
        categoria: item.categoria ? String(item.categoria) : null
      }))
    });
    revalidatePath("/super-admin/proveedores");
    return { success: true };
  } catch (err: any) {
    console.error("Upload error:", err);
    return { success: false, error: err.message };
  }
}


// --- PLANTILLAS DE SERVICIO ---

export async function getPlantillasServicio() {
  const user = await syncUser();
  if (!user || !user.tallerId) throw new Error("No autorizado");

  return await prisma.plantillaServicio.findMany({
    where: { tallerId: user.tallerId },
    include: {
      trabajos: true,
    },
  });
}

export async function createPlantillaServicio(data: { nombre: string; descripcion?: string; trabajos: { titulo: string; descripcion?: string; costoBase: number; tareas: string[] }[] }) {
  const user = await syncUser();
  if (!user || !user.tallerId) throw new Error("No autorizado");

  return await prisma.plantillaServicio.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
      tallerId: user.tallerId,
      trabajos: {
        create: data.trabajos.map(t => ({
          titulo: t.titulo,
          descripcion: t.descripcion,
          costoBase: t.costoBase,
          tareas: t.tareas
        }))
      }
    },
    include: { trabajos: true }
  });
}

export async function deletePlantillaServicio(id: string) {
  const user = await syncUser();
  if (!user || !user.tallerId) throw new Error("No autorizado");

  return await prisma.plantillaServicio.deleteMany({
    where: { id, tallerId: user.tallerId }
  });
}

export async function applyPlantillaToOT(otId: string, plantillaId: string) {
  const user = await syncUser();
  if (!user || !user.tallerId) throw new Error("No autorizado");

  const plantilla = await prisma.plantillaServicio.findFirst({
    where: { id: plantillaId, tallerId: user.tallerId },
    include: { trabajos: true }
  });

  if (!plantilla) throw new Error("Plantilla no encontrada");

  // Crear cada TrabajoOT basado en la plantilla
  for (const t of plantilla.trabajos) {
    await prisma.trabajoOT.create({
      data: {
        ordenTrabajoId: otId,
        titulo: t.titulo,
        costoManoObra: t.costoBase,
        estado: "PENDIENTE",
        tareas: {
          create: t.tareas.map(tarea => ({
            tarea: tarea,
            completada: false,
            ordenTrabajoId: otId
          }))
        }
      }
    });
  }

  return true;
}

// --- FUNCIONES PÚBLICAS Y PERFIL TALLER ---

export async function updateTallerProfile(tallerId: string, data: any) {
  const user = await syncUser();
  if (!user || user.tallerId !== tallerId) throw new Error("No autorizado");
  return await prisma.taller.update({ where: { id: tallerId }, data });
}

export async function getPublicTallerInfo(slug: string) {
  const taller = await prisma.taller.findUnique({ where: { slug } });
  if (!taller || !taller.activo) return null;
  return {
    id: taller.id,
    nombre: taller.nombre,
    slug: taller.slug,
    descripcionPublica: taller.descripcionPublica,
    horarioAtencion: taller.horarioAtencion,
    telefonoContacto: taller.telefonoContacto,
    emailContacto: taller.emailContacto,
    logoUrl: taller.logoUrl,
    ubicacion: taller.ubicacion
  };
}

export async function createPublicReserva(tallerId: string, data: any) {
  return await prisma.reserva.create({
    data: {
      tallerId,
      clienteNombre: data.clienteNombre,
      clienteRut: data.clienteRut || "",
      clienteTelefono: data.clienteTelefono,
      patente: data.patente,
      marca: data.marca,
      modelo: data.modelo,
      fechaHora: new Date(data.fechaHora),
      tipoServicio: data.tipoServicio,
      observaciones: data.observaciones,
      estado: "AGENDADA"
    }
  });
}

export async function getTallerConfig(tallerId: string) {
  const user = await syncUser();
  if (!user) throw new Error("No autenticado");
  // Check if user belongs to this taller, or has it in available, or is super admin
  if (user.tallerId !== tallerId && !user.roles?.includes("SUPER_ADMIN") && !user.talleresDisponibles?.some((t:any) => t.id === tallerId)) {
    throw new Error("No autorizado para este taller");
  }
  return await prisma.taller.findUnique({ where: { id: tallerId } });
}

// --- MULTI-TALLER SELECTION ---
import { cookies } from "next/headers";
export async function setActiveTallerCookie(tallerId: string) {
  (await cookies()).set("tallerdesk_active_taller", tallerId, { maxAge: 60 * 60 * 24 * 30 });
}

export async function asociarRepuestoATrabajo(trabajoId: string, inventarioItemId: string, cantidad: number) {
  try {
    const item = await prisma.inventarioItem.findUnique({ where: { id: inventarioItemId } });
    if (!item) return { success: false, error: "Item de bodega no encontrado." };
    if (item.cantidad - item.stockReservado < cantidad) {
      return { success: false, error: "Stock disponible insuficiente." };
    }

    const trabajo = await prisma.trabajoOT.findUnique({ where: { id: trabajoId } });
    if (!trabajo) return { success: false, error: "Trabajo no encontrado." };

    const montoTotal = Number(item.precioVenta) * cantidad;

    // Reservar stock
    await prisma.inventarioItem.update({
      where: { id: inventarioItemId },
      data: { stockReservado: { increment: cantidad } }
    });

    const repuesto = await prisma.repuestoOT.create({
      data: {
        trabajoId,
        inventarioItemId,
        cantidad,
        monto: montoTotal
      }
    });

    if (trabajo.estadoAprobacion === "APROBADO") {
      await prisma.ordenTrabajo.update({
         where: { id: trabajo.ordenTrabajoId },
         data: { costoTotal: { increment: montoTotal } }
      });
    }

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({ success: true, repuesto }));
  } catch (error: any) {
    console.error("Error asociarRepuestoATrabajo:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTrabajoOT(id: string) {
  try {
    const trabajo = await prisma.trabajoOT.findUnique({
      where: { id },
      include: { repuestos: true }
    });

    if (!trabajo) return { success: false, error: "Trabajo no encontrado" };

    // Liberar stock reservado si hay repuestos
    for (const rep of trabajo.repuestos) {
      if (rep.inventarioItemId) {
        await prisma.inventarioItem.update({
          where: { id: rep.inventarioItemId },
          data: { stockReservado: { decrement: rep.cantidad } }
        });
      }
    }

    // Restar del costo total si estaba aprobado
    if (trabajo.estadoAprobacion === "APROBADO") {
      const montoTotalRepuestos = trabajo.repuestos.reduce((acc, r) => acc + Number(r.monto), 0);
      const costoRestar = Number(trabajo.costoManoObra) + montoTotalRepuestos;
      
      if (costoRestar > 0) {
        await prisma.ordenTrabajo.update({
          where: { id: trabajo.ordenTrabajoId },
          data: { costoTotal: { decrement: costoRestar } }
        });
      }
    }

    await prisma.trabajoOT.delete({
      where: { id }
    });

    // Check if the OT can advance now that a blocking task was removed
    const ot = await prisma.ordenTrabajo.findUnique({
       where: { id: trabajo.ordenTrabajoId },
       include: { trabajos: true }
    });

    if (ot && ot.status === "EN_PROGRESO") {
        const allFinished = ot.trabajos.every(t => t.estado === "FINALIZADO");
        if (allFinished && ot.trabajos.length > 0) {
           await prisma.ordenTrabajo.update({
              where: { id: ot.id },
              data: { status: "CONTROL_CALIDAD" }
           });
        }
    }

    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error("Error deleteTrabajoOT:", error);
    return { success: false, error: error.message };
  }
}
