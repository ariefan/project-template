export default function (plop) {
  // Helper for kebab-case to PascalCase
  plop.setHelper("pascalCase", (text) =>
    text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  );

  // API App Generator
  plop.setGenerator("api-app", {
    description: "Create a new Fastify API application",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "API app name (e.g., api, api-gateway):",
        validate: (value) => (value ? true : "Name is required"),
      },
      {
        type: "input",
        name: "port",
        message: "Default port:",
        default: "3001",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "apps/{{kebabCase name}}",
        base: "templates/api-app",
        templateFiles: "templates/api-app/**/*",
        globOptions: { dot: true },
      },
    ],
  });

  // Web App Generator
  plop.setGenerator("web-app", {
    description: "Create a new Next.js web application",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Web app name (e.g., admin, dashboard):",
        validate: (value) => (value ? true : "Name is required"),
      },
      {
        type: "input",
        name: "port",
        message: "Default port:",
        default: "3000",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "apps/{{kebabCase name}}",
        base: "templates/web-app",
        templateFiles: "templates/web-app/**/*",
        globOptions: { dot: true },
      },
    ],
  });

  // Mobile App Generator
  plop.setGenerator("mobile-app", {
    description: "Create a new Expo mobile application",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Mobile app name (e.g., mobile, app):",
        validate: (value) => (value ? true : "Name is required"),
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "apps/{{kebabCase name}}",
        base: "templates/mobile-app",
        templateFiles: "templates/mobile-app/**/*",
        globOptions: { dot: true },
      },
    ],
  });

  // Component Generator
  plop.setGenerator("component", {
    description: "Create a new UI component in packages/ui",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Component name (e.g., button, card, dialog):",
        validate: (value) => (value ? true : "Name is required"),
      },
      {
        type: "confirm",
        name: "hasVariants",
        message: "Does this component have variants (using CVA)?",
        default: true,
      },
    ],
    actions: [
      {
        type: "add",
        path: "packages/ui/src/components/{{kebabCase name}}.tsx",
        templateFile: "templates/component/component.tsx.hbs",
      },
    ],
  });

  // Route Generator
  plop.setGenerator("route", {
    description: "Create a new route in a Next.js app",
    prompts: [
      {
        type: "input",
        name: "app",
        message: "App name (e.g., web, admin):",
        default: "web",
      },
      {
        type: "input",
        name: "path",
        message: "Route path (e.g., dashboard, settings/profile):",
        validate: (value) => (value ? true : "Path is required"),
      },
      {
        type: "list",
        name: "type",
        message: "Route type:",
        choices: ["page", "layout", "loading", "error", "not-found"],
        default: "page",
      },
    ],
    actions: [
      {
        type: "add",
        path: "apps/{{app}}/app/{{path}}/{{type}}.tsx",
        templateFile: "templates/route/{{type}}.tsx.hbs",
      },
    ],
  });
}
