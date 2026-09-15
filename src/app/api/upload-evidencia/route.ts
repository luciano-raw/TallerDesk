import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { ordenTrabajoId, trabajoId, esRecepcion, url, descripcion } = await req.json();

    if (!ordenTrabajoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const data: any = {
      ordenTrabajoId,
      url,
      esRecepcion: !!esRecepcion,
      descripcion: descripcion || ""
    };

    if (trabajoId) {
      data.trabajoId = trabajoId;
    }

    const foto = await prisma.fotoOT.create({
      data
    });

    return NextResponse.json({ success: true, data: foto });
  } catch (error: any) {
    console.error("Error en /api/upload-evidencia:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
