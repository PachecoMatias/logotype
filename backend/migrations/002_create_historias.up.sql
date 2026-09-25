CREATE TABLE historias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  proyecto_id INT UNSIGNED NOT NULL,
  prioridad VARCHAR(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  historia_usuario TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  criterios_aceptacion JSON NOT NULL,
  alcance_tecnico TEXT NOT NULL,
  estimacion_fibonacci TINYINT UNSIGNED NOT NULL,
  rol_sugerido VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  fase VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  columna_tablero VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs
    NOT NULL DEFAULT 'Backlog',
  fecha_inicio_estimada DATE NULL,
  fecha_fin_estimada DATE NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_historias PRIMARY KEY (id),
  CONSTRAINT fk_historias_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_historias_prioridad
    CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
  CONSTRAINT chk_historias_historia_usuario
    CHECK (CHAR_LENGTH(TRIM(historia_usuario)) > 0),
  CONSTRAINT chk_historias_descripcion
    CHECK (CHAR_LENGTH(TRIM(descripcion)) > 0),
  CONSTRAINT chk_historias_criterios
    CHECK (
      JSON_TYPE(criterios_aceptacion) = 'ARRAY'
      AND JSON_LENGTH(criterios_aceptacion) > 0
    ),
  CONSTRAINT chk_historias_alcance_tecnico
    CHECK (CHAR_LENGTH(TRIM(alcance_tecnico)) > 0),
  CONSTRAINT chk_historias_estimacion
    CHECK (estimacion_fibonacci IN (1, 2, 3, 5, 8, 13, 21)),
  CONSTRAINT chk_historias_rol
    CHECK (
      rol_sugerido IN (
        'Desarrollador Frontend',
        'Desarrollador Backend',
        'Analista QA',
        'Analista de Ciberseguridad',
        'Analista de requerimientos',
        'Project Manager'
      )
    ),
  CONSTRAINT chk_historias_fase
    CHECK (
      fase IN (
        'Análisis',
        'Diseño',
        'Desarrollo Frontend',
        'Desarrollo Backend',
        'Testing',
        'Despliegue'
      )
    ),
  CONSTRAINT chk_historias_columna
    CHECK (
      columna_tablero IN (
        'Backlog',
        'To Do',
        'In Progress',
        'In Code Review',
        'In QA',
        'Done'
      )
    ),
  CONSTRAINT chk_historias_fechas
    CHECK (
      (fecha_inicio_estimada IS NULL AND fecha_fin_estimada IS NULL)
      OR (
        fecha_inicio_estimada IS NOT NULL
        AND fecha_fin_estimada IS NOT NULL
        AND fecha_fin_estimada >= fecha_inicio_estimada
      )
    ),
  INDEX ix_historias_proyecto_columna (proyecto_id, columna_tablero)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
