# Documentación de Roplex — Docusaurus

Documentación de Roplex (CMS headless ecommerce de Zauru), construida con [Docusaurus 3](https://docusaurus.io).

## Requisitos

- [Node.js](https://nodejs.org/) **20+** (el repo fija Node 22.17.1 vía `.nvmrc`)
- npm 9+ (incluido con Node)

## Ejecutar localmente

Desde la raíz del repositorio:

```bash
npm install        # solo la primera vez
npm start          # http://localhost:3000
```

El servidor de desarrollo recarga la página automáticamente al guardar cambios.

## Compilar para producción

```bash
npm run build      # genera ./build con HTML/JS/CSS estáticos
npm run serve      # sirve el build de producción en http://localhost:3000
```

`npm run build` es la validación de correctitud: falla con links rotos o MDX inválido.

## Estructura

```
docs-roplex/
├── docusaurus.config.js     # Configuración del sitio
├── sidebars.js              # Sidebar autogenerada desde docs/
├── docs/                    # Documentación (fuente de verdad)
│   ├── index.md
│   └── checkout/
├── src/css/custom.css       # Sobreescrituras de tema
└── netlify.toml             # Configuración de build para Netlify
```

## Editar contenido

Toda la documentación se edita dentro de `docs/`. El menú lateral se genera automáticamente a partir de esa carpeta.

- **Reordenar secciones:** cambia `position` en `docs/<sección>/_category_.json`
- **Reordenar páginas hijas:** cambia `sidebar_position` en el front matter del `.md`
- **Renombrar en el menú:** cambia `sidebar_label` en el front matter

## Convenciones de escritura

Las reglas que gobiernan el contenido viven en `.cursor/rules/`:

- **`roplex-docs.mdc`** — fuente de verdad (el código de Roplex en `../roplex`), audiencia (programadores externos sin acceso al código) y la regla de las tres capas: el contrato HTTP se nombra tal cual viaja por la red, la configuración se nombra por su label en la UI, y la implementación interna no se documenta.
- **`technical-writer.mdc`** — estructura, voz activa, plantilla de documentación de endpoints y troubleshooting.

Léelas antes de agregar o modificar páginas.
