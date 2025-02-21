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
            "width": 400   
        },
        {
            "label": _("Project Name"),
            "fieldname": "project",
            "fieldtype": "Data",
            "width": 400 
        },
        {
            "label": _(""),
            "fieldname": "add_task",
            "fieldtype": "Data",
            "width": 400 
        }
    ]

def get_data(filters):
    conditions = []
    values = []

    # Apply filter if a project is selected
    if filters and filters.get("project"):
        conditions.append("project = %s")
        values.append(filters["project"])
    
    # Apply filter if a module is selected
    if filters and filters.get("module"):
        conditions.append("name = %s")
        values.append(filters["module"])  # Fixed incorrect key
        print(filters.get("module"))

    query = "SELECT module_name, project FROM `tabModules`"
    
    # Add WHERE condition if needed
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    print(values)
    print(query)
    data = frappe.db.sql(query, values, as_dict=True)
    print(data)
    return data

