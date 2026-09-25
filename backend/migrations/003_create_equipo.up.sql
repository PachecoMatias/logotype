CREATE TABLE equipo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rol VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  perfil VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  cantidad TINYINT UNSIGNED NOT NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_equipo PRIMARY KEY (id),
  CONSTRAINT uq_equipo_rol_perfil UNIQUE (rol, perfil),
  CONSTRAINT chk_equipo_rol
    CHECK (
      rol IN (
        'Desarrollador Frontend',
        'Desarrollador Backend',
        'Analista QA',
        'Analista de Ciberseguridad',
        'Analista de requerimientos',
        'Project Manager'
      )
    ),
  CONSTRAINT chk_equipo_perfil
    CHECK (perfil IN ('Alto rendimiento', 'Administrativo')),
  CONSTRAINT chk_equipo_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
