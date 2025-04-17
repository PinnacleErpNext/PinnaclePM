# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe import msgprint, _


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {
            "label": _("Project Name"),
            "fieldname": "project_name",
            "fieldtype": "Data",
            "width": 400,
        },
        {
            "label": _("Category"),
            "fieldname": "category",
            "fieldtype": "Data",
            "width": 400,
        },
        {
            "label": _("Total Task"),
            "fieldname": "task_count",
            "fieldtype": "Int",
            "width": 215,
        },
        {
            "label": _("Add Task"),
            "fieldname": "add_task",
            "fieldtype": "Data",
            "width": 100,
        },
        {"label": _("Edit"), "fieldname": "edit", "fieldtype": "Data", "width": 100},
    ]


def get_data(filters):
    conditions = []
    values = {}

    # Fetch allowed projects for the current user
    user_projects = frappe.get_all(
        "User Permission",
        filters={"allow": "Project", "user": frappe.session.user},
        pluck="for_value",
    )
    print(len(user_projects))
    # Ensure there are valid projects for the user
    if user_projects:
        conditions.append("p.name IN %(user_projects)s")
        values["user_projects"] = tuple(user_projects)  # Use tuple for SQL IN clause

    # Apply additional filter if "project" is provided
    if filters and filters.get("project"):
        conditions.append("p.name = %(project)s")
        values["project"] = filters.get("project")

    if filters and filters.get("category"):
        conditions.append("p.custom_project_category = %(category)s")
        values["category"] = filters.get("category")

    # Construct condition string
    condition_str = " WHERE " + " AND ".join(conditions) if conditions else ""

    # SQL Query
    query = f"""
        SELECT
            p.name AS project_name,
            p.custom_project_category AS category,
            COUNT(t.name) AS task_count,
            CONCAT('<a href="#Form/Project/', p.name, '">Edit</a>') AS edit
        FROM
            `tabProject` p
        LEFT JOIN
            `tabTask` t ON t.project = p.name
        {condition_str}
        GROUP BY
            p.name
    """
    current_user = frappe.session.user
    roles = frappe.get_roles(current_user)
    if "Projects User" in roles and not any(
        role in roles for role in ["Administrator", "System Manager"]
    ):
        msgprint(_("You do not have access to this."))
    elif "Projects Manager" in roles and not any(
        role in roles for role in ["Administrator", "System Manager"]
    ):
        if len(user_projects) > 0:
            return frappe.db.sql(query, values, as_dict=True)
        else:
            msgprint(
                _(
                    "You have not been assigned any projects. Please contact the administrator."
                )
            )
    else:
        return frappe.db.sql(query, values, as_dict=True)
