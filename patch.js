const fs = require('fs');
let code = fs.readFileSync('src/lib/db-actions.ts', 'utf8');

// Patch updateTrabajoEstado
const target1 =     const trabajo = await prisma.trabajoOT.update({
      where: { id: trabajoId },
      data: { estado }
    });
    revalidatePath("/dashboard");;

const replacement1 =     const trabajo = await prisma.trabajoOT.update({
      where: { id: trabajoId },
      data: { estado }
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
              accion: "Estado cambiado a CONTROL CALIDAD",
              descripcion: "Todos los trabajos asignados fueron finalizados por los técnicos."
            }
          });
        }
      }
    }

    revalidatePath("/dashboard");;

code = code.replace(target1, replacement1);

// Patch updateTrabajoAdicionalEstado
const target2 =     // Si se aprueba, sumarlo al costoTotal de la OT
    if (estado === "APROBADO") {
      await prisma.ordenTrabajo.update({
        where: { id: adicional.ordenTrabajoId },
        data: {
          costoTotal: { increment: adicional.monto }
        }
      });
      await logOTAction(adicional.ordenTrabajoId, \Trabajo Adicional Aprobado por el cliente: \ ($\)\);
    } else {;

const replacement2 =     // Si se aprueba, sumarlo al costoTotal de la OT y crear el TrabajoOT para los mecánicos
    if (estado === "APROBADO") {
      const otActual = await prisma.ordenTrabajo.findUnique({ where: { id: adicional.ordenTrabajoId }});
      
      await prisma.ordenTrabajo.update({
        where: { id: adicional.ordenTrabajoId },
        data: {
          costoTotal: { increment: adicional.monto },
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

      await logOTAction(adicional.ordenTrabajoId, \Trabajo Adicional Aprobado por el cliente: \ ($\) - Se agregó a la cola de trabajos.\);
    } else {;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/lib/db-actions.ts', code);
console.log("Patched!");
