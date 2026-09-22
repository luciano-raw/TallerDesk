import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MobileUploadClient } from "./mobile-upload-client";
import { Metadata } from "next";

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export const metadata: Metadata = {
  title: "Cmara - TallerDesk",
  // meta: [
  //   { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" }
  // ]
};

export default async function MobileUploadPage({ params }: { params: Promise<{ otId: string }> }) {
  const resolvedParams = await params;
  
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: resolvedParams.otId },
    include: { taller: true }
  });

  if (!ot) return notFound();

  return (
    <MobileUploadClient 
      otId={ot.id} 
      tallerNombre={ot.taller.nombre}
    />
  );
}
