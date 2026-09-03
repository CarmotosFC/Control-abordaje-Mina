# Control de Abordaje — Transporte de Personal

Sistema completo (no un prototipo) para controlar y trazar el abordaje de pasajeros
a los vehículos de transporte de personal, mediante código QR único por pasajero,
lectura desde la cámara de una tablet en el navegador, y un panel administrativo
con historial, dashboard e importación masiva.

---

## 1. Arquitectura y por qué se eligió

| Capa | Tecnología | Por qué |
|---|---|---|
| Aplicación web (frontend + backend) | **Next.js 14** (App Router) desplegado en **Vercel** | Un solo proyecto sirve tanto las pantallas (React) como la API (Route Handlers), sin servidor propio que mantener. Vercel tiene capa gratuita amplia, HTTPS automático (obligatorio para poder usar la cámara desde el navegador) y despliegue por `git push`. |
| Base de datos + autenticación | **Supabase** (PostgreSQL administrado + Supabase Auth) | PostgreSQL real (no una base "de juguete"): transacciones, restricciones de unicidad, funciones/triggers para la regla de negocio del abordaje. Supabase agrega autenticación de usuarios y una capa administrable sin operar servidores. Capa gratuita suficiente para cientos de pasajeros y miles de escaneos diarios. |
| Generación de QR | librería `qrcode` (servidor) | El QR se genera on-demand a partir del identificador único del pasajero — nunca se guarda como imagen suelta que pueda desactualizarse. |
| Lectura de QR | librería `html5-qrcode` (navegador, usa la cámara vía `getUserMedia`) | Funciona en cualquier tablet/computador con navegador moderno (Chrome, Safari, Edge) sin instalar ninguna app. Requiere HTTPS, que Vercel entrega automáticamente. |
| Importación masiva | `papaparse` (CSV) y `exceljs` (Excel) | Parseo en el navegador, sin exponer los archivos originales del cliente a un tercero. |

**Seguridad de la base de datos:** todas las tablas tienen Row Level Security (RLS)
activado *sin políticas para los clientes normales* — es decir, nadie puede leer o
escribir pasajeros, historial o auditoría directamente desde el navegador, ni
siquiera conociendo la clave pública. Todas las operaciones pasan por las rutas
`/api/...` del servidor, que primero validan la sesión y el rol del usuario y
luego usan la clave *service role* (secreta, solo en el servidor) para tocar la
base de datos. Esto es más seguro que depender únicamente de políticas RLS del
lado del cliente.

**Regla de negocio centralizada:** la decisión AUTORIZADO / NO_AUTORIZADO /
YA_REGISTRADO / QR_NO_ENCONTRADO vive en una única función de PostgreSQL
(`register_boarding`, ver `supabase/migrations/0002_register_boarding.sql`),
no repartida en el código de la aplicación. Esto la hace atómica (sin condiciones
de carrera si dos tablets escanean casi al mismo tiempo) y es el punto donde,
en el futuro, se agregarían reglas más avanzadas (turno autorizado, ruta,
vehículo, horario) sin tocar el resto del sistema — el campo `reglas_extra`
(JSON) en cada pasajero ya está preparado para eso.

**Modo offline:** la pantalla de escaneo mantiene una copia local mínima de los
pasajeros (código, nombre, estado, turno, punto — con la identificación
enmascarada) en el almacenamiento del navegador de la tablet. Si se pierde la
conexión, un escaneo se valida contra esa copia local (para dar una respuesta
inmediata en pantalla) y se guarda en una cola local; en cuanto vuelve la señal,
la cola se sincroniza sola contra el servidor, que es la fuente de verdad
definitiva (incluida la detección de "ya registrado").

```
Tablet / computador (navegador)
   │  HTTPS
   ▼
Next.js en Vercel  ──────────────►  Supabase (PostgreSQL + Auth)
 - Páginas (React)                    - Tabla passengers
 - /api/* (Route Handlers)            - Tabla boarding_records
 - Autenticación de sesión            - Tabla profiles (roles)
 - Generación de QR                   - Tabla audit_log
 - Reglas de autorización             - Función register_boarding()
```

---

## 2. Qué incluye el proyecto

