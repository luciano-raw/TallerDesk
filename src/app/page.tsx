"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSystemAuth } from "@/components/auth-wrapper";
import { LandingAuthButtons } from "@/components/landing-auth-buttons";
import { 
  Wrench, 
  ShieldCheck, 
  Smartphone, 
  Layers, 
  BarChart3, 
  Users, 
  Check, 
  Mail, 
  Phone, 
  MapPin, 
  Car, 
  Sparkles,
  ArrowRight,
  UserCheck
} from "lucide-react";

export default function Home() {
  const { roles } = useSystemAuth();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", workshop: "", message: "" });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setContactInfo({ name: "", email: "", workshop: "", message: "" });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col">
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white glow-green">
              <Wrench size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              TallerDesk
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Características</a>
            <a href="#client-portal" className="hover:text-primary transition-colors">Portal Cliente</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Precios</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-3">
            <LandingAuthButtons />
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative py-20 md:py-32 overflow-hidden flex-1 flex flex-col justify-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-primary/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute top-1/3 left-1/4 w-[150px] md:w-[300px] h-[150px] md:h-[300px] bg-emerald-500/10 rounded-full blur-[80px] -z-10"></div>

        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6 animate-pulse">
            <Sparkles size={12} />
            <span>SaaS Multi-tenant Automotriz para la Era Digital</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            La revolución en la gestión de tu <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Taller Automotriz</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Administra clientes, vehículos, mecánicos, repuestos y avance en tiempo real. Fideliza a tus clientes con un portal de seguimiento en vivo con fotos y presupuestos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#contact" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 h-12 rounded-xl bg-primary text-white font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
            >
              Comenzar Ahora
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-12 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-primary mb-1">+50%</p>
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Fidelización de Clientes</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-primary mb-1">30m</p>
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Ahorro Diario por Recepcionista</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-primary mb-1">100%</p>
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Control de Inventario y Stock</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-extrabold text-primary mb-1">2.4x</p>
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Velocidad en Aprobación de Presupuestos</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Todo lo que necesitas para escalar tu taller</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Una solución multi-tenant diseñada para mecánicas, detailing, reprogramaciones y tiendas de repuestos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-card border border-border p-6 rounded-2xl hover:border-primary/50 transition-all group hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2">Panel Operativo Completo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Controla los autos en taller, las OTs activas, la carga laboral de tus mecánicos y métricas de ingresos mensuales en un solo dashboard.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border border-border p-6 rounded-2xl hover:border-primary/50 transition-all group hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                <Smartphone size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2">Diseño Móvil para Mecánicos</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tus mecánicos y técnicos actualizan los trabajos directo desde su celular en el taller: toman fotos de fallas, agregan notas y registran repuestos al instante.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border border-border p-6 rounded-2xl hover:border-primary/50 transition-all group hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                <Layers size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2">Control de Inventario</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Control de piezas, alertas de stock mínimo, compatibilidades con marcas y vinculación de repuestos directo a las órdenes de trabajo.
              </p>
            </div>

            {/* Feature 4 (Proveedores) */}
            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 p-6 rounded-2xl hover:border-primary/50 transition-all group hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-5 glow-green-sm">
                <UserCheck size={20} />
              </div>
              <h3 className="text-lg font-bold mb-2">Red de Proveedores Locales</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                ¿Vendes repuestos? Sube tu catálogo y conecta directamente con decenas de talleres automotrices que buscan tus productos cada día.
              </p>
              <a href="#contact" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                Convertirme en Proveedor <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENT TRACKING DETAIL SECTION */}
      <section id="client-portal" className="py-20 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/15 border border-success/30 text-[10px] font-bold text-success uppercase tracking-wider mb-4">
                El Diferenciador
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">El cliente sigue su auto en tiempo real, desde su celular</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base mb-1">Enlace Seguro sin Contraseña</h4>
                    <p className="text-sm text-muted-foreground">Un hash UUID único enviado por SMS/WhatsApp. El cliente solo hace clic y entra directamente.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Car size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base mb-1">Línea de Tiempo del Progreso</h4>
                    <p className="text-sm text-muted-foreground">Muestra en qué etapa está: Diagnóstico, Trabajo Iniciado, Pruebas de Calidad o Listo para Retiro.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Check size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base mb-1">Aprobación Digital de Presupuestos</h4>
                    <p className="text-sm text-muted-foreground">Si el mecánico encuentra otra falla, el cliente recibe el detalle y puede aprobar el presupuesto adicional en línea.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup visual */}
            <div className="relative mx-auto w-full max-w-[340px] aspect-[9/18] bg-black rounded-[40px] border-[6px] border-zinc-800 shadow-2xl p-3 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20"></div>
              <div className="bg-zinc-950 text-white flex-1 rounded-[28px] overflow-y-auto p-4 text-xs font-sans">
                {/* Mock Client View inside Smartphone */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4 mt-4">
                  <span className="font-bold text-primary">Taller Los Amigos</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-900/50 text-primary text-[9px]">OT-1234</span>
                </div>
                <p className="font-semibold text-zinc-400">Suzuki Swift (Patente: AB-CD-12)</p>
                
                {/* Timeline Progress */}
                <div className="my-5 border-l border-zinc-800 ml-2.5 pl-4 space-y-4">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-success"></span>
                    <p className="font-semibold text-zinc-300">Vehículo Recibido</p>
                    <p className="text-[10px] text-zinc-500">10:30 AM</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-success"></span>
                    <p className="font-semibold text-zinc-300">Diagnóstico Completado</p>
                    <p className="text-[10px] text-zinc-500">12:15 PM</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                    <p className="font-bold text-primary">Cambio de Pastillas de Freno</p>
                    <p className="text-[10px] text-zinc-400">En progreso - Mecánico: Alexis</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-zinc-800"></span>
                    <p className="font-semibold text-zinc-600">Control de Calidad</p>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-2.5 rounded-xl mb-4">
                  <p className="font-semibold text-yellow-500 mb-1">Presupuesto Adicional Requerido</p>
                  <p className="text-[10px] text-zinc-400 mb-2">Filtro de aire saturado. Costo adicional: $25,000 CLP</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-success text-white py-1 rounded text-[10px] font-bold">Aprobar</button>
                    <button className="bg-zinc-800 text-zinc-400 py-1 rounded text-[10px] font-bold">Ver Detalles</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Planes adaptados al tamaño de tu negocio</h2>
            <p className="text-muted-foreground">Comienza gratis en nuestro entorno demo y escala según necesites.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Plan 1 */}
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Prueba gratuita</h3>
                <p className="text-xs text-muted-foreground mb-4">Conoce TallerDesk y prueba sus principales funciones antes de contratar.</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-green-500">Gratis</span>
                  <span className="text-muted-foreground text-sm block mt-1">por 14 días</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground mb-8">
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Acceso temporal al plan Pro.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Hasta 5 usuarios.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Hasta 20 órdenes de trabajo.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Clientes, vehículos e inventario.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Fotografías y seguimiento para clientes.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Sin tarjeta bancaria.</li>
                </ul>
              </div>
              <Link 
                href="/dashboard" 
                className="w-full text-center py-2.5 px-4 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Probar gratis
              </Link>
            </div>

            {/* Plan 2 */}
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Esencial</h3>
                <p className="text-xs text-muted-foreground mb-4">Para talleres pequeños que necesitan organizar sus servicios y mejorar la atención al cliente.</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold">$24.990</span>
                  <span className="text-muted-foreground text-[10px] uppercase block mt-1">+ IVA / mes</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground mb-8">
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> 1 sucursal y hasta 5 usuarios.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Órdenes de trabajo ilimitadas.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Gestión de clientes y vehículos.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Checklist, fotografías y estados de avance.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Historial de servicios por vehículo.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Portal de seguimiento para clientes.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Órdenes de trabajo en PDF.</li>
                </ul>
              </div>
              <a 
                href="#contact" 
                className="w-full text-center py-2.5 px-4 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Comenzar con Esencial
              </a>
            </div>

            {/* Plan 3 */}
            <div className="bg-card border-2 border-primary p-6 rounded-2xl flex flex-col justify-between relative scale-[1.02] shadow-xl shadow-primary/5 glow-purple">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Más Popular</span>
              <div>
                <h3 className="text-lg font-bold mb-1">Pro</h3>
                <p className="text-xs text-muted-foreground mb-4">Para talleres que administran su equipo, inventario y operación completa.</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold">$39.990</span>
                  <span className="text-muted-foreground text-[10px] uppercase block mt-1">+ IVA / mes</span>
                </div>
                <ul className="space-y-2.5 text-xs mb-8">
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> <strong>Todo lo incluido en Esencial.</strong></li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Hasta 10 usuarios.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Gestión de trabajadores y asignación de trabajos.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Inventario, repuestos y alertas de stock.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Cotizaciones y aprobación del cliente.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Notificaciones automáticas.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Reportes de ventas y productividad.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Personalización con el logo del taller.</li>
                </ul>
              </div>
              <a 
                href="#contact" 
                className="w-full text-center py-2.5 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all glow-green-sm"
              >
                Elegir Pro
              </a>
            </div>

            {/* Plan 4 */}
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">MultiTaller</h3>
                <p className="text-xs text-muted-foreground mb-4">Para empresas que administran varias sucursales desde una sola plataforma.</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold">$79.990</span>
                  <span className="text-muted-foreground text-[10px] uppercase block mt-1">+ IVA / mes</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground mb-8">
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> <strong>Todo lo incluido en Pro.</strong></li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Hasta 3 sucursales y 20 usuarios.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Panel general de todas las sucursales.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Inventario centralizado y por sucursal.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Clientes e historial de vehículos compartidos.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Reportes consolidados y comparativos.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Personalización avanzada.</li>
                  <li className="flex items-start gap-2"><Check size={12} className="text-primary shrink-0 mt-0.5" /> Configuración, capacitación y soporte prioritario.</li>
                </ul>
              </div>
              <a 
                href="#contact" 
                className="w-full text-center py-2.5 px-4 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
              >
                Elegir MultiTaller
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-20 bg-card/20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">¿Listo para habilitar TallerDesk?</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Ponte en contacto con nuestro equipo. Habilitamos tu subdominio de taller, configuramos tus roles iniciales y te entregamos la cuenta lista en menos de 24 horas.
              </p>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-primary" />
                  <span>datarentable@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-primary" />
                  <span>+56930531304</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-primary" />
                  <span>Talca, Chile</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl glow-green-sm">
              <h3 className="font-bold text-lg mb-4">Solicita tu Cuenta de Taller</h3>
              {formSubmitted ? (
                <div className="bg-primary/10 border border-primary/20 text-primary p-6 rounded-xl text-center flex flex-col items-center justify-center min-h-[220px]">
                  <Sparkles className="animate-spin text-primary mb-3" size={32} />
                  <p className="font-bold text-sm">¡Mensaje Recibido!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nos pondremos en contacto contigo en breve para dar de alta tu taller.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nombre</label>
                    <input 
                      type="text" 
                      required
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({...contactInfo, name: e.target.value})}
                      placeholder="Tu nombre completo"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Email Corporativo</label>
                    <input 
                      type="email" 
                      required
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                      placeholder="ejemplo@taller.com"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nombre del Taller / Empresa</label>
                    <input 
                      type="text" 
                      required
                      value={contactInfo.workshop}
                      onChange={(e) => setContactInfo({...contactInfo, workshop: e.target.value})}
                      placeholder="Ej. Taller Los Amigos"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Mensaje o Requerimientos</label>
                    <textarea 
                      rows={3}
                      value={contactInfo.message}
                      onChange={(e) => setContactInfo({...contactInfo, message: e.target.value})}
                      placeholder="Cuéntanos qué servicios realizas y cuántos mecánicos tienes..."
                      className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:border-primary focus:outline-none"
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full h-10 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all glow-green-sm"
                  >
                    Enviar Solicitud
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto py-8 border-t border-border bg-card/50 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} TallerDesk SaaS. Todos los derechos reservados.</p>
          <p className="mt-1">Diseñado para optimizar talleres automotrices, detailing y venta de repuestos.</p>
        </div>
      </footer>
    </div>
  );
}
