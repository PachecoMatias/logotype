ALTER TABLE historias
  DROP CHECK chk_historias_rol,
  ADD CONSTRAINT chk_historias_rol
    CHECK (
      rol_sugerido IN (
        'Desarrollador Frontend',
        'Desarrollador Backend',
        'Analista QA',
        'Analista de Ciberseguridad',
        'Analista de requerimientos',
        'Project Manager'
      )
    );

ALTER TABLE proyectos
  DROP CHECK chk_proyectos_estado,
  ADD CONSTRAINT chk_proyectos_estado
    CHECK (estado IN ('nuevo', 'analizado'));
