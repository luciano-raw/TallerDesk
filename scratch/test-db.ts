import { createOT } from '../src/lib/db-actions';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Iniciando prueba de Base de Datos...');

    // 1. Create a mock Taller to use for the test
    const taller = await prisma.taller.create({
        data: {
            nombre: 'Taller de Prueba ' + Date.now(),
            slug: 'taller-prueba-' + Date.now(),
            plan: 'FREE'
        }
    });

    console.log('Taller creado:', taller.id);

    try {
        const result = await createOT({
            tallerId: taller.id,
            clienteNombre: 'Juan Perez',
            clienteRut: '12345678-9',
            clienteTelefono: '+56912345678',
            patente: 'ABCD12',
            marca: 'Toyota',
            modelo: 'Yaris',
            kilometraje: 50000,
            combustible: 50,
            observaciones: 'Hace un ruido raro',
            tareasAdicionales: ['Cambiar aceite']
        });

        console.log('Resultado createOT:', JSON.stringify(result, null, 2));

        if (result.success) {
            // Find the OT directly to see if TrabajoOT is created
            const ot = await prisma.ordenTrabajo.findUnique({
                where: { id: result.ot.id },
                include: { trabajos: { include: { tareas: true } } }
            });
            console.log('OT guardada en DB con sus trabajos:', JSON.stringify(ot, null, 2));
        }

    } catch (error) {
        console.error('Error durante la ejecución:', error);
    } finally {
        // Cleanup
        console.log('Limpiando base de datos...');
        const ots = await prisma.ordenTrabajo.findMany({ where: { tallerId: taller.id } });
        for (const ot of ots) {
            await prisma.tareaTrabajo.deleteMany({ where: { trabajo: { ordenTrabajoId: ot.id } } });
            await prisma.trabajoOT.deleteMany({ where: { ordenTrabajoId: ot.id } });
            await prisma.bitacoraOT.deleteMany({ where: { ordenTrabajoId: ot.id } });
        }
        await prisma.ordenTrabajo.deleteMany({ where: { tallerId: taller.id } });
        await prisma.vehiculo.deleteMany({ where: { tallerId: taller.id } });
        await prisma.cliente.deleteMany({ where: { tallerId: taller.id } });
        await prisma.taller.delete({ where: { id: taller.id } });
        console.log('Limpieza completada.');
    }
}

main();
