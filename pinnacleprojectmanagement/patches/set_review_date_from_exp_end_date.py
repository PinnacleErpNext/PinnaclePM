import frappe
from datetime import timedelta
from frappe.utils import getdate


def execute():
    tasks = frappe.get_all(
        "Task",
        filters={"exp_end_date": ["is", "set"]},
        fields=["name", "exp_end_date", "review_date"],
    )

    for task in tasks:
        exp_end_date = getdate(task.exp_end_date)

        review_date = exp_end_date + timedelta(days=1)

        # Update only if review_date is empty or incorrect
        if not task.review_date or getdate(task.review_date) != review_date:
            frappe.db.set_value(
                "Task", task.name, "review_date", review_date, update_modified=False
            )

    frappe.db.commit()
