import frappe

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
    email_list = [item['user'] for item in user_permissions]

    # Fetch users from the database
    users = frappe.db.get_list(
        'User',
        filters={
            'name': ['in', email_list]
        },
        fields=['name', 'full_name']  # Include both email (name) and full_name
    )

    # Create a key-value pair of email and full name
    assignee = {user['name']: user['full_name'] for user in users}

    # Return the dictionary
    return assignee


#process to send comment notification
from frappe.core.doctype.comment.comment import Comment
def send_comment_notification(doc, method):
    # Check if the comment is related to a Task
    if doc.reference_doctype == "Task":
        # Fetch the Task document
        task = frappe.get_doc("Task", doc.reference_name)
        owner = task.owner

        # Fetch the list of assignees
        assignees = frappe.get_all(
            "ToDo",
            filters={
                "reference_type": "Task",
                "reference_name": task.name,
                "status": "Open"  # Optional: Only fetch open assignments
            },
            fields=["allocated_to"]  # Fetch the assigned users
        )
        assignee_emails = [
            frappe.get_value("User", assignee["allocated_to"], "email") for assignee in assignees
        ]
        # Retrieve the list of followers
        followers = [follower.user for follower in  task.custom_followers]
    
        # Prepare the notification message
        subject = f"New comment on Task: {task.name}"
        message = f"""
        <p>A new comment has been added to Task <b>{task.name}</b> by {doc.owner}.</p>
        <p>Project: {task.project}</p>
        <p>Task: {task.subject}</p>
        <p>Comment:</p>
        <p>{doc.content}</p>
        """


        # Combine unique recipients (owner, followers, and assignees)
        recipient_emails = list(
            set(
                [frappe.get_value("User", owner, "email")]  # Task owner's email
                + assignee_emails
                + followers
            )
        )
        print(recipient_emails)
        
        # Send email notifications
        for email in recipient_emails:
            if email:
                frappe.sendmail(
                    recipients=[email],
                    subject=subject,
                    message=message
                )


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
        'Project',
        filters={parent_field: parent_value},
        fields=['name as value', 'project_name as title', 'is_group']
    )

    # Fetch tasks linked to the parent project
    tasks = frappe.get_all(
        'Task',
        filters={'project': parent_value},
        fields=['name as value', 'subject as title']
    )

    return child_projects + tasks

@frappe.whitelist(allow_guest=True)
def after_migrate():
    parent_doctype = "Task"
    fieldname_to_update = "status"  

    # Define the new options
    new_options = ['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled', "Can't Reproduce"]

    # Convert the list to a newline-separated string
    options_string = "\n".join(new_options)

    # Update the options for the specified field
    frappe.db.set_value(
        "DocField",
        {"parent": parent_doctype, "fieldname": fieldname_to_update},
        "options",
        options_string
    )

    # Commit the changes to the database
    frappe.db.commit()

    # Log a success message
    frappe.logger().info(f"Options updated for field '{fieldname_to_update}' in parent '{parent_doctype}'.")
