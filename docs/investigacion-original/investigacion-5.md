Arquitectura Multi-Tenant en Supabase para Aplicaciones SaaS B2B: Guía Integral y Mejores Prácticas
La concepción, el diseño y la implementación de una arquitectura de Software como Servicio (SaaS) multi-tenant (multiusuario o multiinquilino) representan uno de los desafíos de ingeniería más rigurosos en el ecosistema del desarrollo web moderno. Cuando el objetivo central consiste en construir una plataforma donde cada cliente es una Pequeña o Mediana Empresa (PyME) chilena, operando bajo la premisa del aislamiento total y criptográfico de sus datos comerciales, las decisiones arquitectónicas fundamentales determinan la viabilidad técnica y comercial del producto. El ecosistema tecnológico compuesto por Next.js en la capa de interfaz y enrutamiento, integrado con Supabase como plataforma de backend as a Service (BaaS) anclada en PostgreSQL, ofrece un paradigma de desarrollo extraordinariamente robusto. Supabase no abstrae la base de datos subyacente; por el contrario, expone directamente el motor relacional de PostgreSQL, resguardado por una pasarela de API gestionada por Kong y PostgREST.
El presente documento expone un análisis exhaustivo y profundo sobre cómo estructurar, asegurar, escalar y optimizar un entorno SaaS B2B en Supabase. Este análisis aborda la segregación de datos, la gestión de identidades y roles a través de extensiones del JSON Web Token (JWT), la prevención de vulnerabilidades estructurales en las políticas de seguridad y la aplicación de validaciones algorítmicas específicas para el contexto corporativo chileno, como el Rol Único Tributario (RUT).
Evaluación Estratégica de Enfoques Multi-Tenant en PostgreSQL
La piedra angular de cualquier aplicación B2B radica en la estrategia adoptada para la partición y el aislamiento de los datos. Al operar directamente sobre PostgreSQL, los arquitectos de software disponen de tres paradigmas principales para implementar la tenencia múltiple. La selección de uno de estos modelos no es meramente técnica, sino que impacta los costos operativos, la complejidad de los despliegues de integración continua (CI/CD) y la escalabilidad del sistema cuando la base de clientes evoluciona de decenas a cientos de PyMEs.
El primer enfoque arquitectónico es el de una Base de Datos Físicamente Aislada por Tenant (Database-per-Tenant). Bajo este modelo, cada PyME que adquiere una suscripción en el SaaS recibe una instancia lógica o física de PostgreSQL completamente independiente. El aislamiento de los datos es absoluto, garantizando que una vulnerabilidad lógica en la aplicación no pueda exponer datos cruzados, ya que las conexiones físicas son distintas. Sin embargo, para un SaaS orientado a cientos de PyMEs, este enfoque resulta operativamente insostenible y financieramente prohibitivo. La orquestación de cientos de clústeres de base de datos requiere una infraestructura de control masiva. Además, las migraciones de esquema (DDL) necesarias para introducir nuevas funcionalidades en la aplicación Next.js exigirían la ejecución secuencial o paralela de scripts en cada una de las bases de datos, elevando el riesgo de asimetrías estructurales y fallas catastróficas en los despliegues.
El segundo paradigma corresponde al Esquema por Tenant (Schema-per-Tenant). En este modelo, el SaaS emplea una única base de datos física, pero aprovisiona un esquema de base de datos distinto (por ejemplo, tenant_12345, tenant_67890) para cada cliente durante su proceso de incorporación (onboarding). Este enfoque reduce los costos de infraestructura al compartir recursos computacionales y de memoria, manteniendo un aislamiento lógico superior. No obstante, introduce una fricción severa en la capa de aplicación. Herramientas modernas de acceso a datos (ORMs) utilizadas comúnmente en ecosistemas Next.js, como Prisma o Drizzle ORM, enfrentan dificultades técnicas considerables para enrutar conexiones dinámicamente hacia esquemas variables en tiempo de ejecución. Modificar el parámetro search_path de PostgreSQL de manera dinámica por cada solicitud entrante consume ciclos de CPU y complica el agrupamiento de conexiones (Connection Pooling) manejado por Supavisor, el cual opera óptimamente sobre un esquema unificado. Adicionalmente, agregar métricas globales del SaaS resulta extremadamente complejo, requiriendo consultas cruzadas entre cientos de esquemas distintos.
El tercer enfoque, y el estándar adoptado unánimemente por la industria para plataformas de tamaño mediano y alto crecimiento, es la Base de Datos Compartida con Aislamiento por Row Level Security (Shared Schema with RLS). En esta topología, todas las PyMEs comparten el mismo esquema público (habitualmente el esquema public de PostgreSQL) y coexisten dentro de las mismas tablas relacionales. El aislamiento se garantiza mediante la inclusión de una columna obligatoria (generalmente denominada tenant_id o empresa_id) en cada tabla del dominio, complementada con políticas de Seguridad a Nivel de Fila (RLS) estrictamente definidas. La pasarela PostgREST de Supabase intercepta el JWT del usuario, establece el contexto de la transacción y permite que el motor de base de datos evalúe las políticas RLS, actuando como un filtro invisible, dinámico e insoslayable.
La tabla comparativa a continuación detalla las implicaciones operativas de cada enfoque, consolidando la justificación de la arquitectura compartida.
Dimensión de Evaluación
Instancia por Tenant (DB-per-Tenant)
Esquema por Tenant (Schema-per-Tenant)
Tabla Compartida + RLS (Recomendado)
Nivel de Aislamiento
Físico (Aislamiento Máximo)
Lógico (Aislamiento Alto)
A nivel de motor (Aislamiento Alto)
Eficiencia de Costos
Muy baja (Costos lineales por cliente)
Media (Límites en tablas por instancia)
Muy Alta (Costo fijo amortizado)
Complejidad de Migraciones
Crítica (N ejecuciones por actualización)
Alta (Scripting dinámico requerido)
Mínima (Una única ejecución global)
Compatibilidad con Next.js ORMs
Compleja (Requiere múltiples clientes)
Muy Compleja (Problemas con search_path)
Nativa (Enrutamiento unificado)
Gestión de Connection Pooling
Inviable a gran escala sin proxies masivos
Subóptima (Fragmentación de caché)
Óptima (Soportado por Supavisor)
Consolidación de Métricas Globales
Requiere pipelines ETL externos
Requiere consultas dinámicas cruzadas
Simple (Uso del rol service_role)

