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
            "label": _("Created At"),
            "fieldname": "creation",
            "fieldtype": "Date",
            "width": 110,
        },
        {
            "label": _("Created By"),
            "fieldname": "created_by",
            "fieldtype": "Link",
            "options": "User",
            "width": 200,
        },
        {
            "label": _("Task ID"),
            "fieldname": "task_id",
            "fieldtype": "Data",
            "width": 150,
        },        
        {
            "label": _("Module"),
            "fieldname": "module",
            "fieldtype": "Data",
            "options": "Modules",
            "width": 110,
        },
        {
            "label": _("Task"),
            "fieldname": "task",
            "fieldtype": "HTML",
            "width": 500,
        },
        {
            "label": _("Assigned"),
            "fieldname": "assigned",
            "fieldtype": "Link",
            "options": "User",
            "width": 200,
        },
        {
            "label": _("Allotted"),
            "fieldname": "allotted",
            "fieldtype": "Link",
            "options": "User",
            "width": 200,
        },
        {"label": _("Tags"), "fieldname": "tags", "fieldtype": "Data", "width": 100},
        {
            "label": _("Priority"),
            "fieldname": "priority",
            "fieldtype": "Select",
            "options": ["", "Low", "Medium", "High"],
            "width": 100,
        },
        {
            "label": _("Status"),
            "fieldname": "status",
            "fieldtype": "Select",
            "options": [
                "",
                "Backlog",
                "Open",
                "Working",
                "Pending Review",
                "Overdue",
                "Completed",
                "Cancelled",
                "Can't Reproduce",
            ],
            "width": 100,
        },
        {
            "label": _("Start Date"),
            "fieldname": "start_date",
            "fieldtype": "Date",
            "width": 100,
        },
        {
            "label": _("End Date"),
            "fieldname": "end_date",
            "fieldtype": "Date",
            "width": 100,
        },
        {
            "label": _("Task Progress"),
            "fieldname": "progress",
            "fieldtype": "Percent",
            "width": 100,
        }

    ]


def get_data(filters):
    conditions = []
    values = {}

    # Ensure filtering by Project
    if filters and filters.get("project"):
        conditions.append("project = %(project)s")
        values["project"] = filters["project"]

    # Filter by Modules
    module_value = filters.get("modules")
    if module_value:
        module_list = [m.strip() for m in module_value.split(",") if m.strip()]
        if module_list:
            conditions.append("custom_module IN %(modules)s")
            values["modules"] = tuple(module_list)

    # Filter by Task
    if filters and filters.get("task"):
        conditions.append("t.name = %(task)s")
        values["task"] = filters["task"]
    
    if filters and filters.get("is_overdue") is not None:
        conditions.append("t.custom_overdue = %(is_overdue)s")
        values["is_overdue"] = filters["is_overdue"]

    # Filter by Assigned & Allotted
    if filters and filters.get("assigned"):
        conditions.append("custom_assigned_to = %(assigned)s")
        values["assigned"] = filters["assigned"]

    if filters and filters.get("allotted"):
        conditions.append("custom_allotted_to = %(allotted)s")
        values["allotted"] = filters["allotted"]

    current_user = frappe.session.user
    roles = frappe.get_roles(current_user)
    # Restrict "Project Users" to only their assigned/allotted tasks
    if "Projects User" in roles and not any(
        role in roles for role in ["Administrator", "System Manager"]
    ):
        conditions.append(
            "(custom_assigned_to = %(current_user)s OR custom_allotted_to = %(current_user)s)"
        )
        values["current_user"] = current_user

    # Restrict "Project Managers" to only their project's tasks
    if "Projects Manager" in roles and not any(
        role in roles for role in ["Administrator", "System Manager"]
    ):

        projectListData = frappe.db.get_list(
            "User Permission",
            filters={"user": current_user},
            fields=["for_value"],
            as_list=True,
        )

        projectList = [data[0] for data in projectListData]

        if projectList:

            conditions.append("t.project in %(projectList)s")
            values["projectList"] = projectList
        else:

            conditions.append("1=0")

        values["current_user"] = current_user

    # Filter by Tags (Allow Multiple Tags)
    tags_value = filters.get("tags")
    if tags_value:
        tag_list = [tag.strip() for tag in tags_value.split(",") if tag.strip()]
        if tag_list:
            conditions.append("custom_tag IN %(tags)s")
            values["tags"] = tuple(tag_list)

    # Filter by Task Type
    if filters and filters.get("type"):
        conditions.append("t.type = %(type)s")
        values["type"] = filters["type"]
     
    # Filter by Status, Priority, Start Date, End Date
    if filters and filters.get("status"):
        conditions.append("status = %(status)s")
        values["status"] = filters["status"]

    if filters and filters.get("priority"):
        conditions.append("priority = %(priority)s")
        values["priority"] = filters["priority"]

    if filters and filters.get("start_date"):
        conditions.append("exp_start_date = %(start_date)s")
        values["start_date"] = filters["start_date"]

    if filters and filters.get("end_date"):
        conditions.append("exp_end_date = %(end_date)s")
        values["end_date"] = filters["end_date"]

    if filters and filters.get("creation"):
        conditions.append("Date(t.creation) = %(creation)s")
        values["creation"] = filters["creation"]

    if filters and filters.get("created_by"):
        conditions.append("t.owner = %(created_by)s")
        values["created_by"] = filters["created_by"]

    

    # Build Condition String
    condition_str = " WHERE " + " AND ".join(conditions) if conditions else ""

    # SQL Query
    query = f"""
                SELECT 
                    t.creation,
                    t.owner AS created_by,
                    t.custom_module AS module,
                    CONCAT('<a href="/app/task/', t.name, '">', t.subject, '</a>') AS task,
                    COALESCE(ua.full_name, t.custom_assigned_to) AS assigned,
                    COALESCE(ua2.full_name, t.custom_allotted_to) AS allotted,
                    t.custom_tag AS tags,
                    t.priority,
                    t.status,
                    t.exp_start_date AS start_date,
                    t.exp_end_date AS end_date,
                    t.name AS task_id,  -- Add this line to fetch Task ID
                    t.progress AS progress
                FROM
                    `tabTask` t
                LEFT JOIN `tabUser` ua ON t.custom_assigned_to = ua.email
                LEFT JOIN `tabUser` ua2 ON t.custom_allotted_to = ua2.email
                {condition_str}
                ORDER BY t.creation DESC
            """

    # Execute Query
    data = frappe.db.sql(query, values, as_dict=True)
    return data
