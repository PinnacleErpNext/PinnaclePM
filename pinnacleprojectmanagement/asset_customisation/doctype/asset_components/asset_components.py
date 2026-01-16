# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import json

class AssetComponents(Document):
	pass


@frappe.whitelist()
def create_components_from_dialog(asset, components):
    created_components = []
    components = json.loads(components)

    for row in components:
        row = frappe._dict(row)

        comp = frappe.new_doc("Asset Components")
        comp.asset = asset  # Auto-link to parent Asset
        comp.component = row.get("component")
        comp.serial_no = row.get("serial_no")
        comp.brand_name = row.get("brand_name")
        comp.vendor = row.get("vendor")
        comp.date_of_addition = row.get("date_of_addition")
        comp.warrent_start = row.get("warrent_start")
        comp.warrent_end = row.get("warrent_end")
        comp.specification = row.get("specification")

        comp.insert(ignore_permissions=True)
        comp.save(ignore_permissions=True)
        created_components.append(comp.name)

    return created_components


def on_submit(doc, method):
    """Update Asset custodian after Asset Movement submission"""

    for row in doc.assets:  # loop through child table
        asset_name = row.asset
        from_emp = row.from_employee
        to_emp = row.to_employee

        if not asset_name or not to_emp:
            continue

        # Get employee names for logging
        old_name = frappe.db.get_value("Employee", from_emp, "employee_name") or from_emp
        new_name = frappe.db.get_value("Employee", to_emp, "employee_name") or to_emp

        # Update custodian directly in submitted Asset
        frappe.db.set_value("Asset", asset_name, "custodian", to_emp)
        frappe.db.set_value("Asset", asset_name, "custom_custodian_name", new_name)

        # Optional: add comment for tracking
        frappe.get_doc("Asset", asset_name).add_comment(
            "Info", f"Custodian changed from {old_name} to {new_name} via Asset Movement {doc.name}"
        )

        # Debug log
        frappe.log_error(f"Updated Asset {asset_name} custodian to {new_name}", "DEBUG ASSET UPDATE")