La recomendación arquitectónica definitiva para el escenario propuesto —un SaaS proyectado para servir a cientos de PyMEs chilenas— es la implementación de un modelo de Tabla Compartida garantizado por Row Level Security (RLS). Este diseño elimina la necesidad de desarrollar middleware personalizado para el enrutamiento de inquilinos, mitiga el riesgo de fuga de datos en la capa de aplicación y permite aprovechar la escala elástica de la infraestructura gestionada de Supabase desde el primer cliente hasta las fases de madurez de la plataforma.
Modelado Relacional: Estructura de Usuarios, Identidad y Tenencia
Para materializar un sistema multi-tenant, el diseño del esquema relacional debe establecer una separación clara entre la identidad del individuo, la entidad corporativa (la PyME) y la asignación de permisos (el rol). En la arquitectura de Supabase, la gestión de identidades y credenciales es manejada exclusivamente por el servicio GoTrue, el cual almacena los registros de autenticación en un esquema interno y protegido denominado auth, específicamente en la tabla auth.users. Los arquitectos de bases de datos tienen estrictamente prohibido alterar la estructura de este esquema interno, ya que comprometería las actualizaciones del sistema.
Por consiguiente, la relación entre el usuario y la empresa debe construirse en el esquema public, utilizando claves foráneas que referencien de manera segura a la tabla del sistema de autenticación. El modelo óptimo para lograr esto es una relación de muchos a muchos resuelta a través de una tabla de unión que almacena los metadatos de autorización (Control de Acceso Basado en Roles, o RBAC).
Definición del Esquema SQL Central
El modelo de datos requiere, como mínimo, la creación de entidades que representen a la empresa, el vínculo del usuario con dicha empresa y las entidades de dominio propias del negocio (tales como clientes, facturas o inventario), las cuales deben heredar obligatoriamente el identificador del tenant.
SQL
-- 1. Definición de dominios y enumeraciones para el control de acceso
CREATE TYPE public.rol_empresa AS ENUM ('admin', 'empleado', 'espectador');

-- 2. Tabla Principal de Tenants (La PyME)
CREATE TABLE public.empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    giro VARCHAR(255),
    estado_suscripcion VARCHAR(50) DEFAULT 'activa',
    creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.empresas IS 'Registro central de PyMEs (Tenants) operando en el SaaS.';

-- 3. Tabla de Unión (RBAC): Relación Usuario -> Tenant -> Rol
CREATE TABLE public.usuarios_empresa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    rol public.rol_empresa NOT NULL DEFAULT 'empleado',
    creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);
COMMENT ON TABLE public.usuarios_empresa IS 'Mapeo de membresía de usuarios a empresas con sus respectivos roles.';

-- 4. Entidad de Dominio: Clientes de la PyME
CREATE TABLE public.clientes_pyme (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    rut VARCHAR(12) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    correo_electronico VARCHAR(255),
    creado_en TIMESTAMPTZ DEFAULT now() NOT NULL,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unq_rut_por_empresa UNIQUE (empresa_id, rut)
);
COMMENT ON TABLE public.clientes_pyme IS 'Directorio de clientes perteneciente a cada tenant.';


