# Reporting System Architecture Diagram

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web App]
        MOBILE[Mobile App]
    end

    subgraph "UI Components"
        DV[Data View]
        RE[Report Export UI]
        SC[Scheduler UI]
    end

    subgraph "@workspace/reports Package"
        subgraph "Core Exporters"
            CSV[CSV Exporter]
            XLSX[Excel Exporter]
            PDF[PDF Exporter]
        end

        subgraph "Template Engine"
            TE[Template Engine]
            TM[Template Manager]
        end

        subgraph "Scheduler"
            SCH[Scheduler]
            QUEUE[Job Queue]
        end

        subgraph "Delivery"
            EMAIL[Email Delivery]
            STORAGE[Storage Delivery]
        end

        subgraph "Server-Side"
            SSE[Server Export Handler]
            STREAM[Stream Handler]
        end
    end

    subgraph "API Layer"
        API[API Routes]
        WS[WebSocket]
    end

    subgraph "External Services"
        SMTP[SMTP Server]
        S3[S3 Storage]
        DB[Database]
    end

    WEB --> DV
    WEB --> RE
    WEB --> SC
    MOBILE --> RE

    DV --> CSV
    DV --> XLSX
    DV --> PDF

    RE --> TE
    RE --> TM
    RE --> CSV
    RE --> XLSX
    RE --> PDF

    SC --> SCH
    SC --> QUEUE

    SCH --> QUEUE
    QUEUE --> TE
    QUEUE --> EMAIL
    QUEUE --> STORAGE

    EMAIL --> SMTP
    STORAGE --> S3

    API --> SSE
    API --> STREAM
    SSE --> CSV
    SSE --> XLSX
    SSE --> PDF
    STREAM --> XLSX
    STREAM --> CSV

    SCH --> DB
    QUEUE --> DB
    TE --> DB

    WS --> SSE
```

## Data Flow: Simple Export

```mermaid
sequenceDiagram
    participant User
    participant DataView
    participant Exporter
    participant Browser

    User->>DataView: Click Export
    DataView->>Exporter: exportToExcel(data, options)
    Exporter->>Exporter: Process data
    Exporter->>Exporter: Generate workbook
    Exporter->>Browser: Return buffer
    Browser->>User: Download file
```

## Data Flow: Template-Based Report

```mermaid
sequenceDiagram
    participant User
    participant ReportUI
    participant TemplateEngine
    participant Exporter
    participant Delivery

    User->>ReportUI: Select template & params
    ReportUI->>TemplateEngine: generateReport(template, data)
    TemplateEngine->>TemplateEngine: Parse template
    TemplateEngine->>TemplateEngine: Inject data
    TemplateEngine->>Exporter: exportToPDF(rendered)
    Exporter->>Exporter: Generate PDF
    Exporter->>Delivery: sendReport(recipients)
    Delivery->>User: Email with attachment
```

## Data Flow: Scheduled Report

```mermaid
sequenceDiagram
    participant Scheduler
    participant Queue
    participant TemplateEngine
    participant Exporter
    participant Delivery
    participant Database

    Note over Scheduler: Cron trigger
    Scheduler->>Queue: Add job
    Queue->>TemplateEngine: Process job
    TemplateEngine->>TemplateEngine: Load template
    TemplateEngine->>TemplateEngine: Fetch data
    TemplateEngine->>Exporter: Generate report
    Exporter->>Exporter: Create file
    Exporter->>Delivery: Send to recipients
    Delivery->>Delivery: Email delivery
    Queue->>Database: Update status
    Queue->>Database: Log history
```

## Data Flow: Server-Side Export (Large Dataset)

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant StreamHandler
    participant Exporter
    participant Database

    Client->>API: Request export
    API->>StreamHandler: Initialize stream
    StreamHandler->>Database: Query data (stream)
    loop For each chunk
        Database->>StreamHandler: Send chunk
        StreamHandler->>Exporter: Process chunk
        Exporter->>StreamHandler: Return processed chunk
        StreamHandler->>Client: Stream response
    end
    StreamHandler->>API: Complete
    API->>Client: Finalize
```

## Package Dependencies

```mermaid
graph LR
    subgraph "Workspace Packages"
        UI[@workspace/ui]
        REPORTS[@workspace/reports]
        AUTH[@workspace/authorization]
        STORAGE[@workspace/storage]
    end

    subgraph "External Libraries"
        XLSX[xlsx]
        JSPDF[jspdf]
        HB[handlebars]
        BULL[bull]
        NODemailer[nodemailer]
    end

    UI --> REPORTS
    REPORTS --> XLSX
    REPORTS --> JSPDF
    REPORTS --> HB
    REPORTS --> BULL
    REPORTS --> NODemailer
    REPORTS --> STORAGE
    REPORTS --> AUTH
```

## Component Relationships

```mermaid
graph TB
    subgraph "Export Formats"
        CSV[CSV]
        EXCEL[Excel]
        PDF[PDF]
    end

    subgraph "Export Features"
        HEADERS[Headers]
        FOOTERS[Footers]
        STYLING[Styling]
        CHARTS[Charts]
        IMAGES[Images]
    end

    subgraph "Delivery Methods"
        DOWNLOAD[Direct Download]
        EMAIL[Email]
        STORAGE[Cloud Storage]
        WEBHOOK[Webhook]
    end

    subgraph "Scheduling"
        ONCE[One-time]
        RECURRING[Recurring]
        EVENT[Event-based]
    end

    CSV --> HEADERS
    CSV --> DOWNLOAD
    CSV --> EMAIL
    CSV --> STORAGE

    EXCEL --> HEADERS
    EXCEL --> FOOTERS
    EXCEL --> STYLING
    EXCEL --> CHARTS
    EXCEL --> IMAGES
    EXCEL --> DOWNLOAD
    EXCEL --> EMAIL
    EXCEL --> STORAGE

    PDF --> HEADERS
    PDF --> FOOTERS
    PDF --> STYLING
    PDF --> IMAGES
    PDF --> DOWNLOAD
    PDF --> EMAIL
    PDF --> STORAGE
    PDF --> WEBHOOK

    ONCE --> CSV
    ONCE --> EXCEL
    ONCE --> PDF

    RECURRING --> CSV
    RECURRING --> EXCEL
    RECURRING --> PDF
    RECURRING --> EMAIL

    EVENT --> CSV
    EVENT --> EXCEL
    EVENT --> PDF
    EVENT --> WEBHOOK
```

## Implementation Phases

```mermaid
gantt
    title Reporting System Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Create package structure           :done, p1-1, 2024-01-01, 1d
    Implement CSV exporter             :active, p1-2, 2024-01-02, 2d
    Implement Excel exporter           :p1-3, after p1-2, 3d
    Implement PDF exporter             :p1-4, after p1-3, 3d
    Update data-view integration       :p1-5, after p1-4, 2d
    section Phase 2
    Build template engine              :p2-1, after p1-5, 4d
    Create default templates           :p2-2, after p2-1, 3d
    Add template management UI          :p2-3, after p2-2, 3d
    section Phase 3
    Implement scheduler                :p3-1, after p2-3, 4d
    Add email delivery                 :p3-2, after p3-1, 3d
    Create scheduled reports UI        :p3-3, after p3-2, 3d
    section Phase 4
    Build streaming exporters          :p4-1, after p3-3, 4d
    Add API endpoints                  :p4-2, after p4-1, 2d
    Implement progress tracking        :p4-3, after p4-2, 3d
    section Documentation
    Write usage examples               :doc-1, after p4-3, 2d
    Create API documentation           :doc-2, after doc-1, 2d
```
