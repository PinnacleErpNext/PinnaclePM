# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TaskAssignment(Document):
    pass


def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    # Admin can see all
    if "Administrator" == user:
        return ""

    # Condition for normal users
    return """(`tabTask Assignment`.owner = '{user}' 
               OR `tabTask Assignment`.`assigned_to` = '{user}')""".format(
        user=user
    )


def has_permission(doc, user=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return True

    # User can access if created by them
    if doc.owner == user:
        return True

    # User can access if assigned to them
    if doc.assigned_to == user:
        return True

    return False