Este diseño estructural implementa principios fundamentales de integridad referencial. El uso extensivo de identificadores universales únicos (UUID) generados nativamente a través de la función gen_random_uuid() garantiza la entropía necesaria para evitar colisiones de identificadores y ataques de enumeración, un vector de vulnerabilidad crítico en sistemas multi-tenant donde los atacantes podrían intentar adivinar secuencias numéricas (enteros auto-incrementales) para acceder a registros de otras empresas.
Adicionalmente, la implementación de restricciones de integridad como ON DELETE CASCADE en las claves foráneas asegura que el ciclo de vida de los datos esté intrínsecamente ligado al ciclo de vida del tenant. Si una PyME ejerce su derecho al olvido o cancela su suscripción, la eliminación de su registro en la tabla empresas desencadenará una cascada de purga a nivel de motor en todas las tablas dependientes (usuarios_empresa, clientes_pyme, etc.). Este comportamiento en el servidor de base de datos previene la existencia de registros huérfanos que degradan el rendimiento de la base de datos a lo largo del tiempo, una ventaja operativa crucial del enfoque de almacenamiento normalizado.
La restricción UNIQUE (usuario_id, empresa_id) previene la duplicación de asignaciones de roles, mientras que la restricción UNIQUE (empresa_id, rut) en la tabla de clientes de la PyME permite que diferentes empresas arrendatarias tengan al mismo individuo como cliente sin violar las restricciones globales del sistema, consolidando el aislamiento de la lógica de negocio.
Validación Algorítmica en la Base de Datos: El Contexto del RUT Chileno
El desarrollo de software dirigido al mercado corporativo chileno impone una exigencia ineludible: la gestión rigurosa del Rol Único Tributario (RUT) o Rol Único Nacional (RUN). Dado que el RUT actúa como la clave primaria natural en las relaciones comerciales, su validación no debe recaer exclusivamente en la validación de formularios en el cliente web o en las rutas de la API de Next.js. Adoptar una postura de "defensa en profundidad" requiere que el motor de base de datos rechace categóricamente cualquier intento de inserción de un RUT matemáticamente inválido, protegiendo al sistema de integraciones de API defectuosas, importaciones masivas de datos CSV mal formateados o scripts maliciosos.
El dígito verificador del RUT se calcula a través de un algoritmo de suma ponderada basado en aritmética de Módulo 11. El procedimiento descompone el cuerpo numérico del identificador, multiplicando cada dígito, de derecha a izquierda, por una secuencia repetitiva de multiplicadores comprendidos entre el 2 y el 7. Los productos se suman y el total se divide por 11 para obtener el residuo. El dígito verificador final se determina restando este residuo del número 11, aplicando reglas de sustitución para los resultados excepcionales (donde 10 se transforma en 'K' y 11 en '0').
Para integrar esta lógica directamente en PostgreSQL sin depender de librerías externas o extensiones compiladas en C, se debe desarrollar una función procedimental utilizando el lenguaje nativo PL/pgSQL, aprovechando los operadores matemáticos de división entera (/) y módulo (%).
SQL
CREATE OR REPLACE FUNCTION public.validar_rut_chileno(rut_texto VARCHAR)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
IMMUTABLE 
STRICT 
AS $$
DECLARE
    rut_limpio VARCHAR;
    cuerpo INT;
    dv_ingresado VARCHAR;
    dv_esperado VARCHAR;
    suma INT := 0;
    multiplo INT := 2;
    resto INT;
    digito INT;
BEGIN
    -- Fase 1: Saneamiento de la entrada utilizando expresiones regulares
    -- Se eliminan puntos, guiones y se normaliza la letra 'k' a mayúscula.
    rut_limpio := upper(regexp_replace(rut_texto, '[\.\-]', '', 'g'));
    
    -- Fase 2: Validación de la longitud mínima operacional
    IF length(rut_limpio) < 2 THEN
        RETURN FALSE;
    END IF;

    -- Fase 3: Extracción de los componentes lógicos
    cuerpo := cast(substring(rut_limpio from 1 for length(rut_limpio) - 1) as INT);
    dv_ingresado := substring(rut_limpio from length(rut_limpio) for 1);

    -- Fase 4: Ejecución del algoritmo aritmético Módulo 11
    WHILE cuerpo > 0 LOOP
        digito := cuerpo % 10;
        suma := suma + (digito * multiplo);
        cuerpo := trunc(cuerpo / 10);
        
        multiplo := multiplo + 1;
        IF multiplo > 7 THEN
            multiplo := 2;
        END IF;
    END LOOP;

    -- Fase 5: Determinación del residuo y asignación del dígito esperado
    resto := 11 - (suma % 11);
    
    IF resto = 11 THEN
        dv_esperado := '0';
    ELSIF resto = 10 THEN
        dv_esperado := 'K';
    ELSE
        dv_esperado := cast(resto as VARCHAR);
    END IF;

    -- Fase 6: Retorno de la comprobación de igualdad
    RETURN dv_esperado = dv_ingresado;
