import frappe
import json
from openpyxl import Workbook
from frappe.utils.file_manager import save_file
from frappe.utils import get_site_path


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
def allot_task(task_data=None):
    """API to create a new Task Assignment document"""
    try:
        # Log incoming request
        frappe.logger().info(f"[Bot Task API] Received form data: {frappe.form_dict}")

        # Extract task_data if not provided
        if not task_data:
            task_data = frappe.form_dict.get("task_data")
            frappe.logger().info(f"[Bot Task API] Extracted task_data from form_dict: {task_data}")

        # If still empty, return error
        if not task_data:
            msg = "No task_data provided"
            frappe.logger().error(f"[Bot Task API] {msg}")
            return {"status": 400, "message": msg}

        # Parse JSON if sent as string
        if isinstance(task_data, str):
            try:
                task_data = json.loads(task_data)
            except json.JSONDecodeError as e:
                msg = "Invalid JSON format in task_data"
                frappe.logger().error(f"[Bot Task API] JSON error: {e}")
                return {"status": 400, "message": msg}

        # Validate required fields
        required_fields = ["subject", "assigned_to", "due_date", "task_detail", "created_by"]
        missing = [field for field in required_fields if not task_data.get(field)]

        if missing:
            msg = f"Missing required fields: {', '.join(missing)}"
            frappe.logger().error(f"[Bot Task API] {msg}")
            return {"status": 400, "message": msg}

        # Create Task Assignment record
        doc = frappe.get_doc(
            {
                "doctype": "Task Assignment",
                "subject": task_data["subject"],
                "assigned_to": task_data["assigned_to"],
                "due_date": task_data["due_date"],
                "task_detail": task_data["task_detail"],
                "assigned_by": task_data["created_by"],
            }
        )

        # Add reminder interval row
        doc.append(
            "reminder_interval",
            {"reminder_type": "Minute", "reminder_value": 5}
        )

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        frappe.logger().info(f"[Bot Task API] Task created successfully: {doc.name}")

        return {
            "status": 200,
            "message": "Task created successfully!",
            "doc": doc.as_dict(),
            "link": f"/app/task-assignment/{doc.name}",
        }

    except Exception as e:
        # Log full traceback
        frappe.logger().error(f"[Bot Task API] Unexpected error: {e}")
        frappe.log_error(frappe.get_traceback(), "Task Assignment Error")
        return {"status": 500, "message": str(e)}


@frappe.whitelist()
def authenticate_user(email):
    """API to check if a User exists in the system"""
    try:
        frappe.logger().info(f"[Bot Auth API] Incoming request with email: {email}")

        if not email:
            msg = "Email is required"
            frappe.logger().warning(f"[Bot Auth API] {msg}")
            return {"status": 400, "message": msg, "exist": False}

        # Check user existence
        exists = frappe.db.exists("User", email)

        if not exists:
            msg = f"User '{email}' does not exist"
            frappe.logger().warning(f"[Bot Auth API] {msg}")
            return {"status": 404, "message": "User does not exist", "exist": False}

        frappe.logger().info(f"[Bot Auth API] User '{email}' authenticated successfully")

        return {
            "status": 200,
            "message": "User authenticated successfully",
            "exist": True,
        }

    except Exception as e:
        frappe.logger().error(f"[Bot Auth API] Unexpected Error: {e}")
        frappe.log_error(frappe.get_traceback(), "User Authentication Error")
        return {"status": 500, "message": str(e), "exist": False}
    
@frappe.whitelist()
def get_assets(filter_text=None, asset_category=None, component_filter=None, component_value=None, custodian_filter=None):

    AC_TABLE = "tabAsset Components"

    conditions = []
    params = []

    # ✅ Only submitted Assets
    conditions.append("a.docstatus = 1")

    if filter_text:
        like = f"%{filter_text}%"
        conditions.append("""
            (a.custom_asset_id LIKE %s
            OR a.custom_custodian_name LIKE %s
            OR a.item_name LIKE %s)
        """)
        params.extend([like, like, like])

    if asset_category:
        conditions.append("a.asset_category = %s")
        params.append(asset_category)

    if custodian_filter:
        conditions.append("a.custom_custodian_name = %s")
        params.append(custodian_filter)

    if component_filter and component_value:
        conditions.append("""
            EXISTS (
                SELECT 1
                FROM `tabAsset Components` ac2
                WHERE ac2.asset = a.name
                AND ac2.component_name = %s
                AND ac2.specification LIKE %s
            )
        """)
        params.extend([component_filter, f"%{component_value}%"])

    elif component_filter:
        conditions.append("""
            EXISTS (
                SELECT 1
                FROM `tabAsset Components` ac2
                WHERE ac2.asset = a.name
                AND ac2.component_name = %s
            )
        """)
        params.append(component_filter)

    where_clause = "WHERE " + " AND ".join(conditions)

    query = f"""
        SELECT  
            a.name AS id,
            a.custom_asset_id AS asset_id,
            a.asset_name AS asset_name,
            a.location AS location,
            a.custom_custodian_name AS used_by,
            a.item_name,
            a.asset_category,

            COALESCE(
                JSON_OBJECTAGG(
                    ac.component_name,
                    ac.specification
                ),
                '{{}}'
            ) AS asset_components


        FROM `tabAsset` a
        LEFT JOIN `{AC_TABLE}` ac ON ac.asset = a.name
        {where_clause}

        GROUP BY 
            a.name, 
            a.custom_asset_id,
            a.asset_name,
            a.location, 
            a.custom_custodian_name, 
            a.item_name, 
            a.asset_category

        ORDER BY a.custom_asset_id
    """

    return frappe.db.sql(query, params, as_dict=True)



@frappe.whitelist()
def download_assets_excel(filter_text=None, asset_category=None, component_filter=None, custodian_filter=None):

    data = get_assets(filter_text, asset_category, component_filter, custodian_filter)

    wb = Workbook()
    ws = wb.active
    ws.title = "Asset Report"

    # -----------------------------------
    # Collect all unique component names
    # -----------------------------------
    component_set = set()

    for row in data:
        if row.get("asset_components"):
            try:
                comp = json.loads(row["asset_components"])
                for k in comp.keys():
                    component_set.add(k)
            except:
                pass

    component_headers = sorted(component_set)

    # -----------------------------------
    # Excel Headers (dynamic)
    # -----------------------------------
    headers = [
        "Asset ID",
        "Asset Name",
        "Item Name",
        "Location",
        "Custodian",
        "Asset Category",
    ] + component_headers

    ws.append(headers)

    # -----------------------------------
    # Data rows
    # -----------------------------------
    for row in data:
        comp = {}
        if row.get("asset_components"):
            try:
                comp = json.loads(row["asset_components"])
            except:
                comp = {}

        row_values = [
            row.get("asset_id") or "N/A",
            row.get("asset_name") or "N/A",
            row.get("item_name") or "N/A",
            row.get("location") or "N/A",
            row.get("used_by") or "N/A",
            row.get("asset_category") or "N/A",
        ]

        for c in component_headers:
            row_values.append(comp.get(c) or "N/A")

        ws.append(row_values)

    # -----------------------------------
    # Save file
    # -----------------------------------
    file_name = "Asset_Report.xlsx"
    file_path = get_site_path("private", "files", file_name)

    wb.save(file_path)

    file_doc = save_file(
        file_name,
        open(file_path, "rb").read(),
        None,
        None,
        is_private=1
    )

    return file_doc.file_url
