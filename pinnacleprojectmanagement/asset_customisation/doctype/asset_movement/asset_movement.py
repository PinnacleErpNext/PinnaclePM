import frappe

@frappe.whitelist()
def validate_asset_movement(doc):
    doc = frappe.parse_json(doc)

    for row in doc.get("assets", []):
        asset = row.get("asset")
        to_employee = row.get("to_employee")

        if not asset or not to_employee:
            continue

        # Get asset category of the asset being moved
        asset_info = frappe.db.get_value(
            "Asset",
            asset,
            ["asset_category"],
            as_dict=True
        )

        if not asset_info:
            continue

        asset_category = asset_info.get("asset_category")

        # Check if employee already has a submitted asset
        # of the same category (excluding current asset)
        existing = frappe.db.exists(
            "Asset",
            {
                "asset_category": asset_category,
                "custodian": to_employee,
                "docstatus": 1,
                "name": ["!=", asset],  # exclude same asset
            },
        )

        if existing:
            return True  # Trigger confirmation

    return False