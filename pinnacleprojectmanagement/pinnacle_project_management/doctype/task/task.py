import frappe
from datetime import timedelta
from frappe.utils import cint, getdate, today, get_url_to_form


def before_save(self, method):
    if self.exp_end_date:
        if not self.review_date:
            review_date = getdate(self.exp_end_date) + timedelta(days=1)
            if review_date.weekday() == 6:
                review_date += timedelta(days=1)
            self.review_date = review_date


def validate(self, method):
    if self.custom_overdue == 1 and not self.custom_overdue_reason:
        frappe.throw("Overdue Reason is mandatory when task is marked Overdue")
    count = cint(self.custom_check_list_count)

    if (
        self.status == "Completed"
        and self.project == "Postgres Migration"
        and count < 7
    ):
        frappe.throw(
            "Please complete all checklist items before marking the task as Completed."
        )

# ------------------------------
# Permissions 
# ------------------------------

def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    # Administrator → no restriction
    if user == "Administrator":
        return ""

    roles = frappe.get_roles(user)

    # -----------------------------
    # UNIVERSAL RULE
    # -----------------------------
    base_condition = f"""
        (
            `tabTask`.custom_assigned_to = '{user}'
            OR `tabTask`.custom_allotted_to = '{user}'
        )
    """

    # -----------------------------
    # Projects Manager
    # -----------------------------
    if "Projects Manager" in roles:

        permitted_projects = frappe.get_all(
            "User Permission",
            filters={"user": user, "allow": "Project"},
            pluck="for_value",
        )

        if permitted_projects:
            projects = "', '".join(permitted_projects)

            return f"""
            (
                {base_condition}
                OR `tabTask`.project IN ('{projects}')
            )
            """

        return base_condition

    # -----------------------------
    # Backlog Manager
    # -----------------------------
    if "Backlog Manager" in roles:
        return f"""
        (
            {base_condition}
            OR `tabTask`.owner = '{user}'
        )
        """

    # -----------------------------
    # Projects User
    # -----------------------------
    if "Projects User" in roles:
        return base_condition

    # default fallback
    return base_condition


def has_permission(doc, user=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return True

    roles = frappe.get_roles(user)

    # UNIVERSAL RULE
    if doc.custom_assigned_to == user or doc.custom_allotted_to == user:
        return True

    # Backlog Manager
    if "Backlog Manager" in roles:
        if doc.owner == user:
            return True

    # Projects Manager
    if "Projects Manager" in roles:
        permitted = frappe.db.exists(
            "User Permission",
            {
                "user": user,
                "allow": "Project",
                "for_value": doc.project,
            },
        )
        if permitted:
            return True

    return False


def on_update(doc, method):
    # Extract unique identifiers (e.g., email addresses) from current followers
    current_followers = {
        follower.user for follower in (doc.custom_followers or []) if follower.user
    }

    # Get the previous state of the document
    previous_doc = doc.get_doc_before_save()

    # Extract unique identifiers from previous followers
    previous_followers = (
        {
            follower.user
            for follower in (previous_doc.custom_followers or [])
            if follower.user
        }
        if previous_doc
        else set()
    )

    # Get assignees and owner
    assignees = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": "Task",
            "reference_name": doc.name,
            "status": "Open",  # Optional: Only fetch open assignments
        },
        fields=["allocated_to"],
    )

    assignee_emails = [
        frappe.get_value("User", assignee["allocated_to"], "email")
        for assignee in assignees
        if assignee.get("allocated_to")
    ]

    owner_email = frappe.get_value("User", doc.owner, "email") if doc.owner else None

    # Determine new followers (added)
    new_followers = current_followers - previous_followers
    new_followers_names = ", ".join(
        frappe.db.get_value("User", follower, "full_name") or "Unknown"
        for follower in new_followers
    )

    modified_by_name = (
        frappe.db.get_value("User", doc.modified_by, "full_name") or "Unknown"
    )

    # Recipients: Followers + Assignees + Owner (unique set to avoid duplicates)
    recipients = list(
        set(
            current_followers
            | set(assignee_emails)
            | ({owner_email} if owner_email else set())
        )
    )

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
    removed_followers_names = ", ".join(
        frappe.db.get_value("User", follower, "full_name") or "Unknown"
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


def custom_set_tasks_as_overdue():
    tasks = frappe.get_all(
        "Task",
        filters={"status": ["not in", ["Cancelled", "Completed", "Close"]]},
        fields=[
            "name",
            "status",
            "review_date",
            "custom_assigned_to",
            "custom_allotted_to",
            "custom_overdue_reason",
        ],
    )

    for task in tasks:
        # Preserve core Pending Review behaviour
        if task.status == "Pending Review":
            if task.review_date and getdate(task.review_date) >= getdate(today()):
                continue

        task_doc = frappe.get_doc("Task", task.name)
        old_status = task_doc.status

        # Let ERPNext decide if it becomes overdue
        task_doc.update_status()
        new_status = task_doc.status

        # ✅ If task JUST became overdue
        if old_status != "Overdue" and new_status == "Overdue":

            # mark custom flag
            frappe.db.set_value("Task", task_doc.name, "custom_overdue", 1)

            # 🔔 Send reminder mail if reason is not filled
            # if not task_doc.custom_overdue_reason:
            #     send_overdue_reason_mail(task_doc)


def send_overdue_reason_mail(task_doc):
    recipients = []

    if task_doc.custom_assigned_to:
        recipients.append(task_doc.custom_assigned_to)

    if task_doc.custom_allotted_to:
        recipients.append(task_doc.custom_allotted_to)

    # remove duplicates
    recipients = list(set(recipients))

    if not recipients:
        return

    task_link = get_url_to_form("Task", task_doc.name)

    subject = f"Reminder: Please fill Overdue Reason for Task {task_doc.name}"

    message = f"""
        <p>Dear User,</p>

        <p>The following task has been marked as <b>Overdue</b>:</p>

        <p>
            <b>Task:</b> {task_doc.subject}<br>
            <b>Task ID:</b> {task_doc.name}
        </p>

        <p>Please update the <b>Overdue Reason</b> in the task document.</p>

        <p>
            👉 <a href="{task_link}">Click here to open the Task</a>
        </p>

        <br>
        <p>Thanks,<br>ERP System</p>
    """

    frappe.sendmail(recipients=recipients, subject=subject, message=message)


def disable_core_task_overdue_job():
    job_name = "task.set_tasks_as_overdue"

    if frappe.db.exists("Scheduled Job Type", job_name):
        job = frappe.get_doc("Scheduled Job Type", job_name)
        if not job.stopped:
            job.stopped = 1
            job.save()
            frappe.db.commit()
