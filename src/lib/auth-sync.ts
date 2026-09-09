import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

export async function syncUser() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    const emailLower = email.toLowerCase().trim();

    // 1. Buscar si hay perfiles vinculados a este clerkId o email
    let dbUsers = await prisma.usuario.findMany({
      where: {
        OR: [
          { clerkId: clerkUser.id },
          { email: emailLower }
        ]
      },
      include: { taller: true }
    });

    if (dbUsers.length === 0) {
      // 2. Crear nuevo usuario desde cero si no existe en la BD
      const isSuperAdmin = emailLower === "luciano.raw04@gmail.com";
      const newUser = await prisma.usuario.create({
        data: {
          clerkId: clerkUser.id,
          email: emailLower,
          nombre: clerkUser.fullName || clerkUser.username || "Usuario sin nombre",
          roles: isSuperAdmin ? ["SUPER_ADMIN"] : ["TALLER_TECNICO"],
        },
        include: { taller: true }
      });
      dbUsers = [newUser];
    } else {
      // 3. Vincular clerkId y email a los que lo tengan desactualizado (ej: invitado por email)
      for (const u of dbUsers) {
        let updateData: any = {};
        if (u.clerkId !== clerkUser.id) updateData.clerkId = clerkUser.id;
        if (u.email !== emailLower) updateData.email = emailLower;
        
        if (Object.keys(updateData).length > 0) {
          await prisma.usuario.update({
            where: { id: u.id },
            data: updateData
          });
          u.clerkId = clerkUser.id;
          u.email = emailLower;
        }
      }
    }

    // 4. Identificar el Taller Activo usando la Cookie
    const cookieStore = await cookies();
    const activeTallerId = cookieStore.get("tallerdesk_active_taller")?.value;

    let selectedUser = null;

    if (activeTallerId) {
      // Si hay cookie, buscar el perfil que corresponde a ese taller
      selectedUser = dbUsers.find(u => u.tallerId === activeTallerId);
    } 

    if (!selectedUser && dbUsers.length === 1) {
      // Si no hay cookie pero solo pertenece a un taller (o 0), se auto-selecciona
      selectedUser = dbUsers[0];
    }

    if (selectedUser) {
      // Actualizar nombre y rol de Super Admin si aplica
      const isSuperAdmin = emailLower === "luciano.raw04@gmail.com";
      const fullName = clerkUser.fullName || clerkUser.username || selectedUser.nombre;
      
      let needsUpdate = false;
      let updateData: any = {};

      if (isSuperAdmin && !selectedUser.roles.includes("SUPER_ADMIN")) {
        updateData.roles = ["SUPER_ADMIN"];
        needsUpdate = true;
      }
      if (fullName !== selectedUser.nombre) {
        updateData.nombre = fullName;
        needsUpdate = true;
      }

      if (needsUpdate) {
        selectedUser = await prisma.usuario.update({
          where: { id: selectedUser.id },
          data: updateData,
          include: { taller: true }
        });
      }

      return selectedUser;
    }

    // 5. Si tiene varios talleres y no hay cookie, forzamos selección
    return {
      _requiresTallerSelection: true,
      talleresDisponibles: dbUsers.filter(u => u.tallerId).map(u => ({ id: u.tallerId, nombre: u.taller?.nombre || "Taller sin nombre" })),
      ...dbUsers[0] // Mandamos los datos base del primer perfil
    } as any;

  } catch (error) {
    console.error("Error en syncUser helper:", error);
    return null;
  }
}
