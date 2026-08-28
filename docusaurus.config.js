/**
 * Docusaurus config — Documentación de Roplex
 *
 * Vanilla setup (preset-classic) with docs served at the site root
 * (routeBasePath: "/"), matching the layout used at docs.zauru.com.
 */
const lightCodeTheme = require("prism-react-renderer").themes.github;
const darkCodeTheme = require("prism-react-renderer").themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Documentación de Roplex",
  tagline: "CMS headless ecommerce de Zauru",
  url: "https://docs.roplex.com",
  baseUrl: "/",
  trailingSlash: false,

  projectName: "docs-roplex",
  organizationName: "intuitiva",

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
      onBrokenMarkdownImages: "ignore",
    },
  },

  i18n: {
    defaultLocale: "es",
    locales: ["es"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          editUrl: undefined,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        blog: false,
      }),
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [],
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "Documentación de Roplex",
        items: [
          {
            type: "docSidebar",
            sidebarId: "defaultSidebar",
            position: "left",
            label: "Checkout",
          },
        ],
      },
      footer: {
        style: "light",
        links: [
          {
            title: "Documentación",
            items: [{ label: "Inicio", to: "/" }],
          },
          {
            title: "Contacto",
            items: [
              {
                label: "Intuitiva Solutions",
                href: "https://www.intuitiva.solutions",
              },
            ],
          },
        ],
        copyright: `Creado por <a href="https://www.intuitiva.solutions">Intuitiva</a>. © Intuitiva, S.A. ${new Date().getFullYear()}.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ["bash"],
      },
    }),
};

module.exports = config;