EXCEPTION
    -- En caso de que la conversión de tipos falle (e.g., letras en el cuerpo)
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Aplicación del algoritmo como restricción inquebrantable en las tablas
ALTER TABLE public.empresas 
ADD CONSTRAINT chk_rut_empresa_valido CHECK (public.validar_rut_chileno(rut));

ALTER TABLE public.clientes_pyme 
ADD CONSTRAINT chk_rut_cliente_valido CHECK (public.validar_rut_chileno(rut));


La declaración de esta función incluye el calificador IMMUTABLE, una instrucción crítica para el planificador de consultas de PostgreSQL. Al declarar la función como inmutable, el motor entiende que el resultado no depende del estado de la base de datos, sino estrictamente de la cadena de texto de entrada. Esto permite a PostgreSQL almacenar en caché los resultados durante las operaciones de inserción masiva, optimizando drásticamente el consumo de CPU. La restricción CHECK bloquea a nivel de transacción cualquier inserción que no satisfaga el modelo matemático, protegiendo la integridad transaccional del SaaS.
Inyección de Contexto e Identidad: Auth Hooks y Custom Claims
El mayor desafío técnico en la implementación de Seguridad a Nivel de Fila (RLS) en bases de datos relacionales compartidas radica en la disponibilidad del contexto de autorización durante la ejecución de la consulta. Las políticas RLS necesitan responder instantáneamente a preguntas complejas: ¿A qué PyME pertenece la sesión que está ejecutando este SELECT? ¿Tiene este usuario el rol de administrador requerido para emitir un UPDATE?
El Cuello de Botella de las Consultas Anidadas en RLS
La aproximación inicial (e ingenua) al desarrollo de RLS consiste en crear políticas que consulten directamente las tablas de permisos para verificar el acceso. Esta estrategia, conocida académicamente como "Control de Acceso Basado en Tablas" o "Normalized Table-Based ACL", emplea la función nativa auth.uid() para buscar dinámicamente el identificador de la empresa.
SQL
-- Arquitectura Vulnerable al Rendimiento (Antipatrón RLS)
CREATE POLICY "Empleados ven clientes de su tenant" 
ON public.clientes_pyme FOR SELECT USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.usuarios_empresa 
        WHERE usuario_id = auth.uid()
    )
);


