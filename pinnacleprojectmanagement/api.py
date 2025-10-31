import frappe
import json


@frappe.whitelist(allow_guest=True)
def updateUserList(proj, search_text=None):
    filters = {}

    # Optional: Filter based on search_text
    if search_text:
        filters["name"] = ["like", f"%{search_text}%"]

    # Execute the SQL query to get user permissions
    query = """
        SELECT user 
        FROM `tabUser Permission` 
        WHERE `for_value` = %s
    """
    user_permissions = frappe.db.sql(query, proj, as_dict=True)

    # Extract the email list from user permissions
    email_list = [item["user"] for item in user_permissions]

    # Fetch users from the database
    users = frappe.db.get_list(
        "User",
        filters={"name": ["in", email_list]},
        fields=["name", "full_name"],  # Include both email (name) and full_name
    )

    # Create a key-value pair of email and full name
    assignee = {user["name"]: user["full_name"] for user in users}

    # Return the dictionary
    return assignee


@frappe.whitelist(allow_guest=True)
def get_all_nodes(doctype, parent_field, parent_value=None):
    """
    Fetch child nodes for the tree view.

    :param doctype: The doctype for which the tree view is being generated.
    :param parent_field: The field representing the parent-child relationship.
    :param parent_value: The parent node for which children are being fetched.
    """
    # Fetch child projects
    child_projects = frappe.get_all(
        "Project",
        filters={parent_field: parent_value},
        fields=["name as value", "project_name as title", "is_group"],
    )

    # Fetch tasks linked to the parent project
    tasks = frappe.get_all(
        "Task",
        filters={"project": parent_value},
        fields=["name as value", "subject as title"],
    )

    return child_projects + tasks


@frappe.whitelist(allow_guest=True)
def allot_task(task_data):
    task_data = json.loads(task_data)
    if (
        not task_data.get("subject")
        or not task_data.get("assigned_to")
        or not task_data.get("due_date")
        or task_data.get("telegram_id")
    ):
        return "Missing required fields"
    frappe.get_doc(
        {
            "doctype": "Task Assignment",
            "subject": task_data.get("subject"),
            "assigned_to": task_data.get("assigned_to"),
            "due_date": task_data.get("due_date"),
            "created_by": task_data.get("created_by"),
        }
    ).insert(ignore_permissions=True)
    return "Task Created successfully!"


@frappe.whitelist(allow_guest=True)
def authenticate_user(email):
    user = frappe.get_doc("User", email)
    if user and user.enabled:
        return {"status": "success", "message": "User authenticated","exist": True}
    else:
        return {"status": "failure", "message": "Invalid or disabled user","exist": False}
    

