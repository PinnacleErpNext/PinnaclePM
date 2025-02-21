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
            "label": _("Module"),
            "fieldname": "module",
            "fieldtype": "Data",
            "options": "Modules",
            "width":110
        },
        {
            "label": _("Task"),
            "fieldname": "task",
            "fieldtype": "HTML",  # Hyperlinked task names
            "width":200
        },
        {
            "label": _("Assigned"),
            "fieldname": "assigned",
            "fieldtype": "Link",
            "options": "User",
            "width":200
        },
        {
            "label": _("Allotted"),
            "fieldname": "allotted",
            "fieldtype": "Link",
            "options": "User",
            "width":200
        },
        {
            "label": _("Tags"),
            "fieldname": "tags",
            "fieldtype": "Data",
            "width":100
        },
        {
            "label": _("Priority"),
            "fieldname": "Select",
            "options": ["", "Low", "Medium", "High"],
            "width":100
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
            "width":100
        },
        {
            "label": _("Start Date"),
            "fieldname": "start_date",
            "fieldtype": "Date",
            "width":100
        },
        {
            "label": _("End Date"),
            "fieldname": "end_date",
            "fieldtype": "Date",
            "width":100
        },
    ]

def get_data(filters):
    conditions = []
    values = {}

    # Ensure filtering by Project
    if filters and filters.get("project"):
        conditions.append("project = %(project)s")
        values["project"] = filters["project"]

    if filters and filters.get("modules"):
        module_value = filters.get("modules")

        if module_value: 
            module_list = [m.strip() for m in module_value.split(",") if m.strip()]  
            
            if module_list:  
                conditions.append("custom_module IN %(modules)s")  
                values["modules"] = tuple(module_list)  
                


    if filters and filters.get("task"):
        conditions.append("name = %(task)s") 
        values["task"] = filters["task"]

    if filters and filters.get("assigned"):
        conditions.append("custom_assigned_to = %(assigned)s")
        values["assigned"] = filters["assigned"]

    if filters and filters.get("allotted"):
        conditions.append("custom_allotted_to = %(allotted)s")
        values["allotted"] = filters["allotted"]
        
    
    if filters and filters.get("tags"):
       conditions.append("custom_tag = %(tags)s")
       values["tags"] = filters["tags"]

    if filters and filters.get("status"):
        conditions.append("status = %(status)s")
        values["status"] = filters["status"]

    if filters and filters.get("priority"):
        conditions.append("priority = %(priority)s")
        values["priority"] = filters["priority"]

    if filters and filters.get("start_date"):
        conditions.append("act_start_date >= %(start_date)s")
        values["start_date"] = filters["start_date"]

    if filters and filters.get("end_date"):
        conditions.append("act_end_date <= %(end_date)s")
        values["end_date"] = filters["end_date"]

    condition_str = " WHERE " + " AND ".join(conditions) if conditions else ""

    query = f"""
        SELECT 
            custom_module AS module,
            CONCAT('<a href="/app/task/', name, '">', subject, '</a>') AS task,
            custom_assigned_to AS assigned,
            custom_allotted_to AS allotted,
            custom_tag AS tags,
            priority,
            status,
            act_start_date AS start_date,
            act_end_date AS end_date
        FROM
            `tabTask`
        {condition_str}
    """
    print(query)
    data = frappe.db.sql(query, values, as_dict=True)
    return data
