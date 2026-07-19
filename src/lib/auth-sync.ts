import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function syncUser() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    // 1. Intentar buscar por clerkId
    let dbUser = await prisma.usuario.findUnique({
      where: { clerkId: clerkUser.id },
      include: { taller: true }
    });

    if (!dbUser) {
      const emailLower = email.toLowerCase().trim();
      
      // 2. Si no existe, ver si existe el email para vincular (ej. si fue precargado por admin)
      const existingEmail = await prisma.usuario.findUnique({
        where: { email: emailLower }
      });

      if (existingEmail) {
        // Vincular clerkId
        dbUser = await prisma.usuario.update({
          where: { id: existingEmail.id },
          data: { clerkId: clerkUser.id },
          include: { taller: true }
        });
      } else {
        // 3. Crear nuevo usuario desde cero
        // luciano.raw04@gmail.com es el SUPER_ADMIN global del sistema
        const isSuperAdmin = emailLower === "luciano.raw04@gmail.com";

        dbUser = await prisma.usuario.create({
          data: {
            clerkId: clerkUser.id,
            email: emailLower,
            nombre: clerkUser.fullName || clerkUser.username || "Usuario sin nombre",
            role: isSuperAdmin ? "SUPER_ADMIN" : "TALLER_TECNICO", // Por defecto técnico sin taller
          },
          include: { taller: true }
        });
      }
    } else {
      // Si ya existe, nos aseguramos de que si es luciano.raw04@gmail.com sea SUPER_ADMIN
      const isSuperAdmin = email.toLowerCase().trim() === "luciano.raw04@gmail.com";
      if (isSuperAdmin && dbUser.role !== "SUPER_ADMIN") {
        dbUser = await prisma.usuario.update({
          where: { id: dbUser.id },
          data: { role: "SUPER_ADMIN" },
          include: { taller: true }
        });
      }

      // Actualizar nombre si cambió en Clerk
      const fullName = clerkUser.fullName || clerkUser.username || dbUser.nombre;
      if (dbUser.nombre !== fullName) {
        dbUser = await prisma.usuario.update({
          where: { id: dbUser.id },
          data: { nombre: fullName },
          include: { taller: true }
        });
      }
    }

    return dbUser;
  } catch (error) {
    console.error("Error en syncUser helper:", error);
    return null;
  }
}