```
control-abordaje/
├── supabase/
│   ├── migrations/0001_init.sql            → esquema completo (tablas, índices, triggers)
│   ├── migrations/0002_register_boarding.sql → función de la regla de abordaje
│   └── seed/demo_passengers.sql            → los 2 pasajeros de prueba pedidos (uno activo, uno inactivo)
├── src/
│   ├── app/
│   │   ├── login/                          → inicio de sesión
│   │   ├── abordaje/                       → PANTALLA DE ESCANEO (la de la tablet)
│   │   ├── (admin)/dashboard/              → panel con indicadores
│   │   ├── (admin)/pasajeros/              → gestión de pasajeros (CRUD, QR, importar)
│   │   ├── (admin)/historial/              → historial de abordajes + exportar CSV
│   │   ├── (admin)/usuarios/               → alta de administradores/operadores
│   │   ├── (admin)/auditoria/              → log de auditoría
│   │   └── api/                            → toda la lógica de servidor
│   ├── components/                         → UI reutilizable
│   └── lib/                                → clientes de Supabase, autenticación, utilidades
├── .env.example                            → variables de entorno que hay que configurar
└── package.json
```

Ya se probó que el proyecto **compila sin errores** (`npm run build`) y que el
servidor **arranca y responde correctamente** (rutas protegidas redirigen a
`/login`, las rutas `/api` devuelven JSON 401/403 en vez de romperse, etc.).
La lógica de negocio del abordaje se probó exhaustivamente contra una base de
datos PostgreSQL real (ver sección 8) antes de entregarte el sistema.

---

## 3. Puesta en marcha — paso a paso

### Paso 1 — Crear el proyecto en Supabase (gratis)

1. Entra a **https://supabase.com**, crea una cuenta y luego "New project".
2. Elige un nombre (p. ej. `control-abordaje-palma`), una contraseña para la
   base de datos (guárdala) y la región más cercana (p. ej. `South America`).
3. Espera 1-2 minutos a que se aprovisione.
4. Ve a **SQL Editor** (menú izquierdo) → "New query", pega el contenido de
   `supabase/migrations/0001_init.sql` y ejecuta (▶). Repite con
   `supabase/migrations/0002_register_boarding.sql`.
5. (Opcional pero recomendado para probar) Ejecuta también
   `supabase/seed/demo_passengers.sql` para crear los dos pasajeros de prueba.
6. Ve a **Project Settings → API**. Copia:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (¡mantenla secreta,
     nunca la compartas ni la subas a un repositorio público!)

### Paso 2 — Subir el proyecto a GitHub

1. Crea un repositorio nuevo (puede ser privado) en GitHub.
2. Sube esta carpeta tal cual (el `.gitignore` ya excluye `node_modules`,
   `.next` y tus archivos `.env.local`).

### Paso 3 — Desplegar en Vercel (gratis)

1. Entra a **https://vercel.com**, crea una cuenta (puedes usar tu cuenta de
   GitHub) y elige "Add New… → Project".
2. Selecciona el repositorio que acabas de subir.
3. En "Environment Variables" agrega las tres variables del Paso 1
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Click "Deploy". En 1-2 minutos tendrás una URL pública tipo
   `https://control-abordaje-palma.vercel.app` — **esa es la dirección que vas
   a usar tanto en la tablet como en el computador del administrador.**

### Paso 4 — Crear el primer administrador

Como el sistema todavía no tiene ningún usuario, el primer administrador se
crea directamente en Supabase (los siguientes usuarios ya se crean desde la
aplicación, en "Usuarios del sistema"):

1. En Supabase, ve a **Authentication → Users → Add user → Create new user**.
   Ingresa el correo y una contraseña para el administrador. Marca
   "Auto Confirm User" para que no requiera verificar el correo.
2. Copia el `UID` que aparece para ese usuario recién creado.
3. Ve a **SQL Editor** y ejecuta (reemplazando los valores):

   ```sql
   insert into profiles (id, email, full_name, role)
   values ('PEGA-AQUI-EL-UID', 'admin@tuempresa.com', 'Nombre del Administrador', 'ADMINISTRADOR');
   ```

4. Entra a tu URL de Vercel, inicia sesión con ese correo y contraseña — ya
   estás dentro como administrador. Desde "Usuarios del sistema" puedes crear
   a los demás administradores y operadores sin volver a tocar Supabase.

