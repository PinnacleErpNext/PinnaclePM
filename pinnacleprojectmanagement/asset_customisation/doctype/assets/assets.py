import frappe


@frappe.whitelist()
def validate_asset_allotment(doc):
    doc = frappe.parse_json(doc)

    exist = frappe.db.exists(
        "Asset",
        {
            "asset_category": doc.get("asset_category"),
            "custodian": doc.get("custodian"),
            "docstatus": 1,
        },
    )

    return bool(exist)
