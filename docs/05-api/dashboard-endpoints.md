# API: Executive Dashboard Endpoints (`/api/dashboard`)

## 1. Get Dashboard Statistics

Computes aggregate KPI metrics scoped to the current tenant organization (or platform-wide if Super Admin).

- **URL**: `/api/dashboard/stats`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  {
    "total_leads": 42,
    "active_leads": 28,
    "converted_leads": 14,
    "total_customers": 18,
    "total_opportunities": 24,
    "open_pipeline_value": "345000.00",
    "closed_won_value": "184000.00",
    "total_products": 35
  }
  ```

### Computed Metrics Definition:
- **`active_leads`**: Leads with status `New`, `Contacted`, or `Qualified`.
- **`converted_leads`**: Leads with status `Converted`.
- **`open_pipeline_value`**: Sum of deal values in stages other than `Closed Won` or `Closed Lost`.
- **`closed_won_value`**: Sum of deal values in stage `Closed Won`.
- **`total_products`**: Count of products in the organization's catalog.