---

## 4. Cómo cargar los pasajeros reales

1. Inicia sesión como administrador → **Gestión de pasajeros → Importar**.
2. Prepara un Excel o CSV con las columnas exactas: `Nombre completo`,
   `Número de identificación`, `Teléfono`, `Turno`, `Punto de recogida`.
3. Sube el archivo. El sistema muestra una vista previa y, al confirmar,
   valida cada fila, detecta identificaciones duplicadas (contra la base y
   dentro del mismo archivo) e informa un resumen: procesados, creados,
   duplicados y con errores.
4. Cada pasajero creado recibe automáticamente su código (`PAS-000001`,
   `PAS-000002`, …) y su QR — no hay que generarlos aparte.
5. Para altas puntuales, usa **+ Crear pasajero** en vez de importar.

---

## 5. Cómo generar y entregar el QR a cada pasajero

1. En **Gestión de pasajeros**, busca al pasajero y haz clic en **Ver QR**.
2. Verás la credencial: título "CONTROL DE TRANSPORTE", nombre del pasajero,
   su código, el QR y la instrucción "Presentar este código QR al abordar el
   vehículo" — nunca se muestra la identificación completa.
3. Dos opciones:
   - **Imprimir QR** → abre el diálogo de impresión del navegador (para
     entregarlo en papel o carné).
   - **Descargar QR** → guarda una imagen PNG lista para enviar por WhatsApp,
     correo, etc.
4. El QR es permanente: si luego cambias el turno o el punto de recogida del
   pasajero, el mismo QR sigue funcionando — no hay que reimprimir nada.

---

## 6. Cómo usar la tablet en el punto de abordaje

1. Abre el navegador de la tablet (Chrome recomendado) y entra a la URL de
   Vercel.
2. Inicia sesión con el usuario y contraseña del **operador** (creado por el
   administrador en "Usuarios del sistema").
3. El sistema lleva directo a **Control de abordaje** — la pantalla más
   simple de toda la aplicación.
4. Toca **📷 ESCANEAR QR**, autoriza el acceso a la cámara la primera vez, y
   apunta al QR del pasajero.
5. En 1-2 segundos aparece el resultado en pantalla completa y con color:
   - 🟢 **PASAJERO AUTORIZADO** — abordaje permitido.
   - 🔴 **PASAJERO NO AUTORIZADO** — el pasajero está inactivo.
   - ⚠️ **QR NO REGISTRADO** — el código no existe en el sistema.
   - 🟠 **PASAJERO YA REGISTRADO** — ya abordó hoy (el administrador puede
     autorizar un segundo registro si corresponde).
6. Después de unos segundos la pantalla vuelve sola al botón de escaneo,
   lista para el siguiente pasajero. Cada intento queda registrado
   automáticamente en el historial, sin ningún paso adicional.
