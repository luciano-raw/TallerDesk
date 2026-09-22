"use client";

import React, { useState, useEffect } from "react";
import { useSystemAuth, UserButton } from "@/components/auth-wrapper";
import { 
  Building2,
  Check, 
  Plus, 
  X, 
  BarChart, 
  CreditCard, 
  ShieldAlert, 
  UserPlus, 
  Power,
  Sparkles,
  Users,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { 
  getTalleres, 
  createTaller, 
  toggleTallerActivo, 
  updateTallerPlan, 
  getUsuarios, 
  updateUserRoleAndTaller, updateTallerSubscription, deleteTaller, preRegistrarUsuario, getSolicitudesPendientes, updateSolicitudEstado 
} from "@/lib/db-actions";


interface SolicitudInfo {
  id: string;
  nombre: string;
  email: string;
  nombreTaller: string;
  telefono: string | null;
  createdAt: string;
}

interface TallerInfo {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activo: boolean;
  estadoSuscripcion?: string;
  usuarios: number;
  ots: number;
  fechaCreacion: string;
}

interface UsuarioInfo {
  id: string;
  email: string;
  nombre: string;
  roles: ("SUPER_ADMIN" | "TALLER_ADMIN" | "TALLER_JEFE" | "TALLER_RECEP" | "TALLER_TECNICO")[];
  tallerId: string | null;
  taller?: { nombre: string } | null;
  createdAt: string;
}

const mockTalleres: TallerInfo[] = [
  {
    id: "taller_1",
    nombre: "Taller Los Amigos",
    slug: "taller-los-amigos",
    plan: "BASIC",
    activo: true, estadoSuscripcion: "ACTIVO",
    usuarios: 4,
    ots: 48,
    fechaCreacion: "2026-03-12"
  },
  {
    id: "taller_2",
    nombre: "Elite Detailing Studio",
    slug: "elite-detailing",
    plan: "PREMIUM",
    activo: true, estadoSuscripcion: "ACTIVO",
    usuarios: 8,
    ots: 112,
    fechaCreacion: "2026-04-05"
  }
];

const mockUsuarios: UsuarioInfo[] = [
  {
    id: "u_1",
    email: "luciano.raw04@gmail.com",
    nombre: "Luciano (Super Admin)",
    roles: ["SUPER_ADMIN"],
    tallerId: null,
    createdAt: "2026-03-10"
  },
  {
    id: "u_2",
    email: "carlos@tallerlosamigos.com",
    nombre: "Don Carlos",
    roles: ["TALLER_ADMIN"],
    tallerId: "taller_1",
    taller: { nombre: "Taller Los Amigos" },
    createdAt: "2026-03-12"
  },
  {
    id: "u_3",
    email: "pedro@mecanica.com",
    nombre: "Pedro Técnico",
    roles: ["TALLER_TECNICO"],
    tallerId: null,
    createdAt: "2026-07-13"
  }
];

export default function SuperAdminClient() {
  const { roles, isDemoMode } = useSystemAuth();
  
  // Estados para Base de Datos (Supabase) y Mockups
  const [talleres, setTalleres] = useState<TallerInfo[]>(mockTalleres);
  const [usuarios, setUsuarios] = useState<UsuarioInfo[]>(mockUsuarios);
  

  const [solicitudes, setSolicitudes] = useState<SolicitudInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"talleres" | "usuarios" | "solicitudes">("talleres");


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteTallerModal, setShowDeleteTallerModal] = useState<string | null>(null);

  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);
  const [tempRoles, setTempRoles] = useState<string[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", nombre: "", role: "TALLER_ADMIN", tallerId: "" });

  const [newTaller, setNewTaller] = useState({ nombre: "", slug: "", plan: "BASIC", ubicacion: "", maxTrabajadores: "5" });
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Función para cargar datos reales desde Supabase
  const loadDbData = async () => {
    const dbTalleres = await getTalleres();
    const dbUsuarios = await getUsuarios();
    const dbSolicitudes = await getSolicitudesPendientes();
    setSolicitudes(dbSolicitudes.map((s: any) => ({
      id: s.id,
      nombre: s.nombre,
      email: s.email,
      nombreTaller: s.nombreTaller,
      telefono: s.telefono,
      createdAt: new Date(s.createdAt).toISOString().split("T")[0]
    })));

    
    // Mapeo simple de Prisma a nuestras interfaces locales
    setTalleres(dbTalleres.map((t: any) => ({
      id: t.id,
      nombre: t.nombre,
      slug: t.slug,
      plan: t.plan,
      activo: t.activo,
      estadoSuscripcion: t.estadoSuscripcion,
      usuarios: t.usuarios?.length || 0,
      ots: t.ots?.length || 0,
      fechaCreacion: new Date(t.createdAt).toISOString().split("T")[0]
    })));

    setUsuarios(dbUsuarios.map((u: any) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      roles: u.roles,
      tallerId: u.tallerId,
      taller: u.taller ? { nombre: u.taller.nombre } : null,
      createdAt: new Date(u.createdAt).toISOString().split("T")[0]
    })));
  };

  useEffect(() => {
    if (!isDemoMode) {
      loadDbData();
    }
  }, [isDemoMode]);

  // Guard de Rol
  if (!roles.includes("SUPER_ADMIN")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 animate-bounce">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Esta zona está reservada para el **Administrador Global del SaaS**. Tu rol actual es <span className="font-semibold text-primary capitalize">{roles.length > 0 ? roles[0].replace("TALLER_", "").toLowerCase() : "NINGUNO"}</span>.
        </p>
        {isDemoMode && (
          <div className="bg-muted p-4 rounded-xl border border-border max-w-sm">
            <p className="text-xs text-muted-foreground">
              💡 **Tip de Simulación**: Usa el panel flotante inferior derecho para cambiar tu rol a **"S. Admin"** y esta vista se desbloqueará de inmediato.
            </p>
          </div>
        )}
      </div>
    );
  }


  const handleAprobarSolicitud = (s: SolicitudInfo) => {
    // Rellenamos el modal de crear taller
    const slugVal = s.nombreTaller.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setNewTaller({ nombre: s.nombreTaller, slug: slugVal, plan: "BASIC", ubicacion: "", maxTrabajadores: "5" });
    setShowCreateModal(true);
    // Luego el super admin le tocar crear el taller. Despus puede ir y pre-registrar al usuario manualmente,
    // pero idealmente deberamos rechazar o marcar aprobada la solicitud.
  };

  const handleRechazarSolicitud = async (id: string) => {
    if (!isDemoMode) {
      await updateSolicitudEstado(id, "RECHAZADO");
      triggerNotification("Solicitud rechazada");
      loadDbData();
    }
  };

  // --- HANDLERS PARA TALLERES ---


  const handleToggleActivo = async (id: string, currentState: string) => {
    const newState = currentState === "ACTIVO" ? "PAUSADO" : "ACTIVO";
    if (!isDemoMode) {
      const res = await updateTallerSubscription(id, newState);
      if (res.success) {
        triggerNotification(`Suscripcin cambiada a `);
        loadDbData();
      }
    } else {
      triggerNotification("Suscripcin cambiada (Demo)");
    }
  };

  const handleDeleteTaller = async (id: string) => {
    if (!isDemoMode) {
      const res = await deleteTaller(id);
      if (res.success) {
        triggerNotification("Taller eliminado correctamente");
        loadDbData();
      }
    }
    setShowDeleteTallerModal(null);
  };
  
  const handlePreRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.nombre || !newUser.tallerId) return;
    
    if (!isDemoMode) {
      const res = await preRegistrarUsuario(newUser.email, newUser.nombre, newUser.tallerId, newUser.role);
      if (res.success) {
        triggerNotification("Usuario pre-registrado correctamente");
        loadDbData();
        setShowCreateUserModal(false);
      } else {
        triggerNotification("Error: " + res.error);
      }
    }
  };

  const OLD_handleToggleActivo = async (id: string) => {
    if (!isDemoMode) {
      const res = await toggleTallerActivo(id);
      if (res.success) {
        triggerNotification(`Estado del taller actualizado en Supabase.`);
        loadDbData();
      }
    } else {
      setTalleres(talleres.map(t => {
        if (t.id === id) {
          const nextState = !t.activo;
          triggerNotification(`Taller "${t.nombre}" ha sido ${nextState ? "ACTIVADO" : "DESACTIVADO"}.`);
          return { ...t, activo: nextState };
        }
        return t;
      }));
    }
  };

  const handlePlanChange = async (id: string, plan: string) => {
    if (!isDemoMode) {
      const res = await updateTallerPlan(id, plan);
      if (res.success) {
        triggerNotification(`Plan actualizado a ${plan} en Supabase.`);
        loadDbData();
      }
    } else {
      setTalleres(talleres.map(t => {
        if (t.id === id) {
          triggerNotification(`Taller "${t.nombre}" actualizado al plan ${plan}.`);
          return { ...t, plan };
        }
        return t;
      }));
    }
  };

  const handleCreateTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaller.nombre || !newTaller.slug) return;

    const slugFormatted = newTaller.slug.toLowerCase().replace(/\s+/g, "-");

    if (!isDemoMode) {
      const res = await createTaller(
        newTaller.nombre, 
        slugFormatted, 
        newTaller.plan,
        newTaller.ubicacion,
        Number(newTaller.maxTrabajadores || 5)
      );
      if (res.success) {
        triggerNotification(`¡Taller "${newTaller.nombre}" registrado en Supabase!`);
        loadDbData();
      } else {
        triggerNotification(`Error: ${res.error}`);
      }
    } else {
      const nuevo: TallerInfo = {
        id: `taller_${Date.now()}`,
        nombre: newTaller.nombre,
        slug: slugFormatted,
        plan: newTaller.plan,
        activo: true, estadoSuscripcion: "ACTIVO",
        usuarios: 1,
        ots: 0,
        fechaCreacion: new Date().toISOString().split("T")[0]
      };
      setTalleres([...talleres, nuevo]);
      triggerNotification(`¡Taller "${nuevo.nombre}" creado exitosamente (Demo)!`);
    }

    setShowCreateModal(false);
    setNewTaller({ nombre: "", slug: "", plan: "BASIC", ubicacion: "", maxTrabajadores: "5" });
  };

  // --- HANDLERS PARA USUARIOS Y PERMISOS ---

  const handleUserRoleChange = async (userId: string, newRoles: UsuarioInfo["roles"]) => {
    const targetUser = usuarios.find(u => u.id === userId);
    if (!targetUser) return;

    if (!isDemoMode) {
      const res = await updateUserRoleAndTaller(userId, newRoles as any, targetUser.tallerId);
      if (res.success) {
        triggerNotification(`Roles de ${targetUser.nombre} cambiados en Supabase.`);
        loadDbData();
      }
    } else {
      setUsuarios(usuarios.map(u => {
        if (u.id === userId) {
          triggerNotification(`Roles de ${u.nombre} actualizados.`);
          return { ...u, roles: newRoles };
        }
        return u;
      }));
    }
  };

  const handleUserTallerChange = async (userId: string, newTallerId: string | null) => {
    const targetUser = usuarios.find(u => u.id === userId);
    if (!targetUser) return;

    const actualTallerId = newTallerId === "null" ? null : newTallerId;

    if (!isDemoMode) {
      const res = await updateUserRoleAndTaller(userId, targetUser.roles, actualTallerId);
      if (res.success) {
        triggerNotification(`Taller de ${targetUser.nombre} actualizado en Supabase.`);
        loadDbData();
      }
    } else {
      setUsuarios(usuarios.map(u => {
        if (u.id === userId) {
          const tallerName = talleres.find(t => t.id === actualTallerId)?.nombre || null;
          triggerNotification(`Taller de ${u.nombre} actualizado a: ${tallerName || "Ninguno"}.`);
          return { 
            ...u, 
            tallerId: actualTallerId,
            taller: tallerName ? { nombre: tallerName } : null
          };
        }
        return u;
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8">
      {/* NOTIFICACION */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Sparkles size={14} />
          {notification}
        </div>
      )}

      {/* TOP HEADER - BRANDING & USER BUTTON */}
      <div className="flex items-center justify-between border-b border-border pb-5 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola SaaS</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Control global de talleres y suscripciones de TallerDesk.</p>
        </div>
        <UserButton />
      </div>

      {/* OPERATIONS HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        
        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("talleres")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "talleres" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 size={13} />
            Talleres ({talleres.length})
          </button>
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "usuarios" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users size={13} />
            Permisos Usuarios ({usuarios.length})
          </button>
          <button
            onClick={() => setActiveTab("solicitudes")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all `}
          >
            <Sparkles size={13} />
            Solicitudes ({solicitudes.length})
          </button>

          <a
            href="/super-admin/proveedores"
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
          >
            <UserCheck size={13} />
            Proveedores B2B
          </a>
        </div>

        
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-all shadow-md self-start"
          >
            <UserPlus size={16} />
            Pre-Registrar Usuario
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 self-start"
          >
            <Plus size={16} />
            Crear Nuevo Taller
          </button>
        </div>

      </div>

      {/* METRICAS GENERALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Talleres Registrados</span>
            <Building2 size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold">{talleres.length}</p>
          <span className="text-[10px] text-success font-medium">Activos: {talleres.filter(t => t.activo).length}</span>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Usuarios Totales</span>
            <UserPlus size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold">{usuarios.length}</p>
          <span className="text-[10px] text-muted-foreground">Logueados en Clerk</span>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Servicios Totales</span>
            <BarChart size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold">
            {talleres.reduce((acc, t) => acc + t.ots, 0)}
          </p>
          <span className="text-[10px] text-muted-foreground">Histórico de OTs</span>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR Proyectado</span>
            <CreditCard size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-extrabold">
            ${(talleres.filter(t => t.activo).reduce((acc, t) => acc + (t.plan === "PREMIUM" ? 79990 : 39990), 0)).toLocaleString("es-CL")} CLP
          </p>
          <span className="text-[10px] text-success font-medium">Suscripciones vigentes</span>
        </div>
      </div>

      
      {activeTab === "solicitudes" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-sm">Solicitudes de Ingreso B2B</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Prospectos que llenaron el formulario en la Landing Page.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Prospecto</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Taller Interesado</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {solicitudes.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No hay solicitudes pendientes.</td></tr>
                )}
                {solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/35 transition-colors">
                    <td className="p-4 font-semibold text-foreground">{s.nombre}</td>
                    <td className="p-4 text-muted-foreground">
                      <div className="block">{s.email}</div>
                      <div className="block mt-0.5 text-[10px]">{s.telefono || 'Sin telfono'}</div>
                    </td>
                    <td className="p-4">{s.nombreTaller}</td>
                    <td className="p-4 text-muted-foreground">{s.createdAt}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => handleAprobarSolicitud(s)} className="px-3 py-1 bg-primary text-white rounded font-bold hover:bg-primary/90 transition-colors">Gestionar Alta</button>
                      <button onClick={() => handleRechazarSolicitud(s.id)} className="px-3 py-1 bg-destructive/10 text-destructive rounded font-bold hover:bg-destructive/20 transition-colors">Rechazar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 1: TABLA TALLERES */}
      {activeTab === "talleres" ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-sm">Directorio de Talleres B2B (Tenants)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Taller / Sucursal</th>
                  <th className="p-4">Subdominio (Slug)</th>
                  <th className="p-4">Plan Actual</th>
                  <th className="p-4 text-center">Usuarios / OTs</th>
                  <th className="p-4">Fecha Alta</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {talleres.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/35 transition-colors">
                    <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {t.nombre.charAt(0)}
                      </div>
                      {t.nombre}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded text-[10px]">{t.slug}.tallerdesk.com</span>
                    </td>
                    <td className="p-4">
                      <select
                        value={t.plan}
                        onChange={(e) => handlePlanChange(t.id, e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="BASIC">BASIC ($39,990)</option>
                        <option value="PREMIUM">PREMIUM ($79,990)</option>
                      </select>
                    </td>
                    <td className="p-4 text-center text-muted-foreground font-medium">
                      {t.usuarios} u / {t.ots} OTs
                    </td>
                    <td className="p-4 text-muted-foreground">{t.fechaCreacion}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        t.activo 
                          ? "bg-success/15 text-success" 
                          : "bg-destructive/15 text-destructive"
                      }`}>
                        {t.estadoSuscripcion || (t.activo ? "ACTIVO" : "SUSPENDIDO")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleActivo(t.id, t.estadoSuscripcion || "ACTIVO")}
                        className={`p-1.5 rounded-md border transition-colors inline-flex items-center justify-center ${
                          t.activo 
                            ? "border-destructive/30 text-destructive hover:bg-destructive/10" 
                            : "border-success/30 text-success hover:bg-success/10"
                        }`}
                        title={t.estadoSuscripcion === "ACTIVO" ? "Pausar Suscripcin" : "Reanudar Suscripcin"}
                      >
                        <Power size={13} />
                      </button>
                      <button
                        onClick={() => setShowDeleteTallerModal(t.id)}
                        className="p-1.5 rounded-md border transition-colors inline-flex items-center justify-center border-destructive/30 text-destructive hover:bg-destructive/10 ml-2"
                        title="Eliminar Taller"
                      >
                        <X size={13} />
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA 2: TABLA USUARIOS Y PERMISOS */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-sm">Asignación de Roles y Permisos de Usuarios</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Asigna a qué taller pertenece cada cuenta registrada en Clerk y su nivel de permisos.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Nombre / Email</th>
                  <th className="p-4">Rol Asignado</th>
                  <th className="p-4">Taller Vinculado</th>
                  <th className="p-4">Fecha Registro</th>
                  <th className="p-4 text-right">Estado Permisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/35 transition-colors">
                    <td className="p-4">
                      <span className="font-semibold text-foreground block">{u.nombre}</span>
                      <span className="text-muted-foreground text-[10px] block mt-0.5">{u.email}</span>
                    </td>
                    <td className="p-4">
                      
                      <button
                        onClick={() => {
                          setTempRoles(u.roles || []);
                          setShowRoleModal(u.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-[10px] font-bold hover:bg-secondary/80 transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert size={12} />
                        Editar Roles ({u.roles?.length || 0})
                      </button>

                    </td>
                    <td className="p-4">
                      {u.roles?.includes("SUPER_ADMIN") ? (
                        <span className="text-muted-foreground italic text-[11px]">Acceso Global (SaaS)</span>
                      ) : (
                        <select
                          value={u.tallerId || "null"}
                          onChange={(e) => handleUserTallerChange(u.id, e.target.value)}
                          className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary font-medium"
                        >
                          <option value="null">Ninguno / Pendiente</option>
                          {talleres.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{u.createdAt}</td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.tallerId || u.roles?.includes("SUPER_ADMIN")
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}>
                        {u.roles?.includes("SUPER_ADMIN") ? (
                          <>
                            <ShieldCheck size={11} />
                            Super Admin
                          </>
                        ) : u.tallerId ? (
                          "Habilitado"
                        ) : (
                          "Pendiente Asignación"
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {showDeleteTallerModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2 text-destructive flex items-center gap-2">
              <ShieldAlert size={20} />
              Cuidado
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Ests a punto de eliminar este taller y TODOS sus datos (Usuarios, vehculos, OTs). Esta accin NO se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteTallerModal(null)} className="flex-1 bg-muted p-2 rounded text-sm font-semibold">Cancelar</button>
              <button onClick={() => handleDeleteTaller(showDeleteTallerModal)} className="flex-1 bg-destructive text-white p-2 rounded text-sm font-bold">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}
      
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-bold text-base">Pre-Registrar Usuario</h3>
              <button onClick={() => setShowCreateUserModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handlePreRegisterUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Correo Electrnico</label>
                <input type="email" required className="w-full h-10 px-3 border border-input rounded bg-background" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre</label>
                <input type="text" required className="w-full h-10 px-3 border border-input rounded bg-background" value={newUser.nombre} onChange={(e) => setNewUser({...newUser, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Rol Inicial</label>
                <select className="w-full h-10 px-3 border border-input rounded bg-background" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                   <option value="TALLER_ADMIN">TALLER_ADMIN</option>
                   <option value="TALLER_RECEP">TALLER_RECEP</option>
                   <option value="TALLER_JEFE">TALLER_JEFE</option>
                   <option value="TALLER_TECNICO">TALLER_TECNICO</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Taller Asignado</label>
                <select required className="w-full h-10 px-3 border border-input rounded bg-background" value={newUser.tallerId} onChange={(e) => setNewUser({...newUser, tallerId: e.target.value})}>
                   <option value="" disabled>Seleccione un taller...</option>
                   {talleres.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full h-10 bg-primary text-white rounded font-bold mt-4">Registrar</button>
            </form>
          </div>
        </div>
      )}

      
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-bold text-base">Gestionar Roles</h3>
              <button onClick={() => setShowRoleModal(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { id: 'SUPER_ADMIN', label: 'SUPER_ADMIN (SaaS)' },
                { id: 'TALLER_ADMIN', label: 'TALLER_ADMIN (Dueo)' },
                { id: 'TALLER_RECEP', label: 'TALLER_RECEP (Recepcionista)' },
                { id: 'TALLER_JEFE', label: 'TALLER_JEFE (Jefe de Taller)' },
                { id: 'TALLER_TECNICO', label: 'TALLER_TECNICO (Mecnico)' },
              ].map(rol => (
                <label key={rol.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:border-primary/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={tempRoles.includes(rol.id)}
                    onChange={(e) => {
                      if (e.target.checked) setTempRoles([...tempRoles, rol.id]);
                      else setTempRoles(tempRoles.filter(r => r !== rol.id));
                    }}
                  />
                  <span className="text-sm font-semibold">{rol.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={async () => {
                setIsSavingRoles(true);
                await handleUserRoleChange(showRoleModal, tempRoles as any);
                setIsSavingRoles(false);
                setShowRoleModal(null);
              }}
              disabled={isSavingRoles}
              className="w-full h-10 flex items-center justify-center gap-2 bg-primary text-white rounded-lg font-bold disabled:opacity-70"
            >
              {isSavingRoles ? <Sparkles size={16} className="animate-spin" /> : <Check size={16} />}
              {isSavingRoles ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* CREATE TALLER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                Registrar Nuevo Taller
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTaller} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre Comercial del Taller</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Los Amigos"
                  value={newTaller.nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    const slugVal = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    setNewTaller({ ...newTaller, nombre: val, slug: slugVal });
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subdominio (Slug de URL)</label>
                <div className="flex items-center bg-background border border-input rounded-lg overflow-hidden focus-within:border-primary">
                  <input
                    type="text"
                    required
                    placeholder="taller-los-amigos"
                    value={newTaller.slug}
                    onChange={(e) => setNewTaller({ ...newTaller, slug: e.target.value })}
                    className="flex-1 h-10 px-3 bg-transparent text-sm focus:outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground bg-muted h-10 px-3 flex items-center border-l border-input">
                    .tallerdesk.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Ubicación / Dirección del Taller</label>
                <input
                  type="text"
                  placeholder="Ej. Calle 1 Norte 1234, Talca"
                  value={newTaller.ubicacion}
                  onChange={(e) => setNewTaller({ ...newTaller, ubicacion: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Cantidad Máxima de Trabajadores</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={newTaller.maxTrabajadores}
                  onChange={(e) => setNewTaller({ ...newTaller, maxTrabajadores: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Plan SaaS Asignado</label>
                <select
                  value={newTaller.plan}
                  onChange={(e) => setNewTaller({ ...newTaller, plan: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                >
                  <option value="BASIC">BASIC ($39,990 CLP/mes - 5 trabajadores)</option>
                  <option value="PREMIUM">PREMIUM ($79,990 CLP/mes - ilimitados)</option>
                </select>
              </div>

              <div className="flex gap-3 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
                >
                  Registrar e Iniciar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
