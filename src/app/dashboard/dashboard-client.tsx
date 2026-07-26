"use client";

import React, { useState, useEffect } from "react";
import { useSystemAuth } from "@/components/auth-wrapper";
import { UserButton } from "@/components/auth-wrapper";
import Link from "next/link";
import { 
  Car, 
  ClipboardList, 
  DollarSign, 
  Plus, 
  ExternalLink, 
  User, 
  Wrench, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Search,
  UserPlus,
  Copy,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { 
  getTallerOTs, 
  createOT, 
  updateOTStatus, 
  assignOTMecanico, 
  getTallerUsuarios,
  createTallerWorker,
  deleteOT,
  updateOTCosts,
  addPresupuestoItem,
  deletePresupuestoItem,
  setPresupuestoAdicional,
  getInventarioItems,
  createInventarioItem,
  updateInventarioItem,
  deleteInventarioItem,
  adjustInventarioStock,
  toggleTareaChecklist, 
  updateOTDiagnostico, 
  addOTFoto, 
  upgradeToAdmin,
  searchMarketplaceParts,
  asociarRepuestoAOT,
  updateUserPermissions
} from "@/lib/db-actions";

interface OT {
  id: string;
  codigo: string;
  patente: string;
  vehiculo: string;
  cliente: string;
  status: "INGRESADO" | "DIAGNOSTICO" | "PRESUPUESTADO" | "EN_PROGRESO" | "CONTROL_CALIDAD" | "LISTO_ENTREGA" | "ENTREGADO";
  tecnico: string;
  tecnicoId?: string;
  costoManoObra: number;
  repuestosCost: number;
  costoTotal: number;
  itemsPresupuesto?: any[];
  tokenSeguro?: string;
  createdAt?: string;
}

const initialOTs: OT[] = [];

export default function DashboardClient({ initialDbUser }: { initialDbUser: any }) {
  const { role, user, permisos, tallerName, isDemoMode } = useSystemAuth();
  const [ots, setOts] = useState<OT[]>(initialOTs);
  const [dbMecanicos, setDbMecanicos] = useState<{ id: string; nombre: string }[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [newWorker, setNewWorker] = useState({ nombre: "", email: "", role: "TALLER_TECNICO" });
  const [formClient, setFormClient] = useState({ nombre: "", rut: "", telefono: "" });
  const [formVehiculo, setFormVehiculo] = useState({ patente: "", marca: "", modelo: "", kilometraje: "" });
  const [formOT, setFormOT] = useState({ combustible: "50", observaciones: "" });
  const [activeTab, setActiveTab] = useState<"ots" | "crear" | "trabajadores" | "bodega" | "marketplace">("ots");
  const [notification, setNotification] = useState<string | null>(null);
  const [customTasks, setCustomTasks] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");

  const handleAddCustomTask = () => {
    if (!newTaskInput.trim()) return;
    setCustomTasks([...customTasks, newTaskInput.trim()]);
    setNewTaskInput("");
  };

  const handleRemoveCustomTask = (indexToRemove: number) => {
    setCustomTasks(customTasks.filter((_, idx) => idx !== indexToRemove));
  };

  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleDeleteOT = async (id: string, codigo: string) => {
    const firstConfirm = window.confirm(`¿Estás seguro de que deseas dar de baja la orden ${codigo}?`);
    if (!firstConfirm) return;
    
    const secondConfirm = window.confirm(`¡Atención! Esto eliminará de forma permanente la orden ${codigo} junto con su checklist y fotos. ¿Confirmas la baja permanente?`);
    if (!secondConfirm) return;

    if (!isDemoMode) {
      const res = await deleteOT(id);
      if (res.success) {
        triggerNotification(`Orden ${codigo} dada de baja correctamente.`);
        fetchDbData();
      } else {
        triggerNotification(`Error al eliminar: ${res.error}`);
      }
    } else {
      setOts(ots.filter(o => o.id !== id));
      triggerNotification(`Orden ${codigo} dada de baja (Demo).`);
    }
  };

  const [searchOTQuery, setSearchOTQuery] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [activeManageCostsOT, setActiveManageCostsOT] = useState<any>(null);


  const [selectedDetailOT, setSelectedDetailOT] = useState<any>(null);
  const [newCostItemType, setNewCostItemType] = useState<"MANO_OBRA" | "REPUESTO">("MANO_OBRA");
  const [newCostItemDesc, setNewCostItemDesc] = useState("");
  const [newCostItemMonto, setNewCostItemMonto] = useState("");
  const [newAdicionalDetalle, setNewAdicionalDetalle] = useState("");
  const [newAdicionalMonto, setNewAdicionalMonto] = useState("");

  // --- Estados de Bodega ---
  const [inventarioItems, setInventarioItems] = useState<any[]>([]);
  const [searchBodegaQuery, setSearchBodegaQuery] = useState("");
  const [filterBodegaTipo, setFilterBodegaTipo] = useState<"TODOS" | "REPUESTO" | "INSUMO">("TODOS");
  const [showAddBodegaModal, setShowAddBodegaModal] = useState(false);
  const [editingBodegaItem, setEditingBodegaItem] = useState<any>(null);
  const [isSavingBodegaItem, setIsSavingBodegaItem] = useState(false);
  const [newBodegaItem, setNewBodegaItem] = useState({
    nombre: "",
    sku: "",
    tipo: "REPUESTO" as "REPUESTO" | "INSUMO",
    cantidad: 0,
    precioUnitario: 0,
    ubicacion: ""
  });

  // --- Estados de Marketplace ---
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
  const [searchMarketplaceQuery, setSearchMarketplaceQuery] = useState("");
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [asociarOTPartId, setAsociarOTPartId] = useState<string | null>(null);
  const [asociarTargetOTId, setAsociarTargetOTId] = useState("");
  const [isAssociatingPart, setIsAssociatingPart] = useState(false);

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingWorkerPermissions, setEditingWorkerPermissions] = useState<any>(null);
  const [newPermissions, setNewPermissions] = useState<any>({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  
  const handleOpenPermissions = (worker: any) => {
    setEditingWorkerPermissions(worker);
    setNewPermissions(worker.permisos || {});
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (isDemoMode) {
      triggerNotification("Permisos guardados (Demo)");
      setShowPermissionsModal(false);
      return;
    }
    setIsSavingPermissions(true);
    const res = await updateUserPermissions(editingWorkerPermissions.id, newPermissions);
    setIsSavingPermissions(false);
    if (res.success) {
      triggerNotification("Permisos actualizados correctamente");
      const updatedWorkers = workers.map(w => w.id === editingWorkerPermissions.id ? { ...w, permisos: newPermissions } : w);
      setWorkers(updatedWorkers);
      setShowPermissionsModal(false);
    } else {
      triggerNotification("Error al guardar permisos: " + res.error);
    }
  };

  const handleOpenManageCosts = (ot: any) => {
    setActiveManageCostsOT(ot);
    setNewAdicionalDetalle(ot.presupuestoDetalle || "");
    setNewAdicionalMonto(ot.presupuestoMonto ? String(ot.presupuestoMonto) : "");
    setNewCostItemDesc("");
    setNewCostItemMonto("");
  };

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSavingAdicional, setIsSavingAdicional] = useState(false);

  const handleAddCostItem = async () => {
    if (!activeManageCostsOT) return;
    if (!newCostItemDesc || !newCostItemMonto) {
      triggerNotification("⚠️ Completa descripción y monto.");
      return;
    }
    const amount = Number(newCostItemMonto);
    if (isNaN(amount) || amount <= 0) {
      triggerNotification("⚠️ Monto inválido.");
      return;
    }

    setIsAddingItem(true);
    try {
      if (!isDemoMode) {
        const res = await addPresupuestoItem({
          otId: activeManageCostsOT.id,
          tipo: newCostItemType,
          descripcion: newCostItemDesc,
          monto: amount
        });
        if (res.success) {
          triggerNotification("🟢 Ítem agregado correctamente al presupuesto.");
          await fetchDbData(activeManageCostsOT.id);
          setNewCostItemDesc("");
          setNewCostItemMonto("");
        } else {
          triggerNotification(`❌ Error: ${res.error}`);
        }
      } else {
        triggerNotification("Operación no disponible en Demo.");
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification(`❌ Error: ${err.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteCostItem = async (itemId: string) => {
    if (!activeManageCostsOT) return;
    if (!isDemoMode) {
      const res = await deletePresupuestoItem(itemId, activeManageCostsOT.id);
      if (res.success) {
        triggerNotification("Valor eliminado.");
        await fetchDbData(activeManageCostsOT.id);
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    }
  };

  const handleSaveAdicional = async () => {
    if (!activeManageCostsOT) return;
    const amount = Number(newAdicionalMonto || 0);

    setIsSavingAdicional(true);
    try {
      if (!isDemoMode) {
        const res = await setPresupuestoAdicional({
          otId: activeManageCostsOT.id,
          detalle: newAdicionalDetalle,
          monto: amount
        });
        if (res.success) {
          triggerNotification("🟢 Presupuesto adicional enviado al cliente.");
          await fetchDbData(activeManageCostsOT.id);
        } else {
          triggerNotification(`❌ Error: ${res.error}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification(`❌ Error: ${err.message}`);
    } finally {
      setIsSavingAdicional(false);
    }
  };

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const copyTrackingLink = (tokenSeguro: string) => {
    const fullUrl = `${window.location.origin}/seguimiento/${tokenSeguro}`;
    navigator.clipboard.writeText(fullUrl);
    triggerNotification("📋 ¡Enlace de seguimiento copiado!");
  };

  // --- Handlers de Bodega ---

  const handleSaveBodegaItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBodegaItem.nombre) return;
    const tallerId = initialDbUser?.tallerId || "demo-taller";

    setIsSavingBodegaItem(true);
    try {
      if (!isDemoMode) {
        if (editingBodegaItem) {
          const res = await updateInventarioItem(editingBodegaItem.id, newBodegaItem);
          if (res.success) {
            triggerNotification("🟢 Ítem editado en Bodega.");
            setEditingBodegaItem(null);
            setShowAddBodegaModal(false);
            await fetchDbData();
          } else {
            triggerNotification(`❌ Error: ${res.error}`);
          }
        } else {
          const res = await createInventarioItem({
            tallerId,
            ...newBodegaItem
          });
          if (res.success) {
            triggerNotification("🟢 Nuevo ítem registrado en Bodega.");
            setShowAddBodegaModal(false);
            setNewBodegaItem({ nombre: "", sku: "", tipo: "REPUESTO", cantidad: 0, precioUnitario: 0, ubicacion: "" });
            await fetchDbData();
          } else {
            triggerNotification(`❌ Error: ${res.error}`);
          }
        }
      } else {
        // Modo Demo
        if (editingBodegaItem) {
          setInventarioItems(inventarioItems.map(i => i.id === editingBodegaItem.id ? { ...i, ...newBodegaItem } : i));
          triggerNotification("🟢 Ítem editado en Bodega (Demo).");
          setEditingBodegaItem(null);
        } else {
          const newItem = {
            id: `demo-${Date.now()}`,
            ...newBodegaItem
          };
          setInventarioItems([...inventarioItems, newItem]);
          triggerNotification("🟢 Ítem agregado a Bodega (Demo).");
        }
        setShowAddBodegaModal(false);
        setNewBodegaItem({ nombre: "", sku: "", tipo: "REPUESTO", cantidad: 0, precioUnitario: 0, ubicacion: "" });
      }
    } catch (err: any) {
      triggerNotification(`❌ Error: ${err.message}`);
    } finally {
      setIsSavingBodegaItem(false);
    }
  };

  const handleDeleteBodegaItem = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este ítem de la bodega?")) {
      if (!isDemoMode) {
        const res = await deleteInventarioItem(id);
        if (res.success) {
          triggerNotification("🟢 Ítem eliminado de Bodega.");
          await fetchDbData();
        } else {
          triggerNotification(`❌ Error: ${res.error}`);
        }
      } else {
        setInventarioItems(inventarioItems.filter(i => i.id !== id));
        triggerNotification("🟢 Ítem eliminado de Bodega (Demo).");
      }
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    if (!isDemoMode) {
      const res = await adjustInventarioStock(id, delta);
      if (res.success) {
        await fetchDbData();
      } else {
        triggerNotification(`❌ Error: ${res.error}`);
      }
    } else {
      setInventarioItems(inventarioItems.map(i => {
        if (i.id === id) {
          return { ...i, cantidad: Math.max(0, i.cantidad + delta) };
        }
        return i;
      }));
    }
  };

  // --- Handlers de Marketplace ---

  const handleSearchMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMarketplaceQuery || searchMarketplaceQuery.trim() === "") return;

    setLoadingMarketplace(true);
    try {
      const results = await searchMarketplaceParts(searchMarketplaceQuery);
      setMarketplaceItems(results);
    } catch (err: any) {
      triggerNotification(`❌ Error al buscar: ${err.message}`);
    } finally {
      setLoadingMarketplace(false);
    }
  };

  const handleAsociarRepuestoAOT = async (part: any) => {
    if (!asociarTargetOTId) {
      triggerNotification("⚠️ Selecciona una Orden de Trabajo.");
      return;
    }
    setIsAssociatingPart(true);
    try {
      if (!isDemoMode) {
        const res = await asociarRepuestoAOT(asociarTargetOTId, part.nombre, part.precio);
        if (res.success) {
          triggerNotification(`🟢 Asociado: "${part.nombre}" agregado a la OT.`);
          setAsociarOTPartId(null);
          setAsociarTargetOTId("");
          await fetchDbData();
        } else {
          triggerNotification(`❌ Error: ${res.error}`);
        }
      } else {
        // Modo demo
        triggerNotification(`🟢 Asociado: "${part.nombre}" agregado a la OT (Demo).`);
        setAsociarOTPartId(null);
        setAsociarTargetOTId("");
      }
    } catch (err: any) {
      triggerNotification(`❌ Error: ${err.message}`);
    } finally {
      setIsAssociatingPart(false);
    }
  };

  // Helper para recargar datos reales del taller desde Supabase
  const fetchDbData = async (activeOtId?: string) => {
    const tallerId = initialDbUser?.tallerId;
    if (!isDemoMode && tallerId) {
      const dbOts = await getTallerOTs(tallerId);
      const mappedOts = dbOts.map((dbOt: any) => {
        const manoObra = Number(dbOt.costoManoObra || 0);
        const total = Number(dbOt.costoTotal || 0);
        return {
          id: dbOt.id,
          codigo: dbOt.codigo,
          patente: dbOt.vehiculo.patente,
          vehiculo: `${dbOt.vehiculo.marca} ${dbOt.vehiculo.modelo}`,
          cliente: dbOt.vehiculo.cliente.nombre,
          status: dbOt.status,
          tecnico: dbOt.tecnico ? dbOt.tecnico.nombre : "Sin Asignar",
          tecnicoId: dbOt.tecnicoId || null,
          costoManoObra: manoObra,
          costoTotal: total,
          repuestosCost: dbOt.itemsPresupuesto
            ? dbOt.itemsPresupuesto.filter((i: any) => i.tipo === "REPUESTO").reduce((acc: number, curr: any) => acc + curr.monto, 0)
            : 0,
          presupuestoDetalle: dbOt.presupuestoDetalle,
          presupuestoMonto: Number(dbOt.presupuestoMonto || 0),
          presupuestoEstado: dbOt.presupuestoEstado,
          itemsPresupuesto: dbOt.itemsPresupuesto || [],
          bitacora: dbOt.bitacora || [],
          fotos: dbOt.fotos || [],
          checklist: dbOt.checklist || [],
          tokenSeguro: dbOt.tokenSeguro,
          createdAt: dbOt.createdAt ? new Date(dbOt.createdAt).toISOString() : new Date().toISOString()
        };
      });
      setOts(mappedOts);

      if (activeOtId) {
        const refetchedOT = mappedOts.find((o: any) => o.id === activeOtId);
        if (refetchedOT) setActiveManageCostsOT(refetchedOT);
      }

      const users = await getTallerUsuarios(tallerId);
      setWorkers(users);
      const filteredMecanicos = users.filter(u => u.role === "TALLER_TECNICO");
      setDbMecanicos(filteredMecanicos.map(u => ({ id: u.id, nombre: u.nombre })));

      // Cargar ítems de Bodega
      const items = await getInventarioItems(tallerId);
      setInventarioItems(items);
    } else {
      // Modo Demo
      setInventarioItems([
        { id: "demo-item-1", nombre: "Filtro de Aceite Suzuki Swift", sku: "SUZ-FA-10", tipo: "REPUESTO", cantidad: 5, precioUnitario: 8990, ubicacion: "Estante A-1" },
        { id: "demo-item-2", nombre: "Pastillas de Freno Toyota Yaris", sku: "TOY-PF-23", tipo: "REPUESTO", cantidad: 0, precioUnitario: 24900, ubicacion: "Estante B-3" },
        { id: "demo-item-3", nombre: "Silicona Alta Temperatura Gris", sku: "INS-SI-02", tipo: "INSUMO", cantidad: 12, precioUnitario: 4500, ubicacion: "Caja 5" },
        { id: "demo-item-4", nombre: "Bujías de Iridio Denso", sku: "BUJ-DE-88", tipo: "REPUESTO", cantidad: 2, precioUnitario: 7500, ubicacion: "Estante A-4" }
      ]);
    }
  };

  useEffect(() => {
    if (!isDemoMode && initialDbUser?.tallerId) {
      fetchDbData();
    }
  }, [isDemoMode, initialDbUser, user]);

  if (role === "TALLER_TECNICO") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute top-4 right-4">
          <UserButton />
        </div>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 animate-pulse">
          <Wrench size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vista de Técnico Detectada</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Los mecánicos operan desde una interfaz especial optimizada para celulares dentro del taller.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/tecnico"
            className="flex justify-center items-center gap-2 px-6 h-11 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
          >
            Ir a Vista Móvil de Técnico
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  if (role === "PENDIENTE") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute top-4 right-4">
          <UserButton />
        </div>
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Cuenta Pendiente</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Tu cuenta está pendiente de aprobación o de asignación de rol.
          <br/>Por favor espera a que un administrador te asigne a un taller para poder ingresar.
        </p>
      </div>
    );
  }

  if (role === "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 text-red-500 flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Modo Super Administrador</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Estás logueado como administrador global de TallerDesk. No tienes un taller operativo asignado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/super-admin"
            className="flex items-center justify-center gap-2 px-6 h-11 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
          >
            Ir a Consola SaaS B2B
          </Link>
          {isDemoMode && (
            <div className="bg-card border border-border p-3.5 rounded-lg text-xs max-w-sm flex items-center justify-center">
              <span>💡 Cambia tu rol a **T. Admin** o **Recep** abajo a la derecha para ver este panel.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleCreateOT = async () => {
    if (submitting) return;
    if (!formClient.nombre || !formVehiculo.patente || !formVehiculo.marca) {
      triggerNotification("⚠️ Por favor completa los campos obligatorios del cliente y vehículo.");
      setShowConfirmModal(false);
      return;
    }

    setSubmitting(true);
    const tallerId = initialDbUser?.tallerId;

    try {
      if (!isDemoMode && tallerId) {
        const res = await createOT({
          tallerId,
          clienteNombre: formClient.nombre,
          clienteRut: formClient.rut || "SIN-RUT",
          clienteTelefono: formClient.telefono || "",
          patente: formVehiculo.patente.toUpperCase(),
          marca: formVehiculo.marca,
          modelo: formVehiculo.modelo,
          kilometraje: Number(formVehiculo.kilometraje || 0),
          combustible: Number(formOT.combustible || 50),
          observaciones: formOT.observaciones,
          tareasAdicionales: customTasks
        });

        if (res.success) {
          triggerNotification(`¡Orden ${res.ot?.codigo} creada en Supabase!`);
          fetchDbData();
          setActiveTab("ots");
          setFormClient({ nombre: "", rut: "", telefono: "" });
          setFormVehiculo({ patente: "", marca: "", modelo: "", kilometraje: "" });
          setFormOT({ combustible: "50", observaciones: "" });
          setCustomTasks([]);
          setNewTaskInput("");
        } else {
          triggerNotification(`Error al crear OT: ${res.error}`);
        }
      } else {
        const nextCorrelative = 1000 + ots.length + 22;
        const nuevaOT: OT = {
          id: `ot_${Date.now()}`,
          codigo: `OT-${nextCorrelative}`,
          patente: formVehiculo.patente.toUpperCase(),
          vehiculo: `${formVehiculo.marca} ${formVehiculo.modelo}`,
          cliente: formClient.nombre,
          status: "INGRESADO",
          tecnico: "Sin Asignar",
          costoManoObra: 0,
          repuestosCost: 0,
          costoTotal: 0,
          tokenSeguro: `token-${Date.now()}`
        };
        setOts([nuevaOT, ...ots]);
        triggerNotification(`¡Orden ${nuevaOT.codigo} creada con éxito!`);
        setActiveTab("ots");
        setFormClient({ nombre: "", rut: "", telefono: "" });
        setFormVehiculo({ patente: "", marca: "", modelo: "", kilometraje: "" });
        setFormOT({ combustible: "50", observaciones: "" });
        setCustomTasks([]);
        setNewTaskInput("");
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: OT["status"]) => {
    if (!isDemoMode) {
      const res = await updateOTStatus(id, newStatus);
      if (res.success) {
        triggerNotification(`Estado de OT actualizado a ${newStatus} en Supabase.`);
        fetchDbData();
      }
    } else {
      setOts(ots.map(o => {
        if (o.id === id) {
          triggerNotification(`Orden ${o.codigo} cambiada a ${newStatus}.`);
          return { ...o, status: newStatus };
        }
        return o;
      }));
    }
  };

  const handleAssignTecnico = async (id: string, tecnicoIdOrName: string) => {
    if (!isDemoMode) {
      const actualId = tecnicoIdOrName === "Sin Asignar" ? null : tecnicoIdOrName;
      const res = await assignOTMecanico(id, actualId);
      if (res.success) {
        triggerNotification(`Mecánico asignado en Supabase.`);
        fetchDbData();
      }
    } else {
      setOts(ots.map(o => {
        if (o.id === id) {
          triggerNotification(`Mecánico asignado a la orden ${o.codigo}.`);
          return { ...o, tecnico: tecnicoIdOrName };
        }
        return o;
      }));
    }
  };

  const handleUpdateManoObra = async (id: string) => {
    // Deprecated for handleOpenManageCosts
  };

  const handleAddRepuestoCost = async (id: string, currentRepuestos: number) => {
    // Deprecated for handleOpenManageCosts
  };

  const handleInviteWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.nombre || !newWorker.email) return;

    const tallerId = initialDbUser?.tallerId;
    if (!isDemoMode && !tallerId) return;

    if (!isDemoMode && tallerId) {
      const res = await createTallerWorker({
        tallerId,
        nombre: newWorker.nombre,
        email: newWorker.email,
        role: newWorker.role as any
      });

      if (res.success) {
        triggerNotification(`¡Invitación enviada a ${newWorker.nombre}!`);
        fetchDbData();
        setNewWorker({ nombre: "", email: "", role: "TALLER_TECNICO" });
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      const mockNewWorker = {
        id: `w_${Date.now()}`,
        nombre: newWorker.nombre,
        email: newWorker.email,
        role: newWorker.role,
        clerkId: null,
        createdAt: new Date().toISOString()
      };
      setWorkers([...workers, mockNewWorker]);
      triggerNotification(`¡Trabajador ${newWorker.nombre} invitado (Demo)!`);
      setNewWorker({ nombre: "", email: "", role: "TALLER_TECNICO" });
    }
  };

  const filteredOts = ots.filter(o => {
    let matchesSearch = true;
    if (searchOTQuery.trim()) {
      const q = searchOTQuery.toLowerCase();
      matchesSearch = 
        o.codigo.toLowerCase().includes(q) || 
        o.patente.toLowerCase().includes(q) || 
        o.cliente.toLowerCase().includes(q) || 
        o.vehiculo.toLowerCase().includes(q);
    }
    
    let matchesDate = true;
    if (dateFilterStart && o.createdAt) {
      if (new Date(o.createdAt) < new Date(dateFilterStart)) matchesDate = false;
    }
    if (dateFilterEnd && o.createdAt) {
      // Add one day to end date to make it inclusive for the entire day
      const endD = new Date(dateFilterEnd);
      endD.setDate(endD.getDate() + 1);
      if (new Date(o.createdAt) >= endD) matchesDate = false;
    }
    
    return matchesSearch && matchesDate;
  });

  const mechanicWorkloads = dbMecanicos.map(m => {
    const activeOts = ots.filter(o => o.tecnicoId === m.id && o.status !== "ENTREGADO" && o.status !== "LISTO_ENTREGA").length;
    let statusLabel = "Disponible";
    let statusColor = "text-success bg-success/15";
    if (activeOts >= 3) {
      statusLabel = "Sobrecargado";
      statusColor = "text-red-500 bg-red-500/15";
    } else if (activeOts > 0) {
      statusLabel = "Ocupado";
      statusColor = "text-warning bg-warning/15";
    }
    return { ...m, activeOts, statusLabel, statusColor };
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Sparkles size={14} />
          {notification}
        </div>
      )}

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-primary tracking-tight">{tallerName}</span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary capitalize">
              Rol: {role.replace("TALLER_", "").toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 border-r border-border pr-4 mr-2">
              <button 
                onClick={() => setActiveTab("ots")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "ots" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                Órdenes de Trabajo
              </button>
              <button 
                onClick={() => setActiveTab("crear")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "crear" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                Nueva OT
              </button>
              {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_VIEW_BODEGA) && (
                <>
                  <button 
                    onClick={() => setActiveTab("bodega")} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "bodega" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Bodega
                  </button>
                  <button 
                    onClick={() => setActiveTab("marketplace")} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "marketplace" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Marketplace
                  </button>
                </>
              )}
              {(role === "TALLER_ADMIN" || permisos?.CAN_MANAGE_WORKERS) && (
                <button 
                  onClick={() => setActiveTab("trabajadores")} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "trabajadores" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Trabajadores
                </button>
              )}
            </nav>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Autos en Taller</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black">{ots.filter(o => o.status !== "ENTREGADO").length}</p>
              <Car size={20} className="text-primary" />
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">OTs en Diagnóstico</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black">{ots.filter(o => o.status === "DIAGNOSTICO").length}</p>
              <ClipboardList size={20} className="text-yellow-500" />
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Listos para Entrega</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black">{ots.filter(o => o.status === "LISTO_ENTREGA").length}</p>
              <Wrench size={20} className="text-success" />
            </div>
          </div>
          {role !== "TALLER_RECEP" && (
            <div className="bg-card border border-border p-4 rounded-xl">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Ingresos Estimados</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black">
                  ${ots.reduce((acc, o) => acc + (o.costoTotal ?? 0), 0).toLocaleString("es-CL")}
                </p>
                <DollarSign size={20} className="text-primary" />
              </div>
            </div>
          )}
        </div>

        {activeTab === "ots" && (
          <div className={`grid grid-cols-1 ${role === "TALLER_RECEP" ? "lg:grid-cols-4" : "lg:grid-cols-1"} gap-6`}>
            <div className={`bg-card border border-border rounded-xl shadow-sm overflow-hidden ${role === "TALLER_RECEP" ? "lg:col-span-3" : ""}`}>
              <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="font-bold text-base">Órdenes de Trabajo Activas</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 items-center text-xs">
                    <input 
                      type="date" 
                      value={dateFilterStart}
                      onChange={(e) => setDateFilterStart(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-input bg-background focus:outline-none focus:border-primary"
                    />
                    <span className="text-muted-foreground">a</span>
                    <input 
                      type="date" 
                      value={dateFilterEnd}
                      onChange={(e) => setDateFilterEnd(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-input bg-background focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={searchOTQuery}
                      onChange={(e) => setSearchOTQuery(e.target.value)}
                      placeholder="Buscar patente o cliente..." 
                      className="w-full h-8 pl-9 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Código OT</th>
                    <th className="p-4">Vehículo / Patente</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Asignado A</th>
                    <th className="p-4">Estado OT</th>
                    <th className="p-4">Costos acumulados</th>
                    <th className="p-4 text-center">Seguimiento</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOts.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-4 font-bold text-primary">
                        <button
                          onClick={() => setSelectedDetailOT(o)}
                          className="hover:underline hover:text-primary/80 transition-all font-extrabold cursor-pointer"
                        >
                          {o.codigo}
                        </button>
                      </td>
                      <td className="p-4 font-semibold">
                        <span className="block">{o.vehiculo}</span>
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{o.patente}</span>
                      </td>
                      <td className="p-4 text-muted-foreground font-medium">{o.cliente}</td>
                      <td className="p-4">
                        {(role === "TALLER_ADMIN" || role === "TALLER_JEFE") ? (
                          <select
                            value={(o as any).tecnicoId || o.tecnico}
                            onChange={(e) => handleAssignTecnico(o.id, e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                          >
                            <option value="Sin Asignar">Sin Asignar</option>
                            {!isDemoMode ? (
                              dbMecanicos.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))
                            ) : (
                              <>
                                <option value="Alexis Sánchez (Mecánico)">Alexis Sánchez</option>
                                <option value="Mauricio Isla (Mecánico)">Mauricio Isla</option>
                              </>
                            )}
                          </select>
                        ) : (
                          <span className="text-muted-foreground font-medium">{o.tecnico}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateStatus(o.id, e.target.value as any)}
                          className="bg-background border border-border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-primary"
                        >
                          <option value="INGRESADO">INGRESADO</option>
                          <option value="DIAGNOSTICO">DIAGNOSTICO</option>
                          <option value="PRESUPUESTADO">PRESUPUESTADO</option>
                          <option value="EN_PROGRESO">EN PROGRESO</option>
                          <option value="CONTROL_CALIDAD">CONTROL CALIDAD</option>
                          <option value="LISTO_ENTREGA">LISTO ENTREGA</option>
                          <option value="ENTREGADO">ENTREGADO</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="text-muted-foreground text-[10px]">
                          <p>Mano Obra: <span className="font-semibold text-foreground">${(o.costoManoObra ?? 0).toLocaleString("es-CL")}</span></p>
                          <p>Repuestos: <span className="font-semibold text-foreground">
                            ${(o.itemsPresupuesto || [])
                              .filter((i: any) => i.tipo === "REPUESTO")
                              .reduce((acc: number, curr: any) => acc + curr.monto, 0)
                              .toLocaleString("es-CL")}
                          </span></p>
                          <p className="font-bold text-primary mt-0.5">Total: ${(o.costoTotal ?? 0).toLocaleString("es-CL")}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Link 
                            href={`/seguimiento/${o.tokenSeguro}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs"
                          >
                            Ver Seguimiento
                            <ExternalLink size={11} />
                          </Link>
                          <button
                            onClick={() => copyTrackingLink(o.tokenSeguro || "")}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline font-semibold cursor-pointer border border-border bg-muted/40 hover:bg-muted px-2 py-0.5 rounded transition-all"
                          >
                            <Copy size={10} />
                            Copiar Link
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_EDIT_OT || permisos?.CAN_DELETE_OT) && (
                          <div className="flex flex-col items-end gap-1.5">
                            {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_EDIT_OT) && (
                              <button
                                onClick={() => handleOpenManageCosts(o)}
                                className="px-2 py-1 rounded bg-primary text-white text-[10px] font-bold hover:bg-primary/95 cursor-pointer w-full text-center"
                                title="Gestionar mano de obra, repuestos y presupuestos adicionales"
                              >
                                Gestionar Valores
                              </button>
                            )}
                            {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_DELETE_OT) && (
                              <button
                                onClick={() => handleDeleteOT(o.id, o.codigo)}
                                className="px-2 py-1 rounded bg-red-600/10 text-red-500 hover:bg-red-600/20 text-[10px] font-bold transition-all cursor-pointer w-full text-center"
                                title="Dar de Baja esta OT"
                              >
                                Dar de Baja
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            
            {/* PANEL LATERAL RECEPCIONISTA */}
            {role === "TALLER_RECEP" && (
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-5">
                  <h3 className="font-bold text-sm mb-4 border-b border-border pb-2 flex items-center gap-2">
                    <User size={14} className="text-primary"/>
                    Disponibilidad Mecánicos
                  </h3>
                  <div className="space-y-3">
                    {mechanicWorkloads.map(m => (
                      <div key={m.id} className="flex flex-col gap-1.5 p-3 border border-border rounded-lg bg-muted/10">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{m.nombre}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.statusColor}`}>
                            {m.statusLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>OTs en curso (No entregadas):</span>
                          <span className="font-bold text-foreground">{m.activeOts}</span>
                        </div>
                      </div>
                    ))}
                    {mechanicWorkloads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No hay mecánicos registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "crear" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto shadow-sm">
            <h2 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-border pb-3">
              <Plus size={20} className="text-primary" />
              Crear Nueva Orden de Trabajo (OT)
            </h2>

            <form onSubmit={handlePreSubmit} className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1">
                  <User size={14} />
                  1. Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Nombre Completo *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Claudio Morales"
                      value={formClient.nombre}
                      onChange={(e) => setFormClient({ ...formClient, nombre: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">RUT o DNI</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 12.345.678-9"
                      value={formClient.rut}
                      onChange={(e) => setFormClient({ ...formClient, rut: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Teléfono Móvil *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. +56998765432"
                      value={formClient.telefono}
                      onChange={(e) => setFormClient({ ...formClient, telefono: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1 border-t border-border pt-4">
                  <Car size={14} />
                  2. Información del Vehículo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Patente / Placa *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. ABCD12"
                      value={formVehiculo.patente}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, patente: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Marca *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Suzuki"
                      value={formVehiculo.marca}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, marca: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Modelo *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Swift"
                      value={formVehiculo.modelo}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Kilometraje Actual *</label>
                    <input 
                      type="number" 
                      required
                      placeholder="Ej. 42000"
                      value={formVehiculo.kilometraje}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, kilometraje: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 border-t border-border pt-4">
                  <ClipboardList size={14} />
                  3. Recepción y Detalles de Orden
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Nivel Est. Combustible ({formOT.combustible}%)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100"
                      value={formOT.combustible}
                      onChange={(e) => setFormOT({ ...formOT, combustible: e.target.value })}
                      className="w-full accent-primary mt-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold mb-1">Observaciones / Requerimientos</label>
                    <textarea 
                      rows={2}
                      placeholder="Ej. Ruidos en tren delantero al pasar baches. Mantención de 40.000 km..."
                      value={formOT.observaciones}
                      onChange={(e) => setFormOT({ ...formOT, observaciones: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 border-t border-border pt-4 flex items-center gap-1.5">
                  <ClipboardList size={14} />
                  4. Checklist de Tareas (Obligatorias + Personalizadas)
                </h3>
                <div className="space-y-4">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Tareas Obligatorias Iniciales (Siempre incluidas):</p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      <li>Inspección de niveles y fluidos</li>
                      <li>Revisión de frenos delanteros y traseros</li>
                      <li>Escaneo de códigos de falla (OBD-II)</li>
                      <li>Revisión visual de suspensión y dirección</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Agregar Tarea Personalizada</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ej. Cambiar foco trasero izquierdo..."
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTask}
                        className="h-9 px-4 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {customTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Tareas Personalizadas de esta Orden ({customTasks.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {customTasks.map((t, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-xs"
                          >
                            <span>{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomTask(idx)}
                              className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] hover:bg-primary/30 ml-1 font-bold cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 border-t border-border pt-4 mt-8">
                <button
                  type="button"
                  onClick={() => setActiveTab("ots")}
                  className="flex-1 h-10 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
                >
                  Crear Orden e Iniciar Recepción
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "trabajadores" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto shadow-sm">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-border pb-3">
                <UserPlus size={20} className="text-primary" />
                Registrar / Invitar Trabajador al Taller
              </h2>

              <form onSubmit={handleInviteWorker} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Juan Pérez"
                      value={newWorker.nombre}
                      onChange={(e) => setNewWorker({ ...newWorker, nombre: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold mb-1">Correo Electrónico (Clerk)</label>
                    <input 
                      type="email" 
                      required
                      placeholder="ejemplo@mecanico.com"
                      value={newWorker.email}
                      onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Rol Operativo</label>
                    <select
                      value={newWorker.role}
                      onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="TALLER_TECNICO">Mecánico / Técnico (Vista Móvil)</option>
                      <option value="TALLER_RECEP">Recepcionista (Dashboard Completo)</option>
                      <option value="TALLER_JEFE">Jefe de Taller (Dashboard + Bodega + Marketplace)</option>
                      <option value="TALLER_ADMIN">Co-Administrador / Socio (Dashboard Completo)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="h-10 px-6 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
                  >
                    Invitar Trabajador
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-bold text-base">Equipo del Taller</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Personas con acceso asignado o invitaciones enviadas.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-4">Nombre / Email</th>
                      <th className="p-4">Rol Asignado</th>
                      <th className="p-4">Estado Cuenta</th>
                      <th className="p-4">Fecha Registro</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workers.map((w) => (
                      <tr key={w.id} className="hover:bg-muted/35 transition-colors">
                        <td className="p-4">
                          <span className="font-semibold text-foreground block">{w.nombre}</span>
                          <span className="text-muted-foreground text-[10px] block mt-0.5">{w.email}</span>
                        </td>
                        <td className="p-4 uppercase font-semibold text-primary">
                          {w.role.replace("TALLER_", "")}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            w.clerkId 
                              ? "bg-success/15 text-success" 
                              : "bg-warning/15 text-warning animate-pulse"
                          }`}>
                            {w.clerkId ? "Habilitado / Registrado" : "Invitación Pendiente"}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {w.createdAt ? new Date(w.createdAt).toISOString().split("T")[0] : "Reciente"}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenPermissions(w)}
                            className="h-8 px-3 rounded-lg bg-secondary text-secondary-foreground text-[10px] font-bold hover:bg-secondary/80 transition-all flex items-center gap-1 ml-auto"
                          >
                            <ShieldAlert size={12} />
                            Permisos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: BODEGA */}
        {activeTab === "bodega" && (role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_VIEW_BODEGA) && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg">Bodega e Inventario del Taller</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Controla las refacciones, insumos y niveles de stock local.</p>
              </div>
              {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_MANAGE_BODEGA) && (
                <button
                onClick={() => {
                  setEditingBodegaItem(null);
                  setNewBodegaItem({ nombre: "", sku: "", tipo: "REPUESTO", cantidad: 0, precioUnitario: 0, ubicacion: "" });
                  setShowAddBodegaModal(true);
                }}
                className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                Agregar Ítem a Bodega
              </button>
              )}
            </div>

            {/* Alertas de Stock Crítico */}
            {inventarioItems.some(i => i.cantidad <= 2) && (
              <div className="bg-amber-600/10 border border-amber-600/20 text-amber-500 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold">⚠️ Alertas de Repuestos Críticos / Agotados:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {inventarioItems.filter(i => i.cantidad <= 2).map(item => (
                    <li key={item.id}>
                      <span className="font-semibold">{item.nombre}</span> - Stock actual: <span className="font-extrabold">{item.cantidad}</span> unidades ({item.cantidad === 0 ? "AGOTADO" : "Bajo Mínimo"}). Ubicación: {item.ubicacion || "No especificada"}.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabla de Bodega */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Buscar en bodega (Nombre, SKU)..."
                    value={searchBodegaQuery}
                    onChange={(e) => setSearchBodegaQuery(e.target.value)}
                    className="h-8 px-3 rounded-lg border border-input bg-background text-xs w-64 focus:outline-none focus:border-primary"
                  />
                  <select
                    value={filterBodegaTipo}
                    onChange={(e) => setFilterBodegaTipo(e.target.value as any)}
                    className="h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="TODOS">Todos los ítems</option>
                    <option value="REPUESTO">Solo Repuestos</option>
                    <option value="INSUMO">Solo Insumos</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-4">SKU</th>
                      <th className="p-4">Nombre de Ítem</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-center">Cantidad en Stock</th>
                      <th className="p-4 text-right">Precio Unitario</th>
                      <th className="p-4">Ubicación</th>
                      {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_MANAGE_BODEGA) && (
                        <th className="p-4 text-right">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inventarioItems
                      .filter(i => {
                        const matchesSearch = i.nombre.toLowerCase().includes(searchBodegaQuery.toLowerCase()) || (i.sku || "").toLowerCase().includes(searchBodegaQuery.toLowerCase());
                        const matchesType = filterBodegaTipo === "TODOS" || i.tipo === filterBodegaTipo;
                        return matchesSearch && matchesType;
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-mono font-bold text-muted-foreground">{item.sku || "N/A"}</td>
                          <td className="p-4 font-semibold text-foreground">{item.nombre}</td>
                          <td className="p-4">
                            <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              item.tipo === "REPUESTO" ? "bg-green-600/10 text-green-500" : "bg-blue-600/10 text-blue-500"
                            }`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleAdjustStock(item.id, -1)}
                                className="w-5 h-5 rounded bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className={`font-black text-sm px-2 ${item.cantidad === 0 ? "text-red-500 font-extrabold" : item.cantidad <= 2 ? "text-amber-500" : "text-foreground"}`}>
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => handleAdjustStock(item.id, 1)}
                                className="w-5 h-5 rounded bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right font-extrabold">${item.precioUnitario.toLocaleString("es-CL")}</td>
                          <td className="p-4 font-medium text-muted-foreground">{item.ubicacion || "Bodega General"}</td>
                          {(role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_MANAGE_BODEGA) && (
                            <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingBodegaItem(item);
                                setNewBodegaItem({
                                  nombre: item.nombre,
                                  sku: item.sku || "",
                                  tipo: item.tipo,
                                  cantidad: item.cantidad,
                                  precioUnitario: item.precioUnitario,
                                  ubicacion: item.ubicacion || ""
                                });
                                setShowAddBodegaModal(true);
                              }}
                              className="px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-bold text-[10px] cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteBodegaItem(item.id)}
                              className="px-2.5 py-1 rounded bg-red-600/10 text-red-500 hover:bg-red-600/20 font-bold text-[10px] cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: MARKETPLACE */}
        {activeTab === "marketplace" && (role === "TALLER_ADMIN" || role === "TALLER_JEFE" || permisos?.CAN_VIEW_BODEGA) && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-bold text-lg">Marketplace de Repuestos Integrado</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Busca repuestos reales en Mercado Libre Chile y tiendas locales, y asócialos a tus presupuestos.</p>
            </div>

            {/* Formulario de Búsqueda */}
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-4">
              <form onSubmit={handleSearchMarketplace} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={searchMarketplaceQuery}
                    onChange={(e) => setSearchMarketplaceQuery(e.target.value)}
                    placeholder="Ej. pastillas de freno toyota yaris 2018, alternador chevrolet sail..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingMarketplace}
                  className="h-11 px-6 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loadingMarketplace ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "Buscar Repuesto"
                  )}
                </button>
              </form>

              {/* Marcas Rápidas */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground font-semibold">Búsquedas sugeridas:</span>
                {["Pastillas de freno Toyota", "Amortiguadores Chevrolet", "Filtro de aceite Hyundai", "Bujías Suzuki"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchMarketplaceQuery(tag);
                    }}
                    className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultados */}
            {marketplaceItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplaceItems.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col justify-between p-4 hover:border-primary/40 transition-all hover:shadow-md">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                          item.tienda === "Mercado Libre Chile" ? "bg-amber-600/10 text-amber-500" : "bg-blue-600/10 text-blue-500"
                        }`}>
                          {item.tienda}
                        </span>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-0.5"
                        >
                          Ver original
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      {item.imagen && (
                        <div className="w-full h-32 bg-muted/20 flex items-center justify-center rounded-lg overflow-hidden border border-border/55">
                          <img src={item.imagen} alt={item.nombre} className="h-full object-contain" />
                        </div>
                      )}
                      <h4 className="font-semibold text-xs text-foreground leading-snug line-clamp-2 h-8" title={item.nombre}>{item.nombre}</h4>
                    </div>

                    <div className="border-t border-border/60 pt-3 mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase">Precio</p>
                        <p className="text-base font-black text-primary">${item.precio.toLocaleString("es-CL")} CLP</p>
                      </div>

                      {/* Botón de Integración con OT */}
                      {asociarOTPartId === item.id ? (
                        <div className="flex flex-col gap-1 items-end w-2/3 animate-fade-in">
                          <select
                            value={asociarTargetOTId}
                            onChange={(e) => setAsociarTargetOTId(e.target.value)}
                            className="w-full h-7 px-1.5 rounded border border-border bg-background text-[10px] focus:outline-none focus:border-primary"
                          >
                            <option value="">Selecciona OT...</option>
                            {ots.filter(o => o.status !== "ENTREGADO").map(o => (
                              <option key={o.id} value={o.id}>{o.codigo} ({o.vehiculo})</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setAsociarOTPartId(null)}
                              className="px-2 py-0.5 rounded bg-muted text-[9px] font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleAsociarRepuestoAOT(item)}
                              disabled={isAssociatingPart}
                              className="px-2 py-0.5 rounded bg-primary text-white text-[9px] font-bold flex items-center justify-center disabled:opacity-50 cursor-pointer"
                            >
                              {isAssociatingPart ? "..." : "Asociar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAsociarOTPartId(item.id);
                            setAsociarTargetOTId("");
                          }}
                          className="px-3 h-7 rounded bg-primary text-white text-[10px] font-bold hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          Asociar a OT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              searchMarketplaceQuery && !loadingMarketplace && (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground italic">No se encontraron productos para "{searchMarketplaceQuery}".</p>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 space-y-6 shadow-2xl animate-scale-in text-foreground">
            <div>
              <h3 className="text-base font-bold">Confirmar Registro de OT</h3>
              <p className="text-xs text-muted-foreground mt-1">Revisa el resumen antes de ingresar la orden de trabajo al sistema.</p>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border text-xs">
              <div>
                <p className="font-bold text-primary uppercase text-[9px] tracking-wider mb-1">Cliente</p>
                <p><span className="text-muted-foreground">Nombre:</span> {formClient.nombre}</p>
                {formClient.rut && <p><span className="text-muted-foreground">RUT/DNI:</span> {formClient.rut}</p>}
                {formClient.telefono && <p><span className="text-muted-foreground">Teléfono:</span> {formClient.telefono}</p>}
              </div>

              <div className="border-t border-border/50 pt-2">
                <p className="font-bold text-primary uppercase text-[9px] tracking-wider mb-1">Vehículo</p>
                <p className="font-semibold">{formVehiculo.marca} {formVehiculo.modelo}</p>
                <p><span className="text-muted-foreground">Patente:</span> <span className="bg-muted px-1 py-0.2 rounded font-bold uppercase tracking-wider text-[10px]">{formVehiculo.patente}</span></p>
                <p><span className="text-muted-foreground">Kilometraje:</span> {Number(formVehiculo.kilometraje).toLocaleString("es-CL")} Km</p>
              </div>

              <div className="border-t border-border/50 pt-2">
                <p className="font-bold text-primary uppercase text-[9px] tracking-wider mb-1">Detalles de Recepción</p>
                <p><span className="text-muted-foreground">Est. Combustible:</span> {formOT.combustible}%</p>
                {formOT.observaciones && <p className="mt-1 bg-background p-2 rounded border border-border/60 leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Obs:</span> {formOT.observaciones}</p>}
              </div>

              {customTasks.length > 0 && (
                <div className="border-t border-border/50 pt-2">
                  <p className="font-bold text-primary uppercase text-[9px] tracking-wider mb-1">Tareas Personalizadas ({customTasks.length})</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {customTasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                disabled={submitting}
              >
                Volver a Editar
              </button>
              <button
                type="button"
                onClick={handleCreateOT}
                className="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm flex items-center justify-center gap-1.5 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Confirmar y Crear"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Bodega Item Modal */}
      {showAddBodegaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold">{editingBodegaItem ? "Editar Ítem de Bodega" : "Registrar Ítem en Bodega"}</h3>
              <button 
                onClick={() => setShowAddBodegaModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveBodegaItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nombre del Repuesto / Insumo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Filtro de Aceite Suzuki Swift"
                  value={newBodegaItem.nombre}
                  onChange={(e) => setNewBodegaItem({ ...newBodegaItem, nombre: e.target.value })}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">SKU / Código Barra</label>
                  <input 
                    type="text" 
                    placeholder="Ej. SUZ-FA-10"
                    value={newBodegaItem.sku}
                    onChange={(e) => setNewBodegaItem({ ...newBodegaItem, sku: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tipo de Ítem</label>
                  <select 
                    value={newBodegaItem.tipo}
                    onChange={(e) => setNewBodegaItem({ ...newBodegaItem, tipo: e.target.value as any })}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                  >
                    <option value="REPUESTO">Repuesto (Refacción)</option>
                    <option value="INSUMO">Insumo (Aceite, pasta, etc.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Cantidad Inicial *</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={newBodegaItem.cantidad}
                    onChange={(e) => setNewBodegaItem({ ...newBodegaItem, cantidad: Number(e.target.value) })}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Precio Unitario ($) *</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={newBodegaItem.precioUnitario}
                    onChange={(e) => setNewBodegaItem({ ...newBodegaItem, precioUnitario: Number(e.target.value) })}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Ubicación Física en Taller</label>
                <input 
                  type="text" 
                  placeholder="Ej. Estante A, Cajón 3"
                  value={newBodegaItem.ubicacion}
                  onChange={(e) => setNewBodegaItem({ ...newBodegaItem, ubicacion: e.target.value })}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingBodegaItem}
                className="w-full h-9 rounded-md bg-primary text-white font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingBodegaItem ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  editingBodegaItem ? "Guardar Cambios" : "Registrar en Bodega"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Costs Modal */}
      {activeManageCostsOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl p-6 space-y-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold">Gestionar Valores y Presupuesto</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Orden de Trabajo: <span className="font-bold text-primary">{activeManageCostsOT.codigo}</span> | Vehículo: {activeManageCostsOT.vehiculo}</p>
              </div>
              <button 
                onClick={() => setActiveManageCostsOT(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SECTION A: DETALLES DE VALORES ACTUALES */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1.5">Desglose de Mano de Obra y Repuestos</h4>
                
                {/* Add Item Form */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Agregar Nuevo Ítem</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Tipo</label>
                      <select 
                        value={newCostItemType}
                        onChange={(e) => setNewCostItemType(e.target.value as any)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                      >
                        <option value="MANO_OBRA">Mano de Obra (Servicio)</option>
                        <option value="REPUESTO">Repuesto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Monto (CLP)</label>
                      <input 
                        type="number"
                        placeholder="Ej. 25000"
                        value={newCostItemMonto}
                        onChange={(e) => setNewCostItemMonto(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold mb-1">Detalle / Nota explicativa</label>
                    <input 
                      type="text"
                      placeholder="Ej. Pastillas de freno delanteras Bosch"
                      value={newCostItemDesc}
                      onChange={(e) => setNewCostItemDesc(e.target.value)}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleAddCostItem}
                    disabled={isAddingItem}
                    className="w-full h-8 rounded-md bg-primary text-white text-[11px] font-bold hover:bg-primary/95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isAddingItem ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Agregar Ítem al Presupuesto"
                    )}
                  </button>
                </div>

                {/* List of items */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Ítems Registrados</p>
                  {(!activeManageCostsOT.itemsPresupuesto || activeManageCostsOT.itemsPresupuesto.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-border/40 text-center">No hay ítems cargados en esta orden.</p>
                  ) : (
                    <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-muted/10">
                      {activeManageCostsOT.itemsPresupuesto.map((item: any) => (
                        <div key={item.id} className="p-3 flex justify-between items-center text-xs hover:bg-muted/25 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${item.tipo === "MANO_OBRA" ? "bg-blue-600/10 text-blue-500" : "bg-green-600/10 text-green-500"}`}>
                              {item.tipo === "MANO_OBRA" ? "M. Obra" : "Repuesto"}
                            </span>
                            <span className="font-semibold text-foreground">{item.descripcion}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">${item.monto.toLocaleString("es-CL")}</span>
                            <button
                              onClick={() => handleDeleteCostItem(item.id)}
                              className="text-red-500 hover:text-red-600 font-bold hover:bg-red-500/10 p-1 rounded transition-colors cursor-pointer"
                              title="Eliminar ítem"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: TRABAJO ADICIONAL PENDIENTE DE APROBACIÓN */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Trabajo Adicional (Aprobación Cliente)</h4>
                    {activeManageCostsOT.presupuestoEstado && (
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        activeManageCostsOT.presupuestoEstado === "PENDIENTE" ? "bg-amber-600/10 text-amber-500 border border-amber-600/20" :
                        activeManageCostsOT.presupuestoEstado === "APROBADO" ? "bg-green-600/10 text-green-500 border border-green-600/20" :
                        "bg-red-600/10 text-red-500 border border-red-600/20"
                      }`}>
                        {activeManageCostsOT.presupuestoEstado}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si durante la revisión o diagnóstico encuentras fallas no presupuestadas (por ejemplo, pastillas de freno gastadas, amortiguador reventado), describe el problema aquí y define el costo. El cliente podrá ver esto y **aprobar o rechazar** en tiempo real desde su link.
                  </p>

                  <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/80">
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Monto de Reparación Adicional (CLP)</label>
                      <input 
                        type="number"
                        placeholder="Ej. 35000"
                        value={newAdicionalMonto}
                        onChange={(e) => setNewAdicionalMonto(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold mb-1">Detalle del problema encontrado</label>
                      <textarea
                        rows={3}
                        placeholder="Describe de forma clara el repuesto y la falla encontrada, para que el cliente la entienda..."
                        value={newAdicionalDetalle}
                        onChange={(e) => setNewAdicionalDetalle(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:border-primary resize-none leading-relaxed"
                      />
                    </div>
                    <button
                      onClick={handleSaveAdicional}
                      disabled={isSavingAdicional}
                      className="w-full h-8 rounded-md bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-600/95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingAdicional ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        "Configurar y Enviar para Aprobación"
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-4 space-y-2 bg-muted/10 p-4 rounded-xl">
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Resumen General OT</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <p className="text-muted-foreground">Mano de Obra:</p>
                    <p className="text-right font-bold">${activeManageCostsOT.costoManoObra.toLocaleString("es-CL")}</p>
                    
                    <p className="text-muted-foreground">Repuestos:</p>
                    <p className="text-right font-bold">
                      ${(activeManageCostsOT.itemsPresupuesto || [])
                        .filter((i: any) => i.tipo === "REPUESTO")
                        .reduce((acc: number, curr: any) => acc + curr.monto, 0)
                        .toLocaleString("es-CL")}
                    </p>

                    {activeManageCostsOT.presupuestoEstado === "APROBADO" && (
                      <>
                        <p className="text-green-500 font-medium">Adicional Aprobado:</p>
                        <p className="text-right font-bold text-green-500">${(activeManageCostsOT.presupuestoMonto || 0).toLocaleString("es-CL")}</p>
                      </>
                    )}

                    <div className="col-span-2 border-t border-border/80 my-1"></div>

                    <p className="text-primary font-extrabold text-sm uppercase tracking-wider">Costo Total:</p>
                    <p className="text-right font-extrabold text-primary text-sm">${activeManageCostsOT.costoTotal.toLocaleString("es-CL")} CLP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split OT Detail & Activity Timeline Modal */}
      {selectedDetailOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-foreground">
          <div className="bg-card border border-border w-full max-w-5xl rounded-2xl p-6 space-y-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary" />
                  Detalle e Historial de Orden
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Orden: <span className="font-extrabold text-primary">{selectedDetailOT.codigo}</span> | Vehículo: <span className="font-semibold">{selectedDetailOT.vehiculo}</span> | Patente: <span className="bg-muted px-1 py-0.2 rounded font-mono font-bold uppercase tracking-wider text-[10px]">{selectedDetailOT.patente}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailOT(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              >
                Cerrar Detalle
              </button>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: VEHICLE SPECS, CHECKLIST, PHOTOS */}
              <div className="space-y-5">
                
                {/* 1. Ficha General */}
                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/80 text-xs">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Ficha de Recepción</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <p><span className="text-muted-foreground">Cliente:</span> <span className="font-semibold">{selectedDetailOT.cliente}</span></p>
                    <p><span className="text-muted-foreground">Mecánico:</span> <span className="font-semibold">{selectedDetailOT.tecnico}</span></p>
                    <p><span className="text-muted-foreground">Estado Actual:</span> <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">{selectedDetailOT.status}</span></p>
                    <p><span className="text-muted-foreground">Combustible:</span> <span className="font-semibold">{selectedDetailOT.combustible}%</span></p>
                  </div>
                  {selectedDetailOT.observaciones && (
                    <div className="border-t border-border/60 pt-2 mt-2">
                      <p className="text-muted-foreground text-[10px] font-semibold mb-1">Requerimientos / Observación Inicial:</p>
                      <p className="bg-background p-2 rounded border border-border/40 leading-relaxed text-muted-foreground italic">
                        "{selectedDetailOT.observaciones}"
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Checklist Avance */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Tareas y Avances del Checklist</p>
                  {(!selectedDetailOT.checklist || selectedDetailOT.checklist.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No se configuró checklist para esta orden.</p>
                  ) : (
                    <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/10">
                      {selectedDetailOT.checklist.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          {item.completada ? (
                            <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground shrink-0"></div>
                          )}
                          <span className={item.completada ? "text-muted-foreground line-through" : "text-foreground font-medium"}>
                            {item.tarea}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

{/* 3. Fotos de Avance (Oculto temporalmente) */}

              </div>

              {/* RIGHT COLUMN: TIMELINE AUDIT LOG */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1.5 flex items-center gap-1.5">
                  <Clock size={14} />
                  Línea de Tiempo y Bitácora de Acciones
                </h4>

                <div className="flex-1 space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  {(!selectedDetailOT.bitacora || selectedDetailOT.bitacora.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Clock size={24} className="animate-pulse mb-2" />
                      <p className="text-xs italic">Aún no se registran acciones en la bitácora de esta orden.</p>
                    </div>
                  ) : (
                    <div className="relative pl-4 border-l border-border/80 space-y-6">
                      {selectedDetailOT.bitacora.map((b: any) => {
                        const isCliente = b.usuarioNombre === "Cliente";
                        const isSistema = b.usuarioNombre === "Sistema";
                        
                        return (
                          <div key={b.id} className="relative text-xs">
                            {/* Marker dot on the timeline line */}
                            <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border bg-background ${
                              isCliente ? "border-green-500" : isSistema ? "border-muted-foreground" : "border-primary"
                            }`}></span>
                            
                            {/* Log item details */}
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground leading-relaxed">{b.accion}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className={`px-1.5 py-0.2 rounded-full uppercase text-[8px] font-extrabold tracking-wider ${
                                  isCliente ? "bg-green-600/10 text-green-500" :
                                  isSistema ? "bg-muted text-muted-foreground" :
                                  "bg-primary/10 text-primary"
                                }`}>
                                  {b.usuarioNombre || "Sistema"}
                                </span>
                                <span>•</span>
                                <span>{new Date(b.createdAt).toLocaleString("es-CL", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Costs Summary Footer */}
                <div className="border-t border-border pt-4 mt-auto bg-muted/10 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Costo Presupuestado</p>
                    <p className="text-[10px] text-muted-foreground">Mano Obra + Repuestos + Adic. Aprobados</p>
                  </div>
                  <p className="text-sm font-extrabold text-primary">${selectedDetailOT.costoTotal.toLocaleString("es-CL")} CLP</p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}
      {/* MODAL DE PERMISOS */}
      {showPermissionsModal && editingWorkerPermissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-border flex justify-between items-center bg-card">
              <h3 className="font-bold flex items-center gap-2">
                <ShieldAlert className="text-primary" size={18} />
                Permisos de {editingWorkerPermissions.nombre}
              </h3>
              <button 
                onClick={() => setShowPermissionsModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Configura los accesos adicionales para este usuario independiente de su rol ({editingWorkerPermissions.role.replace("TALLER_", "")}).</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={newPermissions.CAN_EDIT_OT || false} onChange={(e) => setNewPermissions({...newPermissions, CAN_EDIT_OT: e.target.checked})} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Modificar OTs</span>
                    <span className="text-[10px] text-muted-foreground">Permite editar OTs creadas, cambiar estados y asignar costos.</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={newPermissions.CAN_DELETE_OT || false} onChange={(e) => setNewPermissions({...newPermissions, CAN_DELETE_OT: e.target.checked})} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Eliminar OTs</span>
                    <span className="text-[10px] text-muted-foreground">Permite dar de baja OTs del sistema.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={newPermissions.CAN_VIEW_BODEGA || false} onChange={(e) => setNewPermissions({...newPermissions, CAN_VIEW_BODEGA: e.target.checked})} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Acceso a Bodega</span>
                    <span className="text-[10px] text-muted-foreground">Ver inventario, buscar piezas en el marketplace.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={newPermissions.CAN_MANAGE_BODEGA || false} onChange={(e) => setNewPermissions({...newPermissions, CAN_MANAGE_BODEGA: e.target.checked})} className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Administrar Bodega</span>
                    <span className="text-[10px] text-muted-foreground">Agregar, editar o eliminar ítems del inventario.</span>
                  </div>
                </label>
              </div>

            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="h-10 px-4 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                className="h-10 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm flex items-center gap-2"
              >
                {isSavingPermissions ? "Guardando..." : "Guardar Permisos"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
