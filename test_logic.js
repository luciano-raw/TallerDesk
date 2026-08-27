const dbMecanicos = [{ id: '1', nombre: 'soyun imbecil' }];
const ots = [
  {
    status: 'EN_PROGRESO',
    trabajos: [
      { tecnicoId: '1', estado: 'PENDIENTE', estimacionMinutos: 0 },
      { tecnicoId: '1', estado: 'PENDIENTE', estimacionMinutos: 0 },
      { tecnicoId: '1', estado: 'PENDIENTE', estimacionMinutos: 0 }
    ]
  }
];

const mechanicWorkloads = dbMecanicos.map(m => {
  let activeTrabajos = 0;
  let tiempoEstimadoTotal = 0;

  ots.forEach(o => {
    if (o.status !== "ENTREGADO" && o.status !== "LISTO_ENTREGA" && o.status !== "ANULADO") {
      const trabajosAsignados = (o.trabajos || []).filter(t => t.tecnicoId === m.id && t.estado !== "FINALIZADO");
      activeTrabajos += trabajosAsignados.length;
      trabajosAsignados.forEach(t => {
        tiempoEstimadoTotal += (t.estimacionMinutos || 0);
      });
    }
  });

  return { ...m, activeOts: activeTrabajos };
});

console.log(mechanicWorkloads);
