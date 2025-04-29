# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {
            "label": _("Module Name"),
            "fieldname": "module_name",
            "fieldtype": "Data",
            "width": 400,
        },
        {
            "label": _("Project Name"),
            "fieldname": "project",
            "fieldtype": "Data",
            "width": 400,
        },
        {"label": _(""), "fieldname": "add_task", "fieldtype": "Data", "width": 400},
    ]


def get_data(filters):
    conditions = []
    values = {}

    # 1) Fetch projects the current user is permitted to see
    user_projects = frappe.get_all(
        "User Permission",
        filters={"allow": "Project", "user": frappe.session.user},
        pluck="for_value",
    )

    if user_projects:
        # filter on the 'project' column
        conditions.append("`project` IN %(user_projects)s")
        values["user_projects"] = tuple(user_projects)

    # 2) If user selected a specific project in the report filters
    if filters and filters.get("project"):
        conditions.append("`project` = %(project)s")
        values["project"] = filters["project"]

    # 3) If user selected a module in the report filters
    if filters and filters.get("module"):
        conditions.append("`module_name` = %(module)s")
        values["module"] = filters["module"]

    # Build the base query
    query = """
        SELECT
            module_name,
            project
        FROM
            `tabModules`
    """.strip()

    # Append WHERE clause if any conditions exist
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    # (Optional) print for debugging
    frappe.logger().debug(f"[Modules List] SQL: {query}  |  values: {values}")

    # Execute and return
    return frappe.db.sql(query, values, as_dict=True)
