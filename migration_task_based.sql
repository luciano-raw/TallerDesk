-- AlterTable
ALTER TABLE "TrabajoOT" 
  ADD COLUMN "esAdicional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "estadoAprobacion" TEXT NOT NULL DEFAULT 'APROBADO',
  ADD COLUMN "fechaAprobacion" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RepuestoOT" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "monto" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "trabajoId" TEXT NOT NULL,
    "inventarioItemId" TEXT,

    CONSTRAINT "RepuestoOT_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RepuestoOT" ADD CONSTRAINT "RepuestoOT_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "TrabajoOT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepuestoOT" ADD CONSTRAINT "RepuestoOT_inventarioItemId_fkey" FOREIGN KEY ("inventarioItemId") REFERENCES "InventarioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