Si bien este enfoque mantiene la base de datos normalizada y refleja cambios de permisos de forma instantánea, introduce un impacto catastrófico en el rendimiento a medida que los volúmenes de datos crecen. La naturaleza de las políticas RLS dicta que el motor de base de datos debe evaluar la condición USING para cada fila recuperada. Al utilizar una subconsulta (SELECT empresa_id FROM...), el planificador de consultas se ve forzado a ejecutar ciclos de anidamiento adicionales (Nested Loops o Hash Joins paralelos). Las pruebas empíricas demuestran que esta arquitectura añade latencias severas, aumentando los tiempos de respuesta de fracciones de milisegundo a más de 25 milisegundos en peticiones de baja complejidad. Para un SaaS B2B que procesa miles de registros por vista, este diseño ahogará los recursos de la CPU del clúster.
La Excelencia Arquitectónica: Auth Hooks y Caché de Claims en el JWT
Para superar las limitaciones de rendimiento impuestas por las uniones de tablas, la industria ha convergido hacia el uso de metadatos incrustados criptográficamente en el token de acceso, conocidos como Custom Claims. En Supabase, esto se logra magistralmente mediante la implementación de Auth Hooks, específicamente el Hook de Custom Access Token.
Un Auth Hook es una función escrita en PL/pgSQL que intercepta el flujo de autenticación del servicio GoTrue instantes antes de que el JSON Web Token (JWT) sea firmado digitalmente y enviado al cliente web o móvil. Al ejecutar lógica de negocio durante este gancho, el desarrollador puede consultar la tabla usuarios_empresa una única vez durante el inicio de sesión, extraer el empresa_id y el rol, y serializar esta información directamente dentro de la carga útil (payload) del JWT.
Cuando la aplicación en Next.js realiza una solicitud a Supabase, el cliente @supabase/supabase-js envía este token en el encabezado Authorization. La pasarela API Kong y el servidor PostgREST verifican la firma del token; si es válida, PostgREST extrae la carga útil completa y la inyecta en el estado local de la transacción de PostgreSQL bajo el objeto request.jwt.claims. Esto significa que el contexto completo del inquilino y sus roles está disponible en memoria RAM local para el motor de base de datos durante la duración de la consulta, reduciendo el costo de las políticas RLS a cero operaciones de disco o uniones relacionales.
Desarrollo e Implementación del Auth Hook
El primer paso para consolidar esta arquitectura de identidad es desarrollar la función que modificará el token. Esta función recibe un argumento JSONB estructurado que contiene los metadatos del evento de inicio de sesión y debe retornar la estructura JSONB modificada.
SQL
CREATE OR REPLACE FUNCTION public.hook_token_acceso_personalizado(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims jsonb;
    registro_identidad record;
BEGIN
    -- 1. Aislar los claims propuestos originales del evento de GoTrue
    claims := event->'claims';

    -- 2. Consultar la membresía del inquilino en la tabla relacional.
    -- Se utiliza el cast (::uuid) para asegurar una evaluación estricta en el WHERE.
    SELECT empresa_id, rol INTO registro_identidad 
    FROM public.usuarios_empresa 
    WHERE usuario_id = (event->>'user_id')::uuid 
    LIMIT 1;

    -- 3. Mutación del token si se confirma la pertenencia al tenant
    IF registro_identidad.empresa_id IS NOT NULL THEN
        -- Se incrustan los datos bajo el nodo app_metadata para mantener convenciones
        claims := jsonb_set(claims, '{app_metadata, empresa_id}', to_jsonb(registro_identidad.empresa_id));
        claims := jsonb_set(claims, '{app_metadata, rol}', to_jsonb(registro_identidad.rol));
    ELSE
        -- Precaución de seguridad: Limpiar claims residuales si no hay membresía
        claims := jsonb_set(claims, '{app_metadata, empresa_id}', 'null'::jsonb);
        claims := jsonb_set(claims, '{app_metadata, rol}', 'null'::jsonb);
    END IF;

    -- 4. Reconstruir la estructura del evento y retornar al orquestador GoTrue
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
EXCEPTION
    -- Resiliencia operativa: Retornar el token intacto si falla la conexión interna
    WHEN OTHERS THEN
        RETURN event;
END;
$$;

-- Refuerzo del perímetro de seguridad: Restringir acceso de ejecución
REVOKE ALL ON FUNCTION public.hook_token_acceso_personalizado FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.hook_token_acceso_personalizado TO supabase_auth_admin;


Para activar este mecanismo, la infraestructura de Supabase debe ser configurada para reconocer e invocar el procedimiento almacenado. Esto se logra modificando el archivo de configuración declarativa del proyecto, el config.toml, ubicado en el repositorio de la aplicación bajo el directorio local de Supabase.
Ini, TOML
# Archivo: supabase/config.toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/hook_token_acceso_personalizado"


El compromiso estructural ineludible de esta arquitectura (el "trade-off" fundamental) reside en la naturaleza inmutable y temporal del JWT. Debido a que los permisos están cacheados criptográficamente en el token, si el administrador del SaaS o el dueño de la PyME revoca el acceso de un empleado, el JWT emitido previamente por ese empleado seguirá siendo válido hasta su tiempo de expiración natural (habitualmente configurado a una hora o menos). Para el dominio del desarrollo SaaS B2B, esta "consistencia eventual" en la autorización es universalmente aceptada a cambio del monumental incremento en la escalabilidad y las latencias de lectura inferiores al milisegundo.
Diseño de Políticas RLS para Aislamiento Hermético
Con la identidad y el contexto del tenant disponibles asincrónicamente en la memoria de la transacción mediante los Custom Claims, el siguiente estrato arquitectónico requiere la construcción de las políticas Row Level Security (RLS) en PostgreSQL. Las políticas RLS son constructos declarativos evaluados en lo más profundo del planificador de consultas de la base de datos. Actúan adhiriendo filtros implícitos a cualquier instrucción SQL proveniente de clientes externos. Esto asegura que, incluso si existe una falla catastrófica en el ruteo lógico del servidor Next.js que omita el parámetro empresa_id en la petición del ORM, la base de datos truncará el acceso, impidiendo vulneraciones e incidentes de seguridad de datos masivos.
El mandamiento absoluto en aplicaciones compartidas dicta que todas las tablas expuestas a través del API Gateway deben tener habilitado explícitamente el motor RLS utilizando el comando ALTER TABLE <nombre> ENABLE ROW LEVEL SECURITY;.
Funciones de Extracción Determinística
Para prevenir la repetición de lógica compleja de transformación de tipos y parsing de JSON en cada declaración de política, las mejores prácticas prescriben la creación de funciones ayudantes (helpers) dedicadas.
SQL
CREATE OR REPLACE FUNCTION auth.get_tenant_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE 
AS $$
    SELECT nullif(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'empresa_id', 
        ''
    )::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.get_rol() 
RETURNS TEXT 
LANGUAGE sql 
STABLE 
AS $$
    SELECT nullif(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'rol', 
        ''
    )::TEXT;
$$;


La designación de la volatilidad en estas funciones es un detalle imperativo. Al etiquetar las funciones como STABLE en lugar de VOLATILE (el valor por omisión si no se especifica), el arquitecto de la base de datos comunica al planificador de PostgreSQL que el valor retornado por la función no variará durante la vida de la declaración que la contiene. Si se omitiera este calificador, PostgreSQL volvería a parsear el documento JSON y reconstruir la cadena para cada fila escaneada en una consulta de millones de registros, degradando dramáticamente la velocidad del sistema.
Implementación del Modelo de Permisos (RBAC y Aislamiento)
La arquitectura de políticas difiere sutilmente en función del tipo de operación (Mutación o Lectura) que intentan controlar. En PostgreSQL, la declaración USING determina la visibilidad de los registros existentes frente a operaciones de SELECT, UPDATE y DELETE. Por otra parte, la declaración WITH CHECK garantiza imperativamente que las nuevas inserciones (INSERT) o las manipulaciones resultantes de una actualización (UPDATE) mantengan la conformidad con las reglas antes de confirmarse (commit) en el disco duro.
La matriz de seguridad completa aplicada a la tabla clientes_pyme se diseña bajo la estricta doctrina del privilegio mínimo:
SQL
-- Activar el sistema en la tabla objetivo
ALTER TABLE public.clientes_pyme ENABLE ROW LEVEL SECURITY;

-- 1. Acceso de Lectura: Todos los miembros autenticados leen registros de su PyME
CREATE POLICY "Aislamiento de Lectura de Clientes" 
ON public.clientes_pyme FOR SELECT 
TO authenticated 
USING (empresa_id = auth.get_tenant_id());

-- 2. Creación de Registros: Empleados y administradores añaden datos a su entorno
CREATE POLICY "Aislamiento de Inserción de Clientes" 
ON public.clientes_pyme FOR INSERT 
TO authenticated 
WITH CHECK (empresa_id = auth.get_tenant_id());

-- 3. Modificación: Restricción jerárquica a administradores del Tenant
CREATE POLICY "Aislamiento de Modificación (Solo Administradores)" 
ON public.clientes_pyme FOR UPDATE 
TO authenticated 
USING (
    empresa_id = auth.get_tenant_id() 
    AND auth.get_rol() = 'admin'
)
WITH CHECK (
    empresa_id = auth.get_tenant_id() 
    AND auth.get_rol() = 'admin'
);

-- 4. Eliminación de Registros: Restricción exclusiva de purga de información
CREATE POLICY "Aislamiento de Eliminación (Solo Administradores)" 
ON public.clientes_pyme FOR DELETE 
TO authenticated 
USING (
    empresa_id = auth.get_tenant_id() 
    AND auth.get_rol() = 'admin'
);


La separación explícita de USING y WITH CHECK durante la operación de UPDATE es un vector crítico de seguridad. Si un desarrollador omite la declaración WITH CHECK, un usuario legítimo podría realizar un UPDATE seleccionando un registro que válidamente posee, pero modificando el valor del empresa_id a la identidad UUID de una empresa competidora. Como la regla USING filtra antes del cambio, la transacción inicial tendría éxito, y al no existir verificación post-cambio, el registro cambiaría de propietario y desaparecería en favor del inquilino ajeno. La dualidad de comprobación elimina este vector de robo de datos lateral.
Patologías Estructurales y Errores Críticos en la Seguridad Multi-Tenant
El diseño de plataformas multi-tenant sobre bases de datos relacionales robustas es propenso a vulnerabilidades lógicas si no se controlan meticulosamente los contextos de evaluación. Existen dos patologías críticas que los arquitectos deben evadir categóricamente para garantizar la operatividad de la infraestructura.
El Bucle de Recursión Infinita (ERROR: 42P17)
El incidente arquitectónico más paralizante reportado en entornos B2B sobre Supabase es la aparición del error ERROR: 42P17: infinite recursion detected in policy. Este fenómeno bloquea en seco las transacciones de base de datos e interrumpe la plataforma de forma masiva.
Este error se manifiesta cuando los arquitectos implementan el "Control de Acceso Basado en Tablas" mencionado anteriormente, creando dependencias circulares (Directed Acyclic Graphs defectuosos) en el planificador de consultas. La anatomía del desastre ocurre de la siguiente forma : El arquitecto redacta una política en la tabla empresas que dicta: "El usuario puede ver la empresa si su identificador figura en la tabla usuarios_empresa". A su vez, para proteger los metadatos de configuración corporativa, el arquitecto añade una política en usuarios_empresa estipulando: "El usuario puede ver su asignación solo si tiene acceso de lectura a la empresa correspondiente".
Cuando la API envía una solicitud de lectura sobre la tabla de empresas, PostgreSQL detiene la ejecución para evaluar RLS. Inicia la consulta hacia usuarios_empresa, la cual desencadena la política interna de esa tabla que intenta verificar los permisos sobre empresas, creando un bucle irresoluble. PostgreSQL interrumpe la transacción y emite el error 42P17 casi instantáneamente.
La inmunidad estructural a este fallo se logra absteniéndose por completo de diseñar políticas que consulten otras tablas. Al adoptar el paradigma del Auth Hook y los Custom Claims, las funciones auth.get_tenant_id() consultan variables atómicas en la memoria volátil de la transacción, rompiendo irreversiblemente el ciclo de la dependencia en tablas relacionales y erradicando el riesgo del bucle infinito.
Fugas de Datos por Elevación de Privilegios (SECURITY DEFINER)
El ecosistema PostgreSQL diferencia la ejecución de funciones procedimentales mediante dos perfiles: SECURITY INVOKER (el código asume las credenciales del cliente que efectúa la llamada, siendo susceptible a RLS) y SECURITY DEFINER (el código se eleva y asume los privilegios de administrador del autor de la función, sobrepasando las reglas RLS).
El patrón de vulnerabilidad surge cuando los ingenieros construyen procedimientos almacenados (RPCs) expuestos en el esquema público y los elevan mediante SECURITY DEFINER para permitir a usuarios regulares realizar modificaciones en registros inaccesibles por RLS.
SQL
-- Función Vulnerable y Susceptible a la Manipulación Insegura Directa (Insecure Direct Object Reference)
CREATE OR REPLACE FUNCTION public.escalar_ticket_soporte(ticket_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- No existe validación de tenencia contextualizada
    UPDATE tickets_soporte SET estado = 'crítico' WHERE id = ticket_id;
END;
$$;


Si el código superior es invocado desde Next.js a través del cliente Supabase, el atacante autenticado puede sustituir la carga útil de la solicitud enviando el UUID de un ticket perteneciente a otra empresa. Debido a que la función SECURITY DEFINER opera ignorando las directrices de RLS, modificará ciegamente el registro objetivo, comprometiendo la segregación del entorno.
La mitigación de este antipatrón requiere una disciplina de diseño inflexible: cualquier función SECURITY DEFINER expuesta al enrutador de red debe incorporar comprobaciones afirmativas internas, comparando los registros recuperados contra auth.get_tenant_id() u auth.uid(), forzando el cumplimiento de la autorización local antes de permitir la ejecución de las mutaciones.
Estrategias Críticas de Indexación y Rendimiento B-Tree para Multi-Tenant
A medida que el ecosistema B2B adquiere tracción en el mercado, el volumen de datos migra de miles de filas a decenas de millones. En este paradigma, cada consulta que cruza la pasarela hacia las tablas principales del SaaS debe filtrar los datos cruzando el identificador del inquilino, asegurado invisiblemente por las políticas RLS. Sin una infraestructura de índices estratégicamente diseñada, PostgreSQL acudirá a los análisis secuenciales (Sequential Scans), leyendo disco tras disco y saturando la E/S del servidor, lo que generará latencias prohibitivas que degradan la experiencia en Next.js.
Arquitectura de Índices Compuestos y la Jerarquía del Tenant
Para neutralizar los escaneos secuenciales masivos, la creación de Índices Multicolumna B-Tree (Árboles Balanceados) es mandatoria. Los árboles B organizan la entropía estructural de forma secuencial de izquierda a derecha en su definición. La efectividad predictiva de este árbol florece cuando las restricciones impuestas por las consultas recaen con total igualdad (=) sobre la columna que lidera y encabeza la configuración del índice a la izquierda.
En una arquitectura de tabla compartida con Aislamiento RLS, cada una de las consultas formuladas incorporará, mediante la inyección del motor, una cláusula condicionante idéntica: WHERE empresa_id = '...'. Por definición estructural y arquitectónica, la columna correspondiente al inquilino (empresa_id o tenant_id) debe preceder y coronar indiscutiblemente a cualquier otra variable analítica o de estado en la constitución de los índices de dominio general.
Deconstruyendo el Mito de la Selectividad
En los foros técnicos y círculos de administradores de bases de datos, frecuentemente emerge el axioma falaz de que el orden de las columnas en un índice compuesto debe basarse en la cardinalidad o selectividad estadística del dato (ordenando primero la columna más selectiva, como un correo electrónico único, por encima del identificador de la PyME, que es mucho más genérico). Este folclore carece de sustento en la implementación moderna de B-Trees de PostgreSQL.
Cuando el planificador evalúa igualdades conjuntas a través del operador =(como en empresa_id = X AND rut_cliente = Y), la profundidad de selectividad estadística de los nodos no altera la asintótica velocidad con la que el motor alcanza los bloques de memoria requeridos. Dado que las políticas de seguridad subyacentes insertarán de facto la variable de igualdad empresa_id en el 100% de las consultas (mientras que otras dimensiones pueden ser opcionales y depender de la interacción del usuario final en la interfaz), gobernar la partición jerárquica primaria utilizando el identificador de tenencia asegura la máxima eficiencia y previsibilidad del sistema de índices compuesto.
Casuística e Implementación Táctica
Si se analiza el patrón de carga cuando una PyME consulta su panel de facturación en la interfaz diseñada con Next.js, la aplicación emite una consulta para extraer el listado ordenado cronológicamente y filtrado por el estatus del documento.
SQL
SELECT id, estado, total, creado_en 
FROM public.facturas 
WHERE estado = 'pagado' 
ORDER BY creado_en DESC 
LIMIT 50;


A nivel profundo de motor, la intersección con el contexto de identidad (el token RLS) transforma imperceptiblemente la sentencia subyacente en la siguiente expresión equivalente:
SQL
SELECT id, estado, total, creado_en 
FROM public.facturas 
WHERE empresa_id = 'uuid-extraido-del-jwt' 
  AND estado = 'pagado' 
ORDER BY creado_en DESC 
LIMIT 50;


La tabla a continuación resume las estrategias de indexación críticas recomendadas para este escenario analítico y sus paralelos.
Patrón Operacional y Lógica Transaccional
Definición de Indexación SQL Recomendada
Justificación Técnica Arquitectónica
Búsqueda cronológica o paginación infinita en Next.js
CREATE INDEX idx_f_tenant_fecha ON facturas (empresa_id, creado_en DESC);
El árbol delimita físicamente los datos del inquilino y evade la penalización de carga Sort al tener la dimensión de tiempo ya ordenada secuencialmente en el disco.
Filtrado cruzado multivariable por panel analítico
CREATE INDEX idx_f_tenant_estado_fecha ON facturas (empresa_id, estado, creado_en DESC);
Al evaluar igualdades sobre múltiples atributos y demandar reordenamiento en tiempo real, esta composición acelera vertiginosamente la recuperación.
Consultas de alta frecuencia (Búsqueda de Cliente Único)
CREATE INDEX idx_c_tenant_rut ON clientes_pyme (empresa_id, rut);
Acelera subrutinas de validación y procesos ETL mitigando bloqueos masivos ante cargas transaccionales concentradas en clientes de alta rotación.

Mediante la concatenación estratégica del tiempo direccional descendente (DESC) en las configuraciones B-Tree, el sistema informático se libra computacionalmente del gravoso paso de acopio y ordenación en los confines de la memoria virtual, transitando únicamente los nodos de interés hasta resolver la instrucción transaccional.
Tácticas de Evaluación y Depuración (EXPLAIN ANALYZE)
Para garantizar la viabilidad a escala empresarial, es mandatorio que el equipo de desarrollo realice pruebas diagnósticas y validación de planes de ejecución valiéndose del comando empírico EXPLAIN ANALYZE en simulacros de entornos locales. Este comando evidencia las ramificaciones de costos y expone debilidades donde las restricciones RLS interfieren con el rendimiento de los índices creados. No obstante, los desarrolladores de plataformas basadas en identidad externalizada se enfrentan frecuentemente a la imposibilidad de evaluar estas sentencias al no disponer directamente del contexto JSON que emite GoTrue a través de Kong y PostgREST.
La técnica probada consiste en inyectar artificialmente la estructura del Auth Hook simulando una sesión y un contexto JWT en el inicio del bloque de la transacción interactiva.
SQL
BEGIN;
-- Se simula la pasarela de integración RLS, cargando la variable en el hilo de conexión
SET LOCAL request.jwt.claims = '{"app_metadata": {"empresa_id": "8bb0dbf6-5eec-4a7b-a320-a61f365942f9", "rol": "admin"}}';

-- Se inspecciona la eficiencia y costo de latencia utilizando EXPLAIN ANALYZE
EXPLAIN ANALYZE 
SELECT * FROM public.facturas 
WHERE creado_en >= now() - interval '90 days' 
  AND estado = 'pagado'
ORDER BY creado_en DESC;
COMMIT;


La ejecución y asimilación de los reportes provistos por este diagnóstico revelarán la latencia y la adopción de los barridos de índices frente a los nocivos escaneos de secuencia, facultando al ingeniero a calibrar progresivamente las declaraciones jerárquicas y sostener el rendimiento asintótico exigido.
La integración orquestada de una tenencia compartida estructurada sobre PostgreSQL subyacente, flanqueada inquebrantablemente por políticas de Seguridad a Nivel de Fila evaluadas a través de extensiones estables derivadas del JSON Web Token, e impulsada por una configuración de índices altamente jerarquizada, otorga una resiliencia e impermeabilidad extraordinarias para los emprendimientos de software orientados a la gestión corporativa de la red de PyMEs en Chile y ecosistemas análogos a escala global.

