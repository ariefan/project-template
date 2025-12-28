# Farm Plan Schema (Experimental)

This folder contains Drizzle schemas converted from Laravel/PHP migrations for the AIFarm project. These schemas are **intentionally isolated** and should be treated as experimental reference implementations only.

## Important Notice

**DO NOT** include this folder in:

- The main `packages/db/src/schema/index.ts` exports
- Any migration generation (`pnpm drizzle-kit generate`)
- Any database push operations (`pnpm drizzle-kit push`)
- Production database schemas

## Purpose

These schemas serve as a reference for:

- Understanding the AIFarm data model structure
- Planning future integration work
- Converting Laravel migrations to Drizzle ORM format
- Schema design reference

## Schema Overview

The schemas are organized into the following modules:

| File                 | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `locations.ts`       | Geographic data (provinces, cities)                            |
| `farms.ts`           | Farm entities, user associations, and invitations              |
| `species.ts`         | Animal species and breeds                                      |
| `herds.ts`           | Herd/group management                                          |
| `livestocks.ts`      | Individual livestock, weights, milkings, endings, milk quality |
| `breeding.ts`        | Breeding records, pregnancies, birth tracking                  |
| `genetics.ts`        | Genetic evaluations (EPD), genomic tests, breeding goals       |
| `traceability.ts`    | Premises, official IDs, movement records, breed registrations  |
| `compliance.ts`      | Disease reports, antimicrobial usage, certifications, audits   |
| `feeds.ts`           | Feed management, rations, feeding schedules, leftovers         |
| `health.ts`          | Vaccinations, treatments, health alerts                        |
| `inventory.ts`       | Inventory categories, items, batches, transactions, alerts     |
| `dairy.ts`           | Milk batches, cheese production, payment management            |
| `meat.ts` | Carcasses, meat cuts, processing batches, sales                |
| `labor.ts`           | Workers, certifications, tasks, work logs                      |
| `equipment.ts`       | Equipment assets, maintenance records, usage logs              |
| `financial.ts`       | Expense categories, transactions, livestock transfers          |

## Usage

If you need to use these schemas in the future:

1. Review and adapt the schemas for your specific needs
2. Ensure proper foreign key relationships with existing auth tables
3. Add the necessary exports to `packages/db/src/schema/index.ts`
4. Run migrations to apply to your database

## Source

Converted from Laravel migrations located at:
`C:\Users\arief\Herd\aifarm\database\migrations`

## Notes

- User references (`userId`, `user_id`) in these schemas are typed as `uuid` but do not include foreign key constraints to the main auth system's `users` table to maintain isolation
- The schemas use PostgreSQL-specific types and should work with any PostgreSQL database
- JSON columns include TypeScript type definitions for better type safety

## Schema Conventions

The following conventions are used throughout these schemas:

### Primary Keys
- **UUID with `.defaultRandom()`** for main aggregate entities (farms, livestocks, herds, etc.)
- **`serial`** for transaction/audit records and high-volume tables (weights, milkings, etc.)

### Foreign Keys
- **`integer()`** for references to `serial` primary keys
- **`uuid()`** for references to UUID primary keys
- All FK columns must have indexes for query performance

### Relationships
- **Cascade deletes** for owned relationships (e.g., farm deletion cascades to herds)
- **Set null** for reference relationships (e.g., livestock breed reference)

### Enums
- Defined at top of each file using `pgEnum()`
- Type exports provided using array index pattern: `(typeof enumName.enumValues)[number]`

### Type Exports
- `$inferSelect` for row types (e.g., `LivestockRow`)
- `$inferInsert` for insert types (e.g., `NewLivestockRow`)
- Enum value types exported separately

### Timestamps
- Standard pattern: `createdAt` with `.defaultNow()` and `updatedAt` with `.$onUpdate()`
- Soft deletes use optional `deletedAt` timestamp

## Regulatory Compliance

This schema is designed to support compliance with major agricultural, food safety, and animal health regulations. The following sections document the regulatory frameworks implemented.

### Food Safety & Traceability

