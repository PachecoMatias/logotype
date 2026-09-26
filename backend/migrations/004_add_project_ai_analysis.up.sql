ALTER TABLE proyectos
  ADD COLUMN analisis_ia JSON NULL AFTER estado,
  ADD CONSTRAINT chk_proyectos_analisis_ia_objeto
    CHECK (analisis_ia IS NULL OR JSON_TYPE(analisis_ia) = 'OBJECT'),
  DROP CHECK chk_proyectos_estado,
  ADD CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo', 'analizado'));
