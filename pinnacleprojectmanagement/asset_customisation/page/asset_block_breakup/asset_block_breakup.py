import frappe
from frappe.query_builder import DocType


@frappe.whitelist()
def get_block_wise_data(company, fiscal_year):
    if not company or not fiscal_year:
        frappe.throw("Company and Fiscal Year are mandatory")

    fy = frappe.get_doc("Fiscal Year", fiscal_year)
    fy_start = fy.year_start_date
    fy_end = fy.year_end_date

    # ---------------------------------------------------------------------
    # SOLD ASSETS (YOUR METHOD – BLOCK INDEPENDENT)
    # ---------------------------------------------------------------------
    Asset = DocType("Asset")
    SalesInvoiceItem = DocType("Sales Invoice Item")
    SalesInvoice = DocType("Sales Invoice")

    sold_rows = (
        frappe.qb.from_(Asset)
        .join(SalesInvoiceItem)
        .on(Asset.name == SalesInvoiceItem.asset)
        .join(SalesInvoice)
        .on(SalesInvoiceItem.parent == SalesInvoice.name)
        .select(
            Asset.name.as_("asset"),
            SalesInvoiceItem.net_amount.as_("sale_amount"),
        )
        .where(
            (SalesInvoice.company == company)
            & (SalesInvoice.docstatus == 1)
            & SalesInvoice.posting_date.between(
                fy.year_start_date,
                fy.year_end_date,
            )
        )
    ).run(as_dict=True)

    sold_assets = {r.asset: r.sale_amount for r in sold_rows}

    # ---------------------------------------------------------------------
    # MAIN ASSET FETCH (UNCHANGED LOGIC)
    # ---------------------------------------------------------------------
    rows = frappe.db.sql(
        """
        SELECT
            aba.asset_block,
            a.name AS asset,
            a.asset_name,
            a.available_for_use_date,
            a.gross_purchase_amount AS asset_value
        FROM `tabAsset` a
        INNER JOIN `tabAsset Block Assignment` aba
            ON aba.parent = a.name
        WHERE
            a.company = %s
            AND a.docstatus = 1
            AND (
                a.available_for_use_date < %s
                OR a.available_for_use_date BETWEEN %s AND %s
                OR a.name IN %s
            )
        ORDER BY
            aba.asset_block,
            a.available_for_use_date,
            a.name
        """,
        (
            company,
            fy_start,
            fy_start,
            fy_end,
            tuple(sold_assets.keys()) or ("",),
        ),
        as_dict=True,
    )

    # ---------------------------------------------------------------------
    # APPLY BASIS + GROUP BY BLOCK
    # ---------------------------------------------------------------------
    data = {}

    for r in rows:
        if r.asset in sold_assets:
            basis = "Asset Sold"
            asset_value = sold_assets[r.asset]

        elif r.available_for_use_date < fy_start:
            basis = "Opening Asset"
            asset_value = r.asset_value

        else:
            basis = "Asset Added"
            asset_value = r.asset_value

        data.setdefault(r.asset_block, []).append({
            "asset": r.asset,
            "asset_name": r.asset_name,
            "available_for_use_date": r.available_for_use_date,
            "basis": basis,
            "asset_value": asset_value,
        })

    return data