#### **HACCP (Hazard Analysis Critical Control Points)**
Implemented in: [`dairy.ts`](./dairy.ts#L346-L433) - `pasteurizationBatches` table

- **Critical Control Points (CCPs)**: Temperature and time monitoring for pasteurization
- **HTST Pasteurization**: 72°C for 15 seconds (High Temperature Short Time)
- **LTLT Pasteurization**: 63°C for 30 minutes (Low Temperature Long Time)
- **UHT Pasteurization**: 135°C for 2-5 seconds (Ultra High Temperature)
- **Phosphatase Testing**: Pre/post-pasteurization enzyme testing to verify effectiveness
- **Corrective Actions**: Documentation of deviations and corrective measures
- **Equipment Calibration**: Tracking of calibration dates for HACCP validation
- **Regulatory References**: FDA 21 CFR Part 1240, PMO (Pasteurized Milk Ordinance)

#### **FDA Food Safety Modernization Act (FSMA)**
Implemented across: `dairy.ts`, `meat.ts`, `compliance.ts`, `traceability.ts`

- **Farm-to-Table Traceability**: Junction tables link products to source animals
  - [`milkBatchSources`](./dairy.ts#L243-L271): Milk batches → individual animal milkings
  - [`cheeseBatchSources`](./dairy.ts#L594-L622): Cheese batches → milk batches
  - Complete chain: Cheese → Milk Batch → Animal Milking → Specific Cow
- **Lot/Batch Tracking**: Unique batch codes with traceability metadata
- **Temperature Monitoring**: Cold chain tracking for milk transport (0-10°C)
- **Product Recall Support**: Ability to trace contamination back to source and forward to distribution
- **Record Retention**: Timestamps on all transactions for audit trails

#### **USDA Regulations**
Implemented in: `dairy.ts`, `meat.ts`, `compliance.ts`

- **Pasteurized Milk Ordinance (PMO)**: Milk quality standards and grading
  - Grade A, B, C milk classification based on SCC, SPC, and composition
  - Temperature requirements during transport and storage
- **Meat Grading**: Quality grades (Prime, Choice, Select) and yield grades (1-5)
- **Slaughter Inspection**: Condemnation tracking and reasons
- **Organic Certification**: Certification tracking in compliance module
- **Antibiotic Residue Testing**: Required testing documented in milk batches

### Animal Health & Disease Control

#### **Animal Disease Traceability (ADT)**
Implemented in: [`traceability.ts`](./traceability.ts), [`livestock.ts`](./livestock.ts)

- **Premises Identification Number (PIN)**: Unique identifier for farm locations
- **Individual Animal Identification**:
  - Official ID numbers (NUES 15-digit, AIN 9-digit)
  - RFID electronic tags with microchip tracking
  - Visual tag IDs (ear tags, tattoos, brands)
- **Movement Records**: Tracking of animals between premises
  - Origin and destination premises IDs
  - Interstate Certificates of Veterinary Inspection (ICVI)
  - Transport conditions and durations
- **Species Coverage**: Cattle, bison, swine, sheep, goats, poultry, equine
- **Regulatory References**: USDA 9 CFR Part 86, state-specific regulations

#### **Notifiable Disease Reporting**
Implemented in: [`compliance.ts`](./compliance.ts)

- **Disease Classification**: Immediate report vs. routine report
- **OIE/WOAH Listed Diseases**: Foot-and-mouth disease, BSE, avian influenza, etc.
- **Reporting Timeline**: Date detected, date reported to authorities
- **Affected Animals**: Count and identification
- **Control Measures**: Quarantine, testing, culling documented
- **Resolution Tracking**: Test results, clearance dates, official sign-off

#### **Antimicrobial Stewardship**
Implemented in: [`compliance.ts`](./compliance.ts), [`health.ts`](./health.ts), [`livestock.ts`](./livestock.ts)

- **Usage Tracking**: Product name, quantity, route of administration
- **Veterinary Prescription**: Prescribing veterinarian ID, prescription number
- **Withdrawal Periods**: Days before meat/milk safe for consumption
  - Meat withdrawal tracking in livestock health records
  - Milk withdrawal periods in treatment records
  - Validation: Cannot sell milk/meat during withdrawal period
- **Justification**: Medical justification and diagnosis documentation
- **Resistance Monitoring**: Supports tracking per WHO/OIE guidelines
- **Regulatory References**: FDA Veterinary Feed Directive (VFD), WHO Global Action Plan

### Dairy Industry Standards

#### **Dairy Herd Improvement (DHI) Programs**
Implemented in: [`livestock.ts`](./livestock.ts#L212-L256) - `livestockMilkings` table

- **Milk Production Testing**: Individual cow milk recording
- **Quality Parameters**:
  - **SCC (Somatic Cell Count)**: Mastitis indicator, Grade A requires <400,000/mL
  - **SPC (Standard Plate Count)**: Bacterial count, <100,000/mL for Grade A
  - **Butterfat %**: Component pricing factor (typical 3.5-4.5%)
  - **Protein %**: Component pricing factor (typical 3.0-3.5%)
  - **Lactose %**: Milk sugar content
  - **MUN (Milk Urea Nitrogen)**: Nutrition balance indicator
  - **Solids-Not-Fat (SNF)**: Total solids excluding fat
- **Test Day Records**: Supervised vs. owner-sampler testing
- **Production Metrics**: Days in milk (DIM), lactation number tracking
- **Regulatory References**: National Cooperative DHI Program, NCDHIP Guidelines

#### **Milk Quality Standards**
Implemented in: [`dairy.ts`](./dairy.ts#L105-L237) - `milkBatches` table

- **Physical Testing**:
  - pH level validation (6.4-6.8 normal range)
  - Freezing point test (adulteration detection)
  - Temperature at reception (0-10°C requirement)
- **Microbiological Testing**:
  - Coliform count (sanitation indicator)
  - Antibiotic residue testing (Beta-lactam, tetracycline, sulfonamides)
- **Compositional Analysis**:
  - Total solids determination
  - Fat and protein quantification
- **Grading System**: Grade A (premium), Grade B (standard), Grade C (manufacturing use)
- **Quality Scoring**: 0-100 point system for premium pricing

### Cheese Production Compliance

#### **Artisan Cheese Regulations**
Implemented in: [`dairy.ts`](./dairy.ts#L438-L750) - Cheese production tables

- **Raw Milk Cheese**: 60-day aging requirement for unpasteurized milk cheese
- **Composition Standards**:
  - Moisture content classification (hard <30%, semi-hard 30-40%, soft >50%)
  - Salt content tracking for preservation and labeling
  - Fat in dry matter (FDM%) for cheese type classification
- **pH Monitoring**: Critical for safety and quality
  - Target pH at set (curd formation)
  - Actual pH at molding
  - Final pH for cheese classification
- **Aging Conditions**: Temperature and humidity monitoring
  - Hard cheese: 10-15°C, 70-85% humidity
  - Soft cheese: 8-12°C, 90-95% humidity
- **Individual Piece Traceability**: Wheel/block numbering for recalls
- **Regulatory References**: FDA 21 CFR Part 133, PMO Grade A standards

### Environmental & Sustainability

#### **Organic Certification**
Implemented in: [`compliance.ts`](./compliance.ts)

- **Certification Tracking**: USDA Organic, EU Organic, other certifications
- **Audit Records**: Inspection dates, certifying body, results
- **Scope**: Crops, livestock, processing facilities
- **Compliance Evidence**: Certification numbers, expiration dates

#### **Animal Welfare Certifications**
Implemented in: [`compliance.ts`](./compliance.ts)

- **Certification Programs**: Global Animal Partnership, Certified Humane, Animal Welfare Approved
- **Audit Trails**: Annual inspection records
- **Standards Compliance**: Space requirements, handling practices, healthcare

### Record Keeping Requirements

All modules implement comprehensive record keeping to meet regulatory requirements:

#### **Retention Periods**
- **Animal Movement Records**: Minimum 5 years (USDA ADT)
- **Treatment Records**: 3 years after animal disposal
- **Feed Records**: 1 year minimum, 2 years recommended
- **Slaughter Records**: 1 year minimum
- **Milk Quality Testing**: 3 years for DHI programs

#### **Audit Trail Components**
- **User Attribution**: All records track who created/modified (userId fields)
- **Timestamps**: Created and updated timestamps on all tables
- **Soft Deletes**: Logical deletion with deletedAt for audit preservation
- **Immutable Records**: High-volume transactional tables (milkings, weights) use serial IDs
- **Metadata**: JSON metadata fields for extensibility without schema changes

#### **Data Integrity**
- **Check Constraints**: Validation rules for regulatory thresholds
  - Temperature ranges (milk: 0-10°C, pasteurization: 63-135°C)
  - pH ranges (milk: 6.4-6.8, cheese varies by type)
  - Quality scores (0-100)
  - Realistic biological ranges (BCS: 1-5, yield %: 5-20%)
- **Foreign Key Constraints**: Enforce referential integrity for traceability
- **Unique Constraints**: Prevent duplicate records (batch codes, official IDs)

### Compliance Gaps & Future Enhancements

The following areas may require additional implementation based on jurisdiction:

- **Environmental Permits**: Manure management, water usage (state-specific)
- **Worker Safety**: OSHA compliance, injury reporting (labor.ts could be enhanced)
- **Tax Compliance**: Inventory valuation, depreciation schedules
- **Import/Export**: International health certificates, phytosanitary requirements
- **Water Quality**: Discharge permits, testing requirements
- **Zoning Compliance**: Agricultural use permits, setback requirements

### Regulatory Reference Summary

| Agency/Standard | Module(s) | Key Requirements |
|-----------------|-----------|------------------|
| **FDA 21 CFR 1240** | dairy.ts | Pasteurization standards, HACCP |
| **FDA FSMA** | dairy.ts, meat.ts, traceability.ts | Product traceability, recall procedures |
| **USDA 9 CFR 86** | traceability.ts | Animal disease traceability (ADT) |
| **USDA PMO** | dairy.ts | Pasteurized Milk Ordinance, quality standards |
| **USDA Organic (7 CFR 205)** | compliance.ts | Organic certification requirements |
| **NCDHIP** | livestock.ts | DHI milk testing standards |
| **OIE/WOAH** | compliance.ts | Notifiable disease reporting |
| **FDA VFD** | compliance.ts, health.ts | Veterinary Feed Directive, antibiotic use |
| **WHO GAP-AMR** | compliance.ts | Antimicrobial resistance monitoring |

### Indonesian Regulatory Compliance

This schema implements comprehensive regulatory compliance for Indonesian livestock and food production operations.

#### **Kementan (Ministry of Agriculture)**
Implemented in: [`indonesian-compliance.ts`](./indonesian-compliance.ts)

- **NKV (Nomor Kontrol Veteriner)**: Veterinary control numbers for animal health certification
  - Issued by: Dinas Peternakan (District/Provincial Livestock Services)
  - Purpose: Certify animal health status for movement or slaughter
  - Valid: Typically 7 days for movement, 24 hours for slaughter

- **SKKH (Surat Keterangan Kesehatan Hewan)**: Animal health certificates
  - Required for: Inter-district, inter-province, and export movements
  - Issued by: Official veterinarian with government authorization
  - Includes: Health inspection, vaccination records, disease-free certification

- **Movement Permits**: District and province-level permits for livestock transport
  - Intra-district: District livestock office
  - Inter-province: Provincial livestock office + destination approval

- **Regular Inspections**: Routine veterinary health inspections
  - Frequency: Quarterly or as required by local regulations
  - Documentation: Health status, disease surveillance, treatment records

#### **BPOM (Badan Pengawas Obat dan Makanan)**
Implemented in: [`indonesian-compliance.ts`](./indonesian-compliance.ts), [`meat.ts`](./meat.ts), [`dairy.ts`](./dairy.ts)

- **MD/ML Registration Numbers**:
  - **MD (Makanan Dalam Negeri)**: Domestic food products
  - **ML (Makanan Luar Negeri)**: Imported food products
  - Valid: 5 years, renewable
  - Required for: All processed dairy and meat products for commercial sale

- **Product Batch Tracking**: Batch-level traceability for quality control and recalls
  - Linked to: Cheese batches, meat processing batches, dairy products
  - Purpose: Rapid product recall capability

- **Label Approvals**: Compliance with food labeling regulations
  - Nutritional information (per 100g serving)
  - Ingredients list (descending order by weight)
  - Allergen warnings (milk, eggs, etc.)
  - Halal logo (if certified)
  - Expiry date and storage instructions

#### **SNI (Standar Nasional Indonesia)**
Implemented in: [`indonesian-compliance.ts`](./indonesian-compliance.ts)

- **Product Certifications**: Quality standards for food products
  - SNI 01-3141: Pasteurized milk
  - SNI 2897: Cheese
  - SNI 01-3950: Processed meat products
  - SNI 01-3930: Animal feed

- **Facility Certifications**: Processing facility compliance
  - Good Manufacturing Practices (GMP)
  - Hazard Analysis Critical Control Points (HACCP)
  - Facility hygiene and sanitation standards

- **Compliance Testing**: Laboratory testing against SNI standards
  - Microbiological testing
  - Compositional analysis
  - Physical/chemical properties
  - Third-party laboratory accreditation required

#### **MUI (Majelis Ulama Indonesia) - Halal Certification**
Implemented in: [`indonesian-compliance.ts`](./indonesian-compliance.ts), [`meat.ts`](./meat.ts#L258-L267)

- **Halal Certificates**: Multi-level certification system
  - **Facility certification**: Slaughterhouse, processing plant
  - **Product certification**: Individual products with halal ingredients
  - **Slaughterer certification**: Muslim slaughterers with Islamic training
  - Valid: 2 years for facilities, 2 years for products

- **Slaughter Procedures** (tracked in `carcasses` table):
  - **Slaughterer**: Must be Muslim with valid MUI certification
  - **Prayer recitation**: "Bismillahi Allahu Akbar" before each animal
  - **Animal orientation**: Facing Qibla (Mecca direction)
  - **Cutting method**: Swift cut severing jugular, carotid, windpipe, esophagus
  - **Bleeding**: Complete drainage of blood (haram to consume)
  - **Supervision**: MUI-certified supervisor or witness present
  - **Documentation**: Photo/video evidence, witness signatures

- **Supply Chain Integrity**: Halal separation throughout processing
  - **Physical separation**: Dedicated equipment or thorough cleaning between halal/non-halal
  - **Storage separation**: Separate cold rooms or clearly marked segregation
  - **Transport separation**: Dedicated vehicles or containers
  - **Cross-contamination prevention**: Regular audits and verification
  - **Personnel training**: All staff trained in halal requirements

#### Regulatory Reference Summary

| Agency/Standard | Module(s) | Key Requirements |
|-----------------|-----------|------------------|
| **Kementan** | indonesian-compliance.ts, traceability.ts | NKV, SKKH, movement permits, inspections |
| **BPOM** | indonesian-compliance.ts, meat.ts, dairy.ts | MD/ML registration, batch tracking, labeling |
| **SNI** | indonesian-compliance.ts | Product standards, facility certification, testing |
| **MUI/Halal** | indonesian-compliance.ts, meat.ts | Halal certification, slaughter procedures, supply chain |

#### Integration with Core Schema

Indonesian compliance integrates seamlessly with existing tables:
- **`livestock.ts`**: NKV and SKKH link to individual animals via junction table
- **`traceability.ts`**: Movement records reference SKKH certificates
- **`meat.ts`**: Carcasses track halal slaughter procedures and BPOM batch numbers
- **`dairy.ts`**: Product batches link to BPOM registrations
- **`premises.ts`**: Facilities link to halal and SNI certifications

### Implementation Notes

- **Jurisdiction Variability**: Regulations vary by country, state/province. Schema provides foundation but may need customization.
- **Validation Logic**: Database constraints provide basic validation. Application layer should implement complete business rule validation.
- **Reporting**: Schema supports data collection; reporting/submission formats must be implemented in application layer.
- **Integration**: Schema designed to integrate with government reporting systems (e.g., ADT reporting portals).

## Industry Terms Glossary

### Identification & Traceability

| Term | Full Name | Description |
|------|-----------|-------------|
| **PIN** | Premises Identification Number | Unique identifier for farm/facility locations, required for animal traceability |
| **NUES** | National Uniform Eartagging System | 15-digit cattle identification system used in some countries |
| **AIN** | Animal Identification Number | 9-digit unique animal identifier |
| **RFID** | Radio-Frequency Identification | Electronic tag technology for automatic animal identification |
| **ICVI** | Interstate Certificate of Veterinary Inspection | Health certificate required for moving animals across state/country borders |

### Dairy & Milk Quality

| Term | Full Name | Description |
|------|-----------|-------------|
| **DHI** | Dairy Herd Improvement | National program for milk production testing and record keeping |
| **SCC** | Somatic Cell Count | Cells per mL of milk; indicator of udder health and mastitis |
| **MUN** | Milk Urea Nitrogen | Indicator of protein/energy balance in cow's diet (mg/dL) |
| **SNF** | Solids-Not-Fat | Milk components excluding fat (protein, lactose, minerals) |
| **Butterfat %** | - | Fat content in milk, typically 3.5-4.5% for dairy cows |
| **Protein %** | - | Protein content in milk, typically 3.0-3.5% |

### Breeding & Genetics

| Term | Full Name | Description |
|------|-----------|-------------|
| **EPD** | Expected Progeny Difference | Predicted genetic merit for specific traits |
| **AI** | Artificial Insemination | Breeding method using collected semen |
| **Parity** | - | Number of times an animal has given birth (lactation number) |
| **BCS** | Body Condition Score | Visual assessment of body fat reserves (1-5 scale) |
| **Inbreeding Coefficient** | - | Measure of genetic relatedness between parents |

### Health & Compliance

| Term | Full Name | Description |
|------|-----------|-------------|
| **OIE/WOAH** | World Organisation for Animal Health | International body setting animal health standards |
| **Withdrawal Period** | - | Time after medication before meat/milk is safe for consumption |
| **Notifiable Disease** | - | Disease that must be reported to government authorities |
| **Quarantine** | - | Isolation period to prevent disease spread |

### Slaughter & Carcass

| Term | Full Name | Description |
|------|-----------|-------------|
| **Dress %** | Dressing Percentage | Carcass weight as percentage of live weight (typically 50-65%) |
| **Quality Grade** | - | USDA meat quality rating (Prime, Choice, Select, etc.) |
| **Yield Grade** | - | USDA rating for lean meat yield (1-5 scale, 1 is best) |
| **Condemnation** | - | Rejection of meat/organs unfit for consumption |

### Meat Processing

| Term | Full Name | Description |
|------|-----------|-------------|
| **Primal Cut** | - | Large sections of the carcass (chuck, rib, loin, round, brisket, etc.) |
| **Subprimal** | - | Smaller cuts from primals (ribeye from rib primal, tenderloin from loin) |
| **Retail Cut** | - | Consumer-ready portions (steaks, roasts, ground beef) |
| **HCW** | Hot Carcass Weight | Weight immediately after slaughter, before cooling (kg) |
| **CCW** | Cold Carcass Weight | Weight after 24-48 hours of chilling (typically 2-3% less than HCW) |
| **Marbling** | - | Intramuscular fat distribution, affects tenderness and flavor |
| **REA** | Ribeye Area | Cross-sectional area of ribeye muscle (sq cm or sq in) |
| **Backfat** | - | External fat thickness over the ribeye, measured in mm |
| **Aging** | - | Controlled storage to improve tenderness (dry aging or wet aging) |
| **Batch Code** | - | Unique identifier for traceability of meat from slaughter to sale |

### Labor & Operations

| Term | Full Name | Description |
|------|-----------|-------------|
| **AI Technician** | Artificial Insemination Technician | Certified professional for breeding services |
| **CDL** | Commercial Driver's License | Required for operating large farm vehicles |
| **PM** | Preventive Maintenance | Scheduled maintenance to prevent breakdowns |
| **CM** | Corrective Maintenance | Repairs performed after equipment failure |
| **Operating Hours** | - | Total hours equipment has been in operation |
| **Depreciation** | - | Reduction in asset value over time |
| **Work Log** | - | Record of hours worked and activities performed |
