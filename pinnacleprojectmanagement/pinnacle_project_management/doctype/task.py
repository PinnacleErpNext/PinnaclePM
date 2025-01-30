import frappe
from frappe import _
from frappe.utils import get_url_to_form

import frappe
from frappe import _
from frappe.utils import get_url_to_form

def on_update(doc, method):
    # Extract unique identifiers (e.g., email addresses) from current followers
    current_followers = {follower.user for follower in (doc.custom_followers or [])}
    
    # Get the previous state of the document
    previous_doc = doc.get_doc_before_save()
    
    # Extract unique identifiers from previous followers
    previous_followers = {follower.user for follower in (previous_doc.custom_followers or [])} if previous_doc else set()

    # Determine new followers (added)
    new_followers = current_followers - previous_followers
    new_followers_name = ', '.join(
    frappe.db.get_value('User', follower, 'full_name')
    for follower in new_followers
    )
    modifiedBy = frappe.db.get_value('User',doc.modified_by, 'full_name')
    if new_followers:
        subject = f"New Follower Added - {doc.name}"
        frappe.sendmail(
        recipients=current_followers,
        subject=subject,
        message= f"""
            <p><b>Project:</b>{doc.project}</p>
            <p><b>Task:</b>{doc.name}</p>
            <p><b>New Follower:</b>{new_followers_name}</p>
            <p><b>Added By:</b>{modifiedBy}</p>
        """
        )

    # Determine removed followers
    removed_followers = previous_followers - current_followers
    removed_follower_names = ', '.join(
        frappe.db.get_value('User', follower, 'full_name') or 'Unknown'
        for follower in removed_followers
    )
    modifiedBy = frappe.db.get_value('User',doc.modified_by, 'full_name')

    if removed_followers:
        subject = f"Follower Removed - {doc.name}"
        frappe.sendmail(
        recipients=current_followers,
        subject=subject,
        message= f"""
            <p><b>Project:</b>{doc.project}</p>
            <p><b>Task:</b>{doc.name}</p>
            <p><b>Removed Follower:</b>{removed_follower_names}</p>
            <p><b>Removed By:</b>{modifiedBy}</p> 
        """
        )
