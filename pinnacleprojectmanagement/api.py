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

@frappe.whitelist()
def allot_task(task_data):
    """API to create a new Task Assignment document"""
    try:
        # Parse incoming JSON
        task_data = json.loads(task_data)

        # Validate required fields
        required_fields = [
            "subject",
            "assigned_to",
            "due_date",
            "task_detail",
            "created_by",
        ]
        missing_fields = [f for f in required_fields if not task_data.get(f)]

        if missing_fields:
            return {
                "status": 400,
                "message": f"Missing required fields: {', '.join(missing_fields)}",
            }

        # Create Task Assignment document
        doc = frappe.get_doc(
            {
                "doctype": "Task Assignment",
                "subject": task_data["subject"],
                "assigned_to": task_data["assigned_to"],
                "due_date": task_data["due_date"],
                "task_detail": task_data["task_detail"],
                "owner": task_data["created_by"],
            }
        )
        doc.append("reminder_interval", {"reminder_type": "Minute", "reminder_value": 5})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        # Generate link to the created document
        link = f"/app/task-assignment/{doc.name}"

        return {
            "status": 200,
            "message": "Task created successfully!",
            "doc": doc.as_dict(),
            "link": link,
        }

    except json.JSONDecodeError:
        return {"status": 400, "message": "Invalid JSON format"}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Task Assignment Error")
        return {"status": 500, "message": str(e)}

@frappe.whitelist()
def authenticate_user(email):

    """API to check if a User exists in the system"""
    try:
        if not email:
            return {"status": 400, "message": "Email is required", "exist": False}

        # Check user existence
        exists = frappe.db.exists("User", email)
        if not exists:
            return {"status": 404, "message": "User does not exist", "exist": False}

        return {
            "status": 200,
            "message": "User authenticated successfully",
            "exist": True,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "User Authentication Error")
        return {"status": 500, "message": str(e), "exist": False}