7. Si se pierde la conexión, la pantalla lo indica ("Sin conexión — los
   escaneos se guardarán y sincronizarán después"); en cuanto vuelva la señal,
   todo se sincroniza solo.

Recomendación práctica: deja la tablet siempre en la pantalla de "Control de
abordaje" con la sesión del operador ya iniciada, para que el proceso completo
tome solo un par de segundos por pasajero.

---

## 7. Roles

| | Administrador | Operador de transporte |
|---|---|---|
| Crear / editar pasajeros | ✅ | ❌ |
| Activar / inactivar pasajeros | ✅ | ❌ |
| Generar, descargar e imprimir QR | ✅ | ❌ |
| Importar pasajeros masivamente | ✅ | ❌ |
| Ver dashboard e historial completo | ✅ | ❌ |
| Exportar historial | ✅ | ❌ |
| Ver log de auditoría | ✅ | ❌ |
| Crear otros usuarios | ✅ | ❌ |
| Escanear QR / registrar abordaje | ✅ (para pruebas) | ✅ |
| Autorizar un segundo registro del mismo día | ✅ | ❌ (la app lo bloquea aunque se manipule la petición) |

Todo cambio administrativo importante (crear, editar, activar/inactivar,
eliminar un pasajero, importar, crear usuarios, autorizar un segundo registro)
queda escrito en el **Log de auditoría** con usuario, fecha/hora y detalle —
no se puede alterar el historial de abordajes de forma silenciosa.

---

## 8. Pruebas realizadas antes de la entrega

Como este entorno de trabajo no tiene acceso a tu proyecto de Supabase (que
aún no existe hasta que sigas el Paso 1), las pruebas se hicieron en dos
niveles:

**A. Contra una base de datos PostgreSQL real** (mismo motor y mismo esquema
que usará Supabase), ejecutando la función `register_boarding` directamente:

| Prueba | Resultado |
|---|---|
| Crear pasajero → código y QR autogenerados (`PAS-000001`, `PAS-000002`) | ✅ |
| Identificación duplicada rechazada por la base de datos | ✅ |
| Escaneo de pasajero ACTIVO → `AUTORIZADO` | ✅ |
| Escaneo de pasajero INACTIVO → `NO_AUTORIZADO` | ✅ |
| Escaneo de código inexistente → `QR_NO_ENCONTRADO` | ✅ |
| Reescaneo del mismo pasajero el mismo día → `YA_REGISTRADO`, con fecha/hora del registro previo | ✅ |
| Administrador fuerza un segundo registro → nuevo `AUTORIZADO` marcado como `override` | ✅ |
| Reintento del mismo escaneo (mismo `device_scan_id`, simula sincronización offline) → no duplica el registro | ✅ |
| Vista de resumen diario (`v_boarding_daily_summary`) agrega correctamente | ✅ |

**B. La aplicación completa (Next.js) compilada y en ejecución real**, contra
las rutas HTTP:

| Prueba | Resultado |
|---|---|
| `npm run build` sin errores | ✅ |
| Rutas protegidas (`/dashboard`, `/pasajeros`, `/historial`, `/auditoria`, `/usuarios`, `/abordaje`) redirigen a `/login` sin sesión | ✅ |
| Rutas `/api/*` devuelven JSON `401` (no una redirección HTML) sin sesión — así el frontend puede mostrar el error correctamente | ✅ |
| `/api/passengers/:id/qr` exige sesión antes de generar la imagen | ✅ |
| Página de login carga y muestra el formulario | ✅ |

**Lo que debes verificar tú una vez desplegado** (requiere tu proyecto de
Supabase real y una cámara física, algo que este entorno de trabajo no tiene):
crear/editar/activar/inactivar un pasajero desde la interfaz, descargar e
imprimir el QR, escanear con la cámara de la tablet, importar un Excel real,
exportar el historial y confirmar que el archivo abre bien en Excel, y crear
un segundo usuario. La lista de la sección 19 de tu documento original queda
así completamente cubierta: los puntos de lógica de negocio y seguridad se
probaron aquí de extremo a extremo; los puntos que dependen de hardware
(cámara) o de tu cuenta en la nube se verifican en tu primer uso guiado por
esta misma guía.

---

## 9. Preparado para crecer

- **Reglas de autorización avanzadas** (turno autorizado, punto autorizado,
  ruta, vehículo, horario): se implementan dentro de la función
  `register_boarding` en la base de datos, sin tocar el frontend ni las rutas
  API. Cada pasajero ya tiene un campo `reglas_extra` (JSON) listo para
  guardar esos datos adicionales sin migrar el esquema.
- **Múltiples rutas, buses y puntos**: el modelo de datos no asume un único
  vehículo; "turno" y "punto de recogida" ya son campos libres y filtrables,
  y se puede extender con tablas `rutas` / `vehiculos` referenciadas desde
  `passengers` y `boarding_records` cuando se necesite.
- **Notificaciones**: la tabla `boarding_records` y el log de auditoría ya
  capturan todo lo necesario para conectar alertas (p. ej. por correo o
  WhatsApp) ante intentos no autorizados, sin cambiar el modelo de datos.

## 10. Mantenimiento — nota técnica

El proyecto usa Next.js 14.2.35 (la versión estable más reciente de la rama
14). `npm audit` señala advisories generales de la rama 14–16 de Next.js
(la mayoría sobre configuraciones que este proyecto no usa: `next/image` con
dominios remotos, i18n, Server Actions complejas). Es buena práctica que
quien administre el repositorio ejecute `npm audit` y actualice dependencias
periódicamente (`npm outdated`, y evaluar el salto a Next.js 15/16 más
adelante) como parte del mantenimiento normal de cualquier aplicación web.
