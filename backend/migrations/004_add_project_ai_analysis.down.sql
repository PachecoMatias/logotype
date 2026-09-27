ALTER TABLE proyectos
  DROP CHECK chk_proyectos_estado,
  ADD CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo')),
  DROP CHECK chk_proyectos_analisis_ia_objeto,
  DROP COLUMN analisis_ia;
