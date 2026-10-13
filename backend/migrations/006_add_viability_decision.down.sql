ALTER TABLE proyectos
  DROP CHECK chk_proyectos_decision_viabilidad,
  DROP COLUMN decision_fecha,
  DROP COLUMN decision_motivo,
  DROP COLUMN decision_viabilidad;
