import frappe

@frappe.whitelist(allow_guest=True)
def updateUserList(proj,search_text=None):
    
    filters = {}
    
    # Optional: Filter based on search_text
    if search_text:
        filters["name"] = ["like", f"%{search_text}%"]

    # Execute the SQL query
    query = """
        SELECT user 
        FROM `tabUser Permission` 
        WHERE `for_value` = %s
    """
    user_permissions = frappe.db.sql(query, proj, as_dict=True)
    return user_permissions