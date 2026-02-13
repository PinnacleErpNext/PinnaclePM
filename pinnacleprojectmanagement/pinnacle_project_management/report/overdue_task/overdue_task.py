# Copyright (c) 2026, OTPL and contributors
# For license information, please see license.txt


import frappe
from frappe.utils import getdate, today, date_diff


def execute(filters=None):
    filters = filters or {}

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    return [
        {
            "label": "Task ID",
            "fieldname": "task_id",
            "fieldtype": "Link",
            "options": "Task",
            "width": 200,
        },
        {
            "label": "Task Subject",
            "fieldname": "subject",
            "fieldtype": "Data",
            "width": 250,
        },
        {
            "label": "Created By",
            "fieldname": "created_by",
            "fieldtype": "Link",
            "options": "User",
            "width": 150,
        },
        {"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 80},
        {
            "label": "Assigned To",
            "fieldname": "assigned_to",
            "fieldtype": "Link",
            "options": "User",
            "width": 140,
        },
        {
            "label": "Allotted To",
            "fieldname": "allotted_to",
            "fieldtype": "Link",
            "options": "User",
            "width": 140,
        },
        {
            "label": "Status",
            "fieldname": "display_status",
            "fieldtype": "Data",
            "width": 90,
        },
        {
            "label": "Duration",
            "fieldname": "duration",
            "fieldtype": "Data",
            "width": 80,
        },
        {"label": "Reason", "fieldname": "reason", "fieldtype": "Data", "width": 500},
    ]


def get_data(filters):
    filters = filters or {}
    print(filters)
    tasks = frappe.get_all(
        "Task",
        filters={
            "custom_overdue": 1,
            **({"project": filters["project"]} if filters.get("project") else {}),
            **(
                {"custom_assigned_to": filters["assigned_to"]}
                if filters.get("assigned_to")
                else {}
            ),
            **(
                {"custom_allotted_to": filters["allotted_to"]}
                if filters.get("allotted_to")
                else {}
            ),
        },
        fields=[
            "name",
            "subject",
            "owner",
            "type",
            "custom_assigned_to",
            "custom_allotted_to",
            "exp_end_date",
            "completed_on",
            "closing_date",
            "custom_overdue_reason",
            "custom_overdue",
        ],
    )

    today_date = getdate(today())
    result = []

    for t in tasks:
        status, duration = calculate_status_and_duration(
            t.exp_end_date, t.completed_on, t.closing_date, t.custom_overdue, today_date
        )

        result.append(
            {
                "task_id": t.name,
                "subject": t.subject,
                "created_by": t.owner,
                "type": t.type,
                "assigned_to": t.custom_assigned_to,
                "allotted_to": t.custom_allotted_to,
                "display_status": status,
                "duration": duration,
                "reason": t.custom_overdue_reason if status == "Overdue" else "",
            }
        )

    return result


def calculate_status_and_duration(end_date, completed_on, closing_date, overdue, today_date):
    if not end_date:
        return "On Time", "0"

    end_date = getdate(end_date)
    diff = date_diff(end_date, closing_date or completed_on or today_date)
    
    if overdue:
        return "Overdue", f"{abs(diff)}d"
    
    if diff == 0:
        return "On Time", "0"
    elif diff > 0:
        return "Before", f"{diff}d"

