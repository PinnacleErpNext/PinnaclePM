import frappe


def execute():
    # Get all tasks where status is Backlog
    tasks = frappe.get_all("Task", filters={"status": "Backlog"}, fields=["name"])

    for task in tasks:
        frappe.db.set_value("Task", task.name, "status", "Open", update_modified=False)

    frappe.db.commit()
