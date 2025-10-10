# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime, time_diff_in_seconds


class TaskAssignment(Document):
    def before_save(self):
        # You can schedule or validate reminders here if needed
        schedule_job()

    def after_insert(self):
        # Optional: send immediate notification when task is created
        if self.assigned_to:
            frappe.sendmail(
                recipients=[self.assigned_to],
                subject=f"New Task Assigned: {self.subject}",
                message=f"""
                    <p><b>Task:</b> {self.subject}</p>
                    <p><b>Due Date:</b> {self.due_date}</p>
                    <p><b>Details:</b> {self.task_detail or ''}</p>
                """,
            )


# -----------------------------
#  PERMISSIONS
# -----------------------------


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


# -----------------------------
#  REMINDER SCHEDULER LOGIC
# -----------------------------


def schedule_job():
    """This will ensure the scheduler event is available"""
    # Nothing dynamic required here, scheduler runs globally
    pass


def process_task_reminders():
    """Triggered hourly (add in hooks.py)"""
    now = now_datetime()

    tasks = frappe.get_all(
        "Task Assignment",
        filters={
            "remind_till": [">=", now],
            "remind_at": ["<=", now],
        },
        fields=[
            "name",
            "subject",
            "assigned_to",
            "remind_at",
            "remind_till",
            "no_of_occurence",
            "last_reminded_at",
        ],
    )

    for task in tasks:
        doc = frappe.get_doc("Task Assignment", task.name)
        if not doc.assigned_to:
            continue

        for row in doc.reminder_interval:
            send_reminder_if_due(doc, row, now)


def send_reminder_if_due(doc, row, now):
    """Check if reminder is due and send notification."""
    if not doc.remind_at or not doc.remind_till:
        return

    start_time = get_datetime(doc.remind_at)
    last_reminded = get_datetime(doc.last_reminded_at) if doc.last_reminded_at else None
    end_time = get_datetime(doc.remind_till)
    interval_type = row.reminder_type
    interval_value = int(row.reminder_value or 1)
    max_occurrence = int(doc.no_of_occurence or 0)

    if now > end_time:
        return

    interval_seconds = get_interval_in_seconds(interval_type, interval_value)
    should_send = False

    if not last_reminded:
        should_send = now >= start_time
    else:
        seconds_since_last = time_diff_in_seconds(now, last_reminded)
        if seconds_since_last >= interval_seconds:
            should_send = True

    if should_send:
        send_reminder(doc)
        doc.db_set("last_reminded_at", now)

        # Track occurrence count
        if max_occurrence:
            reminder_count = (
                frappe.db.get_value("Task Assignment", doc.name, "reminder_count") or 0
            )
            reminder_count = int(reminder_count) + 1
            frappe.db.set_value(
                "Task Assignment", doc.name, "reminder_count", reminder_count
            )
            if reminder_count >= max_occurrence:
                return  # stop further reminders


def send_reminder(doc):
    """Send popup (and optional email) reminder to assigned user."""

    message = f"""
        <p><b>Task Reminder</b></p>
        <p>Task: <b>{doc.subject}</b></p>
        <p>Due Date: {doc.due_date}</p>
    """

    # ✅ Trigger popup in ERPNext Desk for assigned user
    frappe.publish_realtime(
        event="task_reminder_popup",
        message={
            "subject": doc.subject,
            "due_date": str(doc.due_date),
            "task_name": doc.name,
        },
        user=doc.assigned_to,
        after_commit=True,
    )

    # (Optional) also send email
    frappe.sendmail(
        recipients=[doc.assigned_to],
        subject=f"Reminder: {doc.subject}",
        message=message,
    )

    frappe.logger().info(f"Popup reminder sent for {doc.name} to {doc.assigned_to}")


def get_interval_in_seconds(interval_type, value):
    """Convert the reminder interval into seconds."""
    mapping = {
        "Minute": 60,
        "Hour": 3600,
        "Daily": 86400,
        "Week": 604800,
        "Month": 2592000,
        "Year": 31536000,
    }
    return mapping.get(interval_type, 3600) * int(value)
