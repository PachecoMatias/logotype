import { z } from 'zod';

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, {
  message: 'Required value cannot be empty',
});

const empresaSchema = z
  .looseObject({
    nombreEmpresa: nonEmptyString,
    contacto: nonEmptyString,
    email: z.string().email('Invalid email'),
    telefono: nonEmptyString,
    rubro: z.enum([
      'Comercio',
      'Industria',
      'Servicios',
      'Salud',
      'Educación',
      'Finanzas',
      'Tecnología',
      'Otro',
    ]),
    rubroOtro: z.string().optional(),
  })
  .superRefine((empresa, context) => {
    if (empresa.rubro === 'Otro' && !empresa.rubroOtro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rubroOtro is required when rubro is Otro',
        path: ['rubroOtro'],
      });
    }
  });

const proyectoSchema = z.looseObject({
  tipoProyecto: z.enum(['web', 'movil', 'gestion', 'ecommerce', 'api', 'personalizada']),
});

const problemaSchema = z
  .looseObject({
    problemaActual: nonEmptyString,
    procesoActual: nonEmptyString,
    objetivos: z
      .array(
        z.enum([
          'Reducir tiempos',
          'Automatizar tareas',
          'Centralizar información',
          'Mejorar la atención al cliente',
          'Obtener estadísticas',
          'Reducir errores',
          'Mejorar la seguridad',
          'Aumentar las ventas',
          'Otro',
        ]),
      )
      .min(1, 'Select at least one objective'),
    objetivosOtro: z.string().optional(),
  })
  .superRefine((problema, context) => {
    if (problema.objetivos.includes('Otro') && !problema.objetivosOtro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'objetivosOtro is required when objetivos contains Otro',
        path: ['objetivosOtro'],
      });
    }
  });

const funcionalidadesSchema = z
  .looseObject({
    seleccionadas: z
      .array(
        z.enum([
          'Gestión de usuarios',
          'Login y autenticación',
          'Roles y permisos',
          'Gestión de clientes',
          'Gestión de productos',
          'Gestión de proveedores',
          'Gestión de ventas',
          'Gestión de compras',
          'Facturación',
          'Gestión de stock',
          'Gestión de turnos',
          'Gestión de pedidos',
          'Reportes y estadísticas',
          'Dashboard',
          'Notificaciones',
          'Integración con otras plataformas',
          'API',
          'Base de datos',
          'Carga de archivos',
          'Sistema de tickets',
          'Otra',
        ]),
      )
      .min(1, 'Select at least one feature'),
    otra: z.string().optional(),
  })
  .superRefine((funcionalidades, context) => {
    if (funcionalidades.seleccionadas.includes('Otra') && !funcionalidades.otra?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'otra is required when seleccionadas contains Otra',
        path: ['otra'],
      });
    }
  });

const alcanceSchema = z
  .looseObject({
    plataformas: z
      .array(z.enum(['Web', 'Android', 'iOS', 'Windows / Desktop']))
      .min(1, 'Select at least one platform'),
    cantidadUsuarios: z.enum(['1 - 10', '10 - 50', '50 - 100', '100 - 500', 'Más de 500']),
    necesitaTiposUsuario: z.enum(['Sí', 'No', 'No estoy seguro']),
    tiposUsuario: z
      .array(z.enum(['Administrador', 'Empleado', 'Cliente', 'Supervisor', 'Otro']))
      .min(1, 'Select at least one user type')
      .optional(),
    tiposUsuarioOtro: z.string().optional(),
  })
  .superRefine((alcance, context) => {
    if (alcance.necesitaTiposUsuario === 'Sí' && !alcance.tiposUsuario?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tiposUsuario is required when necesitaTiposUsuario is Sí',
        path: ['tiposUsuario'],
      });
    }

    if (alcance.tiposUsuario?.includes('Otro') && !alcance.tiposUsuarioOtro?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tiposUsuarioOtro is required when tiposUsuario contains Otro',
        path: ['tiposUsuarioOtro'],
      });
    }
  });

const presupuestoSchema = z.looseObject({
  presupuesto: z.enum([
    'Menos de USD 1.000',
    'USD 1.000 - 5.000',
    'USD 5.000 - 10.000',
    'Más de USD 10.000',
    'Todavía no lo definimos',
  ]),
  plazo: z.enum([
    'Lo antes posible',
    '1 - 3 meses',
    '3 - 6 meses',
    'Más de 6 meses',
    'No tenemos una fecha definida',
  ]),
  infoAdicional: z.string().optional(),
});

export const projectBodySchema = z.looseObject({
  empresa: empresaSchema,
  proyecto: proyectoSchema,
  problema: problemaSchema,
  funcionalidades: funcionalidadesSchema,
  alcance: alcanceSchema,
  presupuesto: presupuestoSchema,
});

export const projectIdParamsSchema = z.looseObject({
  id: z
    .string()
    .regex(/^\d+$/, 'Project id must be an unsigned integer')
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(4294967295)),
});
