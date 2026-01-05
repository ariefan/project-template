import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { metadata, timestamps } from "./helpers";

// ============================================================================
// ENUMS
// ============================================================================

export const serviceCategoryEnum = pgEnum("service_category", [
  "consultation",
  "examination",
  "vaccination",
  "surgery",
  "dental",
  "diagnostic",
  "laboratory",
  "imaging",
  "grooming",
  "boarding",
  "emergency",
  "preventive_care",
  "treatment",
  "hospitalization",
  "euthanasia",
  "other",
]);

export const serviceStatusEnum = pgEnum("service_status", [
  "active",
  "inactive",
  "discontinued",
]);

export const pricingModelEnum = pgEnum("pricing_model", [
  "fixed",
  "per_unit",
  "per_hour",
  "per_day",
  "per_weight",
  "tiered",
]);

// Type exports
export type ServiceCategory = (typeof serviceCategoryEnum.enumValues)[number];
export type ServiceStatus = (typeof serviceStatusEnum.enumValues)[number];
export type PricingModel = (typeof pricingModelEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const serviceCategories = pgTable(
  "vet_service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),
    description: text("description"),
    parentCategoryId: uuid("parent_category_id"),

    // Display
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").default(0),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_service_categories_parent_idx").on(table.parentCategoryId),
    index("vet_service_categories_is_active_idx").on(table.isActive),
  ]
);

export const services = pgTable(
  "vet_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Service identification
    serviceCode: text("service_code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),

    // Category
    category: serviceCategoryEnum("category").notNull(),
    categoryId: uuid("category_id").references(() => serviceCategories.id, {
      onDelete: "set null",
    }),

    // Pricing
    pricingModel: pricingModelEnum("pricing_model").default("fixed").notNull(),
    basePrice: decimal("base_price", { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }), // Internal cost

    // Tax
    taxable: boolean("taxable").default(true).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),

    // Duration and capacity
    estimatedDuration: integer("estimated_duration"), // minutes
    requiresAppointment: boolean("requires_appointment")
      .default(true)
      .notNull(),

    // Species applicability
    applicableSpecies: json("applicable_species").$type<string[]>(),

    // Requirements
    requiresVeterinarian: boolean("requires_veterinarian")
      .default(true)
      .notNull(),
    requiredEquipment: json("required_equipment").$type<string[]>(),
    prerequisites: json("prerequisites").$type<string[]>(),

    // Status
    status: serviceStatusEnum("status").default("active").notNull(),

    // Display
    displayOrder: integer("display_order").default(0),
    thumbnailUrl: text("thumbnail_url"),

    // Instructions
    preparationInstructions: text("preparation_instructions"),
    aftercareInstructions: text("aftercare_instructions"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_services_category_idx").on(table.category),
    index("vet_services_category_id_idx").on(table.categoryId),
    index("vet_services_status_idx").on(table.status),
    index("vet_services_service_code_idx").on(table.serviceCode),
  ]
);

export const servicePriceTiers = pgTable(
  "vet_service_price_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),

    // Tier definition
    tierName: text("tier_name").notNull(),
    minValue: decimal("min_value", { precision: 10, scale: 2 }),
    maxValue: decimal("max_value", { precision: 10, scale: 2 }),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),

    // Description
    description: text("description"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_service_price_tiers_service_id_idx").on(table.serviceId),
  ]
);

export const servicePackages = pgTable(
  "vet_service_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Package identification
    packageCode: text("package_code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),

    // Pricing
    packagePrice: decimal("package_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    regularPrice: decimal("regular_price", { precision: 12, scale: 2 }), // Sum of individual services
    savings: decimal("savings", { precision: 12, scale: 2 }), // Discount amount

    // Validity
    validityDays: integer("validity_days"), // e.g., 30 days, 90 days
    usageLimit: integer("usage_limit"), // Max number of times can be used

    // Services included (JSON array of service IDs)
    includedServices:
      json("included_services").$type<
        Array<{
          serviceId: string;
          quantity: number;
        }>
      >(),

    // Applicability
    applicableSpecies: json("applicable_species").$type<string[]>(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Display
    thumbnailUrl: text("thumbnail_url"),
    displayOrder: integer("display_order").default(0),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_service_packages_is_active_idx").on(table.isActive),
    index("vet_service_packages_package_code_idx").on(table.packageCode),
  ]
);

export const products = pgTable(
  "vet_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Product identification
    productCode: text("product_code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),

    // Category
    category: text("category").notNull(), // e.g., "medication", "supplies", "food", "toys"

    // Brand and manufacturer
    brand: text("brand"),
    manufacturer: text("manufacturer"),

    // Pricing
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 12, scale: 2 }),

    // Tax
    taxable: boolean("taxable").default(true).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),

    // Inventory tracking
    trackInventory: boolean("track_inventory").default(true).notNull(),
    currentStock: integer("current_stock").default(0),
    reorderLevel: integer("reorder_level"),
    reorderQuantity: integer("reorder_quantity"),

    // Unit of measure
    unitOfMeasure: text("unit_of_measure").default("piece").notNull(), // piece, box, bottle, kg, etc.

    // Prescription required
    requiresPrescription: boolean("requires_prescription")
      .default(false)
      .notNull(),

    // Expiry tracking
    hasExpiryDate: boolean("has_expiry_date").default(false).notNull(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Display
    thumbnailUrl: text("thumbnail_url"),
    displayOrder: integer("display_order").default(0),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_products_category_idx").on(table.category),
    index("vet_products_is_active_idx").on(table.isActive),
    index("vet_products_product_code_idx").on(table.productCode),
    index("vet_products_track_inventory_idx").on(table.trackInventory),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const serviceCategoriesRelations = relations(
  serviceCategories,
  ({ one, many }) => ({
    parentCategory: one(serviceCategories, {
      fields: [serviceCategories.parentCategoryId],
      references: [serviceCategories.id],
      relationName: "subcategories",
    }),
    subcategories: many(serviceCategories, {
      relationName: "subcategories",
    }),
    services: many(services),
  })
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  priceTiers: many(servicePriceTiers),
}));

export const servicePriceTiersRelations = relations(
  servicePriceTiers,
  ({ one }) => ({
    service: one(services, {
      fields: [servicePriceTiers.serviceId],
      references: [services.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ServiceCategoryRow = typeof serviceCategories.$inferSelect;
export type NewServiceCategoryRow = typeof serviceCategories.$inferInsert;

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;

export type ServicePriceTierRow = typeof servicePriceTiers.$inferSelect;
export type NewServicePriceTierRow = typeof servicePriceTiers.$inferInsert;

export type ServicePackageRow = typeof servicePackages.$inferSelect;
export type NewServicePackageRow = typeof servicePackages.$inferInsert;

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
