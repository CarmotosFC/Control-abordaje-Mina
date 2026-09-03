# Scripts de prueba (NO ejecutar en Supabase)

`test_logic.sql` y `test_scan.sql` fueron usados para validar la lógica de
negocio (generación de código, duplicados, reglas de abordaje) contra un
PostgreSQL local durante el desarrollo. Crean una tabla `auth.users` de
prueba que **no existe así en Supabase** (allí `auth.users` ya la gestiona
Supabase Auth). No los ejecutes contra tu proyecto real — se dejan aquí
únicamente como evidencia de las pruebas realizadas y como referencia para
quien quiera volver a correrlas en un PostgreSQL local.
