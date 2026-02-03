# Copyright (c) 2025, OTPL
# License: see license.txt

import frappe
from frappe import _
from frappe.utils import flt, formatdate, add_days
from frappe.query_builder import DocType


# -------------------------------------------------------------------------
# EXECUTE
# -------------------------------------------------------------------------
def execute(filters=None):
    filters = frappe._dict(filters or {})

    if not filters.get("fiscal_year"):
        frappe.throw(_("Fiscal Year is mandatory"))

    fy = frappe.get_doc("Fiscal Year", filters.fiscal_year)
    filters.from_date = fy.year_start_date
    filters.to_date = fy.year_end_date
    filters.day_before_from_date = add_days(filters.from_date, -1)

    return get_columns(filters), get_data(filters)


# -------------------------------------------------------------------------
# COLUMNS
# -------------------------------------------------------------------------
def get_columns(filters):
    return [
        {
            "label": _("Asset Block"),
            "fieldname": "asset_block",
            "fieldtype": "Link",  # SAFE: shows backend value as-is
            "options": "Asset Block",
            "width": 200,
        },
        {
            "label": _("Depreciation Rate (%)"),
            "fieldname": "depreciation_rate",
            "fieldtype": "Percent",
            "width": 140,
        },
        {
            "label": _("Opening WDV as on ") + formatdate(filters.day_before_from_date),
            "fieldname": "opening_wdv",
            "fieldtype": "Currency",
            "width": 180,
        },
        {
            "label": _("Additions (01-04 to 30-09)"),
            "fieldname": "asset_added_h1",
            "fieldtype": "Currency",
            "width": 190,
        },
        {
            "label": _("Additions (01-10 to 31-03)"),
            "fieldname": "asset_added_h2",
            "fieldtype": "Currency",
            "width": 190,
        },
        {
            "label": _("Total (Opening + Additions)"),
            "fieldname": "total",
            "fieldtype": "Currency",
            "width": 220,
        },
        {
            "label": _("Sale consideration of assets sold"),
            "fieldname": "sold_assets",
            "fieldtype": "Currency",
            "width": 220,
        },
        {
            "label": _("Net Block Value"),
            "fieldname": "net_total",
            "fieldtype": "Currency",
            "width": 180,
        },
        {
            "label": _("Depreciation as per Income-tax Act"),
            "fieldname": "depreciation",
            "fieldtype": "Currency",
            "width": 240,
        },
        {
            "label": _("Closing WDV as on ") + formatdate(filters.to_date),
            "fieldname": "closing_wdv",
            "fieldtype": "Currency",
            "width": 180,
        },
    ]


# -------------------------------------------------------------------------
# DATA
# -------------------------------------------------------------------------
def get_data(filters):
    ABD = DocType("Asset Block Depreciation")
    BD = DocType("Block Depreciation")

    query = (
        frappe.qb.from_(ABD)
        .inner_join(BD)
        .on((BD.parent == ABD.name) & (BD.parenttype == "Asset Block Depreciation"))
        .select(
            BD.asset_block.as_("asset_block"),
            BD.rate_of_depreciation.as_("depreciation_rate"),
            BD.opening_wdv,
            BD.asset_added_h1,
            BD.asset_added_h2,
            BD.total,
            BD.sold_assets,
            BD.net_total,
            BD.depreciation,
            BD.closing_wdv,
        )
        .where(ABD.financial_year == filters.fiscal_year)
    )

    data = query.run(as_dict=True)

    numeric_fields = [
        "opening_wdv",
        "asset_added_h1",
        "asset_added_h2",
        "total",
        "sold_assets",
        "net_total",
        "depreciation",
        "closing_wdv",
    ]

    # Cast values safely
    for row in data:
        for field in numeric_fields + ["depreciation_rate"]:
            row[field] = flt(row.get(field))

    # ---------------------------------------------------------
    # 🔹 ADD TOTAL ROW (FINAL ROW)
    # ---------------------------------------------------------
    if data:
        total_row = {
            "asset_block": _("Total"),
            "depreciation_rate": None,  # no meaning for total
        }

        for field in numeric_fields:
            total_row[field] = sum(flt(d.get(field)) for d in data)

        data.append(total_row)

    return data

@frappe.whitelist()
def create_asset_block_dep(fiscal_year, company):
    """
    Create Asset Block Depreciation document.
    Calculations will run automatically via before_save().
    """

    # Prevent duplicates (extra safety; validate() also handles this)
    existing = frappe.db.exists(
        "Asset Block Depreciation",
        {
            "financial_year": fiscal_year,
            "company": company,
        }
    )

    if existing:
        frappe.throw(
            f"Asset Block Depreciation already exists for FY {fiscal_year} and Company {company}"
        )

    doc = frappe.get_doc({
        "doctype": "Asset Block Depreciation",
        "financial_year": fiscal_year,
        "company": company,
    })

    # This triggers:
    # - validate()
    # - before_save()
    # - calculate_block_depreciation()
    doc.insert(ignore_permissions=True)

    return doc.name
