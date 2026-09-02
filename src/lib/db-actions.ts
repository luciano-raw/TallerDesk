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

export async function updateOTStatus(id: string, status: "INGRESADO" | "DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA" | "ENTREGADO" | "ANULADO") {
  try {
    const otPrev = await prisma.ordenTrabajo.findUnique({ where: { id } });
    if (!otPrev) return { success: false, error: "OT no encontrada" };
    
    const wasFinalState = otPrev.status === "ENTREGADO" || otPrev.status === "LISTO_ENTREGA";
    const isFinalState = status === "ENTREGADO" || status === "LISTO_ENTREGA";
    const wasAnulado = otPrev.status === "ANULADO";
    const isAnulado = status === "ANULADO";

    const ot = await prisma.ordenTrabajo.update({
      where: { id },
      data: { status },
      include: { itemsPresupuesto: { include: { inventarioItem: true } } }
    });
    await logOTAction(id, `Estado cambiado de la orden a: ${status}`);
    
    // Descontar inventario al entrar a estado final desde un estado NO final
    if (!wasFinalState && isFinalState) {
      for (const item of ot.itemsPresupuesto) {
        if (item.tipo === "REPUESTO" && item.inventarioItemId && item.inventarioItem) {
          const match = item.descripcion.match(/^(\d+)x /);
          const cantidad = match ? parseInt(match[1], 10) : 1;
          
          await prisma.inventarioItem.update({
            where: { id: item.inventarioItemId },
            data: { 
              cantidad: { decrement: cantidad },
              stockReservado: { decrement: cantidad }
            }
          });

          await prisma.movimientoInventario.create({
            data: {
              tipo: "CONSUMO",
              cantidad: cantidad,
              costoUnitario: item.inventarioItem.precioUnitario,
              referencia: ot.codigo,
              inventarioItemId: item.inventarioItemId
            }
          });
        }
      }
    }
    // Revertir consumo al salir de un estado final a un estado NO final (y no anulado)
    else if (wasFinalState && !isFinalState && !isAnulado) {
      for (const item of ot.itemsPresupuesto) {
        if (item.tipo === "REPUESTO" && item.inventarioItemId && item.inventarioItem) {
          const match = item.descripcion.match(/^(\d+)x /);
          const cantidad = match ? parseInt(match[1], 10) : 1;
          
          await prisma.inventarioItem.update({
            where: { id: item.inventarioItemId },
            data: { 
              cantidad: { increment: cantidad },
              stockReservado: { increment: cantidad }
            }
          });

          await prisma.movimientoInventario.create({
            data: {
              tipo: "RESERVA", // Vuelve a estar reservado pero reponemos el físico
              cantidad: cantidad,
              costoUnitario: item.inventarioItem.precioUnitario,
              referencia: ot.codigo + " (REVERSO CONSUMO)",
              inventarioItemId: item.inventarioItemId
            }
          });
        }
      }
    }
    
    // Manejo de ANULADO
    if (!wasAnulado && isAnulado) {
      for (const item of ot.itemsPresupuesto) {
        if (item.tipo === "REPUESTO" && item.inventarioItemId && item.inventarioItem) {
          const match = item.descripcion.match(/^(\d+)x /);
          const cantidad = match ? parseInt(match[1], 10) : 1;
          
          if (wasFinalState) {
            // Si estaba finalizado y se anula, se repone el stock físico pero NO se reserva
            await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { cantidad: { increment: cantidad } }
            });
            await prisma.movimientoInventario.create({
              data: { tipo: "INGRESO", cantidad, costoUnitario: item.inventarioItem.precioUnitario, referencia: ot.codigo + " (ANULADO)", inventarioItemId: item.inventarioItemId }
            });
          } else {
            // Si estaba en progreso y se anula, solo se quita la reserva
            await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { stockReservado: { decrement: cantidad } }
            });
          }
        }
      }
    } else if (wasAnulado && !isAnulado) {
      for (const item of ot.itemsPresupuesto) {
        if (item.tipo === "REPUESTO" && item.inventarioItemId && item.inventarioItem) {
          const match = item.descripcion.match(/^(\d+)x /);
          const cantidad = match ? parseInt(match[1], 10) : 1;
          
          if (isFinalState) {
            // De anulado directo a finalizado, descuenta stock físico (raro pero posible)
            await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { cantidad: { decrement: cantidad } }
            });
            await prisma.movimientoInventario.create({
              data: { tipo: "CONSUMO", cantidad, costoUnitario: item.inventarioItem.precioUnitario, referencia: ot.codigo + " (RECUPERADO)", inventarioItemId: item.inventarioItemId }
            });
          } else {
            // Vuelve a estar reservado
            await prisma.inventarioItem.update({
              where: { id: item.inventarioItemId },
              data: { stockReservado: { increment: cantidad } }
            });
          }
        }
      }
    }

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify({
      success: true,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        status: ot.status,
        tokenSeguro: ot.tokenSeguro,
        costoManoObra: Number(ot.costoManoObra),
        costoTotal: Number(ot.costoTotal)
      }
    }));
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
            roles: data.roles
          }
        });
        revalidatePath("/dashboard");
        return { success: true, worker: actualizado };
      }
    }

    // Definir permisos por defecto según rol
    let defaultPermisos = {};
    if (data.roles.includes("TALLER_ADMIN") || data.roles.includes("TALLER_JEFE")) {
      defaultPermisos = { CAN_EDIT_OT: true, CAN_DELETE_OT: data.roles.includes("TALLER_ADMIN"), CAN_VIEW_BODEGA: true, CAN_MANAGE_BODEGA: true, CAN_MANAGE_WORKERS: data.roles.includes("TALLER_ADMIN") };
    } else if (data.roles.includes("TALLER_RECEP")) {
      defaultPermisos = { CAN_EDIT_OT: true, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false };
    } else if (data.roles.includes("TALLER_TECNICO")) {
      defaultPermisos = { CAN_EDIT_OT: false, CAN_DELETE_OT: false, CAN_VIEW_BODEGA: false, CAN_MANAGE_BODEGA: false };
    }

    // Crear el usuario pre-registrado en Supabase
    const nuevo = await prisma.usuario.create({
      data: {
        clerkId: null, // Se vinculará automáticamente al iniciar sesión
        email: emailFormatted,
        nombre: data.nombre,
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
    let dbUser = await prisma.usuario.findUnique({
      where: { clerkId },
      include: { taller: true }
    });
    
    if (!dbUser) {
      // Ver si existe por email
      const existingEmail = await prisma.usuario.findUnique({
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
        trabajos: { include: { tecnico: true, tareas: { orderBy: { tarea: "asc" } } } },
        trabajosAdicionales: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" }
    });
    return ots.map(o => ({
      ...o,
      costoManoObra: Number(o.costoManoObra),
      costoTotal: Number(o.costoTotal),
      trabajos: o.trabajos,
      trabajosAdicionales: o.trabajosAdicionales,
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
        trabajos: { include: { tecnico: true, tareas: true } },
        trabajosAdicionales: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!ot) return null;
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
      })),
      trabajos: ot.trabajos,
      trabajosAdicionales: ot.trabajosAdicionales
    };
    return JSON.parse(JSON.stringify(resultData));
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

export async function createTrabajoOT(ordenTrabajoId: string, titulo: string, tecnicoId?: string, tareas?: string[], estimacionMinutos?: number) {
  try {
    const trabajo = await prisma.trabajoOT.create({
      data: {
        ordenTrabajoId,
        titulo,
        estado: "PENDIENTE",
        tecnicoId: tecnicoId || null,
        estimacionMinutos: estimacionMinutos || 0,
        tareas: tareas && tareas.length > 0 ? {
          create: tareas.map(t => ({ tarea: t, ordenTrabajoId }))
        } : undefined
      },
      include: {
        tecnico: true,
        tareas: true
      }
    });
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

export async function createTrabajoAdicional(ordenTrabajoId: string, titulo: string, descripcion: string, monto: number) {
  try {
    const adicional = await prisma.trabajoAdicional.create({
      data: {
        ordenTrabajoId,
        titulo,
        descripcion,
        monto,
        estadoAprobacion: "PENDIENTE_APROBACION"
      }
    });
    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true, adicional }));
  } catch (error: any) {
    console.error("Error createTrabajoAdicional:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTrabajoAdicionalEstado(id: string, estado: "APROBADO" | "RECHAZADO") {
  try {
    const adicional = await prisma.trabajoAdicional.update({
      where: { id },
      data: { estadoAprobacion: estado }
    });
    
    // Si se aprueba, sumarlo al costoTotal de la OT
    // Si se aprueba, sumarlo al costoTotal de la OT y crear el TrabajoOT para los mecánicos
    if (estado === "APROBADO") {
      const otActual = await prisma.ordenTrabajo.findUnique({ where: { id: adicional.ordenTrabajoId }});
      
      await prisma.ordenTrabajo.update({
        where: { id: adicional.ordenTrabajoId },
        data: {
          costoTotal: { increment: adicional.monto },
          // Si estaba en presupuesto o diagnostico, lo pasamos a EN_PROGRESO automáticamente
          ...(otActual && (otActual.status === "PRESUPUESTADO" || otActual.status === "DIAGNOSTICO" || otActual.status === "INGRESADO") 
              ? { status: "EN_PROGRESO" } : {})
        }
      });
      
      // Crear el TrabajoOT para que los mecánicos lo vean en su panel
      await prisma.trabajoOT.create({
        data: {
          titulo: adicional.titulo,
          ordenTrabajoId: adicional.ordenTrabajoId,
          estado: "PENDIENTE",
          costoManoObra: adicional.monto
        }
      });

      await logOTAction(adicional.ordenTrabajoId, `Trabajo Adicional Aprobado por el cliente: ${adicional.titulo} ($${adicional.monto}) - Se agregó a la cola de trabajos.`);
    } else {
      await logOTAction(adicional.ordenTrabajoId, `Trabajo Adicional Rechazado: ${adicional.titulo}`);
      
      // Pasar a recomendaciones pendientes
      const ot = await prisma.ordenTrabajo.findUnique({
        where: { id: adicional.ordenTrabajoId },
        select: { vehiculoId: true }
      });
      if (ot && ot.vehiculoId) {
        await prisma.recomendacion.create({
          data: {
            descripcion: `Trabajo rechazado: ${adicional.titulo} ${adicional.descripcion ? `(${adicional.descripcion})` : ""}`,
            estado: "PENDIENTE",
            vehiculoId: ot.vehiculoId
          }
        });
      }
    }
    
    revalidatePath("/dashboard");
    revalidatePath("/seguimiento/[token]");
    return JSON.parse(JSON.stringify({ success: true, adicional }));
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
