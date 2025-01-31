import frappe
from frappe import _
from frappe.utils import get_url_to_form

def on_update(doc, method):
    # Extract unique identifiers (e.g., email addresses) from current followers
    current_followers = {follower.user for follower in (doc.custom_followers or []) if follower.user}

    # Get the previous state of the document
    previous_doc = doc.get_doc_before_save()

    # Extract unique identifiers from previous followers
    previous_followers = {follower.user for follower in (previous_doc.custom_followers or []) if follower.user} if previous_doc else set()

    # Get assignees and owner
    assignees = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": "Task",
            "reference_name": doc.name,
            "status": "Open"  # Optional: Only fetch open assignments
        },
        fields=["allocated_to"]
    )
    
    assignee_emails = [
        frappe.get_value("User", assignee["allocated_to"], "email")
        for assignee in assignees if assignee.get("allocated_to")
    ]

    owner_email = frappe.get_value("User", doc.owner, "email") if doc.owner else None

    # Determine new followers (added)
    new_followers = current_followers - previous_followers
    new_followers_names = ', '.join(
        frappe.db.get_value('User', follower, 'full_name') or "Unknown"
        for follower in new_followers
    )

    modified_by_name = frappe.db.get_value('User', doc.modified_by, 'full_name') or "Unknown"

    # Recipients: Followers + Assignees + Owner (unique set to avoid duplicates)
    recipients = list(set(current_followers | set(assignee_emails) | ({owner_email} if owner_email else set())))

    if new_followers and recipients:
        subject = f"New Follower Added - {doc.name}"
        message = f"""
            <p><b>Project:</b> {doc.project}</p>
            <p><b>Task:</b> {doc.name}</p>
            <p><b>New Follower(s):</b> {new_followers_names}</p>
            <p><b>Added By:</b> {modified_by_name}</p>
        """
        frappe.sendmail(recipients=recipients, subject=subject, message=message)

    # Determine removed followers
    removed_followers = previous_followers - current_followers
    removed_followers_names = ', '.join(
        frappe.db.get_value('User', follower, 'full_name') or "Unknown"
        for follower in removed_followers
    )

    if removed_followers and recipients:
        subject = f"Follower Removed - {doc.name}"
        message = f"""
            <p><b>Project:</b> {doc.project}</p>
            <p><b>Task:</b> {doc.name}</p>
            <p><b>Removed Follower(s):</b> {removed_followers_names}</p>
            <p><b>Removed By:</b> {modified_by_name}</p>
        """
        frappe.sendmail(recipients=recipients, subject=subject, message=message)
