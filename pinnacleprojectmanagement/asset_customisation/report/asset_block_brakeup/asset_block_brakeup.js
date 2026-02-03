// Copyright (c) 2026, OTPL
// License: see license.txt

frappe.query_reports["Asset Block Brakeup"] = {
  filters: [
    {
      fieldname: "company",
      label: "Company",
      fieldtype: "Link",
      options: "Company",
      default: frappe.defaults.get_user_default("Company"),
      reqd: 1,
      read_only: 1,
    },
    {
      fieldname: "asset_block",
      label: "Asset Block",
      fieldtype: "Link",
      options: "Asset Block",
      reqd: 0,
    },
    {
      fieldname: "fiscal_year",
      label: "Fiscal Year",
      fieldtype: "Link",
      options: "Fiscal Year",
      reqd: 0,
      read_only: 1,
    },
  ],
};
