import frappe

#It will allot project to users by creating user permissions for them
def project_allottment(doc, method):
    
    project_name = doc.name

    # Extract the current project managers from the multi-select list
    new_project_managers = {manager.get("user") for manager in doc.custom_project_managers if manager.get("user")}
    
    new_backlog_managers = {manager.get("user") for manager in doc.custom_backlog_managers if manager.get("user")}
       
    new_managers = new_project_managers | new_backlog_managers
    
    # Fetch existing user permissions for this project
    existing_permissions = frappe.get_all(
        "User Permission",
        filters={"allow": "Project", "for_value": project_name},
        fields=["name", "user"]
    )

    existing_users = {perm["user"] for perm in existing_permissions}

    # Determine which users need to be removed and which need to be added
    users_to_remove = existing_users - new_managers
    users_to_add = new_managers - existing_users

    # Remove old permissions
    for user in users_to_remove:
        frappe.db.delete(
            "User Permission",
            {"user": user, "allow": "Project", "for_value": project_name}
        )
        frappe.msgprint(f"Removed permission for {user} from Project: {project_name}")

    # Add new permissions
    for user in users_to_add:
        user_permission = frappe.get_doc({
            "doctype": "User Permission",
            "user": user,
            "allow": "Project",
            "for_value": project_name,
            "apply_to_all_doctypes": 0  # Restricts permission only to the Project doctype
        })
        user_permission.insert(ignore_permissions=True)
        frappe.msgprint(f"Granted permission to {user} for Project: {project_name}")

#It will allot task to the users by creating user permissions for them
def task_allottment(doc, method):
    task_name = doc.name
    new_user = doc.custom_allotted_to  # The newly assigned user
    if new_user is None:
        return
    # Fetch existing user permissions for this task
    existing_permissions = frappe.get_all(
        "User Permission",
        filters={"allow": "Task", "for_value": task_name},
        fields=["name", "user"]
    )

    existing_users = {perm["user"] for perm in existing_permissions}

    # If there was a previous user with permission, remove it (assuming one user at a time)
    users_to_remove = existing_users - {new_user}
    users_to_add = {new_user} - existing_users  # If new user is different from existing

    # Remove old user permission
    for user in users_to_remove:
        frappe.db.delete(
            "User Permission",
            {"user": user, "allow": "Task", "for_value": task_name}
        )
        frappe.msgprint(f"Removed permission for {user} from Task: {task_name}")

    # Add new permission
    for user in users_to_add:
        user_permission = frappe.get_doc({
            "doctype": "User Permission",
            "user": user,
            "allow": "Task",
            "for_value": task_name,
            "apply_to_all_doctypes": 0  # Restricts permission only to this Task
        })
        user_permission.insert(ignore_permissions=True)
        frappe.msgprint(f"Granted permission to {user} for Task: {task_name}")
