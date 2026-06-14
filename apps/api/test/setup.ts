// MET tests — base SQLite en memoria y sin scheduler. Debe correr ANTES de
// importar src/db (que lee MET_DB al cargarse).
process.env.MET_DB = ":memory:";
process.env.MET_NO_JOBS = "1";
process.env.MET_SECRET = "test-secret";
