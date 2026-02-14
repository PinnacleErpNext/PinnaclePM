import frappe


def create_roles(role_names):
    """
    Creates multiple roles if they do not exist.

    :param role_names: List of role names to create
    """
    for role_name in role_names:
        if not frappe.db.exists("Role", role_name):
            role = frappe.get_doc(
                {
                    "doctype": "Role",
                    "role_name": role_name,
                }
            )
            role.insert(ignore_permissions=True)
            frappe.logger().info(f"Role '{role_name}' created successfully!")
        else:
            frappe.logger().info(f"Role '{role_name}' already exists.")
    frappe.db.commit()


def update_multiple_field_options(field_updates):
    """
    Updates options for multiple fields in different Doctypes.

    :param field_updates: List of dictionaries with 'parent_doctype', 'fieldname', and 'new_options'
    """
    for update in field_updates:
        parent_doctype = update.get("parent_doctype")
        fieldname_to_update = update.get("fieldname")
        new_options = update.get("new_options")

        if not frappe.db.exists(
            "DocField", {"parent": parent_doctype, "fieldname": fieldname_to_update}
        ):
            frappe.logger().error(
                f"Field '{fieldname_to_update}' not found in '{parent_doctype}'."
            )
            continue

        options_string = "\n".join(new_options)
        frappe.db.set_value(
            "DocField",
            {"parent": parent_doctype, "fieldname": fieldname_to_update},
            "options",
            options_string,
        )
        frappe.logger().info(
            f"Options updated for field '{fieldname_to_update}' in parent '{parent_doctype}'."
        )
    frappe.db.commit()


@frappe.whitelist()
def after_migrate():
    """
    Runs after migration to create multiple roles and update multiple field options.
    """
    roles_to_create = ["Backlog Manager"]
    create_roles(roles_to_create)

    field_updates = [
        {
            "parent_doctype": "Task",
            "fieldname": "status",
            "new_options": [
                "Open",
                "Working",
                "Renewal Pending",
                "Pending Review",
                "Overdue",
                "Completed",
                "Cancelled",
                "Can't Reproduce",
                "Close",
            ],
        },
    ]
    update_multiple_field_options(field_updates)
