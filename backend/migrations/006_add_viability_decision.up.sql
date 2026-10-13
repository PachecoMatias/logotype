ALTER TABLE proyectos
  ADD COLUMN decision_viabilidad VARCHAR(16)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL AFTER analisis_ia,
  ADD COLUMN decision_motivo TEXT
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL AFTER decision_viabilidad,
  ADD COLUMN decision_fecha DATETIME NULL AFTER decision_motivo,
  ADD CONSTRAINT chk_proyectos_decision_viabilidad
    CHECK (
      decision_viabilidad IS NULL
      OR decision_viabilidad IN ('VIABLE', 'NO_VIABLE')
    );

UPDATE proyectos
SET decision_viabilidad = 'VIABLE',
    decision_fecha = COALESCE(decision_fecha, actualizado_en)
WHERE estado = 'planificado' AND decision_viabilidad IS NULL;
