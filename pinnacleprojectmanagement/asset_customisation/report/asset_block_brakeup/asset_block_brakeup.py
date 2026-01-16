# Copyright (c) 2026, OTPL
# License: see license.txt

import frappe
from frappe.query_builder import DocType


def execute(filters=None):
    filters = frappe._dict(filters or {})

    if not filters.get("company") or not filters.get("fiscal_year"):
        frappe.throw("Company and Fiscal Year are mandatory")

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    return [
        {
            "label": "Asset Block",
            "fieldname": "asset_block",
            "fieldtype": "Link",
            "options": "Asset Block",
            "width": 200,
        },
        {
            "label": "Asset",
            "fieldname": "asset",
            "fieldtype": "Link",
            "options": "Asset",
            "width": 200,
        },
        {
            "label": "Asset Name",
            "fieldname": "asset_name",
            "fieldtype": "Data",
            "width": 220,
        },
        {
            "label": "Put to Use Date",
            "fieldname": "available_for_use_date",
            "fieldtype": "Date",
            "width": 130,
        },
        {
            "label": "Calculation Basis",
            "fieldname": "basis",
            "fieldtype": "Data",
            "width": 140,
        },
        {
            "label": "Asset Value",
            "fieldname": "asset_value",
            "fieldtype": "Currency",
            "width": 150,
        },
    ]


# -------------------------------------------------------------------------
# SOLD ASSETS (BLOCK INDEPENDENT, FY BASED)
# -------------------------------------------------------------------------
def get_sold_assets(company, fy_doc):
    Asset = DocType("Asset")
    SalesInvoiceItem = DocType("Sales Invoice Item")
    SalesInvoice = DocType("Sales Invoice")

    query = (
        frappe.qb.from_(Asset)
        .join(SalesInvoiceItem)
        .on(Asset.name == SalesInvoiceItem.asset)
        .join(SalesInvoice)
        .on(SalesInvoiceItem.parent == SalesInvoice.name)
        .select(
            Asset.name.as_("asset"),
            SalesInvoice.posting_date.as_("sale_date"),
            SalesInvoiceItem.net_amount.as_("sale_amount"),
        )
        .where(
            (SalesInvoice.company == company)
            & (SalesInvoice.docstatus == 1)
            & SalesInvoice.posting_date.between(
                fy_doc.year_start_date,
                fy_doc.year_end_date,
            )
        )
    )

    return query.run(as_dict=True)


# -------------------------------------------------------------------------
# MAIN DATA
# -------------------------------------------------------------------------
def get_data(filters):
    fy = frappe.get_doc("Fiscal Year", filters.fiscal_year)
    fy_start = fy.year_start_date
    fy_end = fy.year_end_date

    # ------------------------------
    # Fetch ALL sold assets for FY
    # ------------------------------
    sold_assets = {
        r.asset: r
        for r in get_sold_assets(filters.company, fy)
    }

    conditions = ["a.docstatus = 1", "a.company = %(company)s"]
    values = {"company": filters.company}

    condition_str = " AND ".join(conditions)

    query = f"""
        SELECT
            aba.asset_block AS asset_block,
            a.name AS asset,
            a.asset_name AS asset_name,
            a.available_for_use_date,
            a.gross_purchase_amount AS asset_value
        FROM `tabAsset` a
        INNER JOIN `tabAsset Block Assignment` aba
            ON aba.parent = a.name
        WHERE
            {condition_str}
            AND (
                a.available_for_use_date < %(fy_end)s
                OR a.available_for_use_date BETWEEN %(fy_start)s AND %(fy_end)s
                OR a.name IN %(sold_assets)s
            )
        ORDER BY
            aba.asset_block,
            a.available_for_use_date,
            a.name
    """

    values.update(
        {
            "fy_start": fy_start,
            "fy_end": fy_end,
            "sold_assets": tuple(sold_assets.keys()) or ("",),
        }
    )

    rows = frappe.db.sql(query, values, as_dict=True)

    # ------------------------------
    # Apply Calculation Basis
    # ------------------------------
    result = []

    for r in rows:
        if r.asset in sold_assets:
            r.basis = "Asset Sold"
            r.asset_value = sold_assets[r.asset].sale_amount

        elif r.available_for_use_date < fy_start:
            r.basis = "Opening Asset"

        elif fy_start <= r.available_for_use_date <= fy_end:
            r.basis = "Asset Added"

        else:
            continue

        result.append(r)

    return result
