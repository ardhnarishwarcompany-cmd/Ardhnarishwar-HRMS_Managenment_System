export const SIDEBAR_PERMISSIONS = {
  SUPER_ADMIN: {
    nav: "ALL",
    dashboard: "ALL",
  },

  TL: {
    nav: [
      "dashboard",
      "revenue-tracker",
    ],

    dashboard: [
      "employees",
      "candidate-management",
      "joined-candidates",
      "interview-scheduling",
      "client-decisions",
      "services",
      "hr-calling",
      "sales-reports",
      "joining",
      "sales-reports",
    ],
  },

  MANAGER: {
    nav: [
      "dashboard",
      "users",
      "departments",
      "complaints",
    ],
    
    dashboard: [
      "overview",
      "client-management",
      "employees",
      "attendance",
      "performance",
    ],
  },
};
