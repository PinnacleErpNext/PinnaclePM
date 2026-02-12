# Copyright (c) 2025, OTPL and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime, time_diff_in_seconds
from datetime import datetime, time


class WorkAssignment(Document):
    def before_save(self):
        # You can schedule or validate reminders here if needed
        schedule_job()

    def after_insert(self):
        # Optional: send immediate notification when task is created
        if self.assigned_to:
            user_email = frappe.db.get_value("User", self.assigned_to, "email")
            if user_email:
                frappe.sendmail(
                    recipients=[user_email],
                    subject=f"New Work Assigned: {self.subject}",
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

    if "Administrator" == user:
        return ""

    return """(`tabWork Assignment`.assigned_by = '{user}' 
               OR `tabWork Assignment`.`assigned_to` = '{user}')""".format(
        user=user
    )


def has_permission(doc, user=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return True
    if doc.assigned_by == user:
        return True
    if doc.assigned_to == user:
        return True

    return False


# -----------------------------
#  REMINDER SCHEDULER LOGIC
# -----------------------------


def schedule_job():
    """This will ensure the scheduler event is available"""
    # Nothing to register dynamically here because we already define scheduler in hooks.py
    pass


def to_datetime(value):
    """Convert value to datetime safely"""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return get_datetime(value)
    except Exception:
        return None


def test_cron():
    frappe.logger().info("Cron job is running - test_cron()")
    print(f"Cron job is running at {datetime.now()} - test_cron()")


def process_task_reminders():
    """Triggered by scheduler every minute"""
    now = now_datetime()

    tasks = frappe.get_all(
        "Work Assignment",
        filters={
            "remind_till": [">=", now],
            "remind_date": ["<=", now],
            "pause_reminder": 0,
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
    frappe.logger().info(f"Processing {len(tasks)} task reminders at {now}")
    for task in tasks:
        doc = frappe.get_doc("Work Assignment", task.name)
        if not doc.assigned_to:
            continue

        for row in doc.reminder_interval:
            send_reminder_if_due(doc, row, now)


def send_reminder_if_due(doc, row, now):
    """Check if reminder should be sent and trigger popup + email"""
    # --- Get reminder date/time ---
    reminder_date = to_datetime(doc.remind_date) or to_datetime(doc.remind_till)
    remind_time_str = str(doc.remind_time) if doc.remind_time else "00:00:00"

    try:
        hour, minute, second = map(int, remind_time_str.split(":"))
        remind_time = time(hour, minute, second)
        start_time = datetime.combine(reminder_date.date(), remind_time)
    except Exception as e:
        frappe.logger().error(
            f"[Reminder Debug] Failed to parse remind_time for {doc.name}: {e}"
        )
        start_time = reminder_date  # fallback

    # --- End time logic ---
    end_time = to_datetime(doc.remind_till) or reminder_date

    # --- Stop if end_time already passed ---
    if end_time and now > end_time:
        frappe.logger().info(
            f"[Reminder Debug] Task {doc.name} skipped - due date passed."
        )
        return

    last_reminded = to_datetime(doc.last_reminded_at) if doc.last_reminded_at else None
    interval_type = row.reminder_type
    interval_value = int(row.reminder_value or 1)
    interval_seconds = get_interval_in_seconds(interval_type, interval_value)
    max_occurrence = int(doc.no_of_occurence or 0)

    should_send = False

    # --- Determine whether to send ---
    if not last_reminded:
        should_send = now >= start_time
    else:
        seconds_since_last = time_diff_in_seconds(now, last_reminded)
        should_send = seconds_since_last >= interval_seconds

    frappe.logger().info(
        f"[Reminder Debug] Task={doc.name}, now={now}, start={start_time}, "
        f"last={last_reminded}, interval={interval_seconds}, send={should_send}"
    )

    if should_send:
        trigger_popup_and_email(doc)
        doc.db_set("last_reminded_at", now)

        if max_occurrence:
            reminder_count = (
                frappe.db.get_value("Work Assignment", doc.name, "reminder_count") or 0
            )
            reminder_count = int(reminder_count) + 1
            frappe.db.set_value(
                "Work Assignment", doc.name, "reminder_count", reminder_count
            )

            if reminder_count >= max_occurrence:
                frappe.logger().info(
                    f"[Reminder Debug] Max occurrence reached for {doc.name}"
                )


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


def trigger_popup_and_email(doc):
    """Send popup + email to assigned user globally in ERP"""
    user = doc.assigned_to
    message = f"⏰ Reminder: Task <b>{doc.subject}</b> is due soon!"
    print(f"Sending reminder for task {doc.name} to user {user}")
    # ✅ Real-time popup
    if user:
        print(f"Publishing to user: {user}")
        frappe.publish_realtime(
            event="task_reminder_popup",
            message={"title": "Task Reminder", "message": message, "task": doc.name},
            user=user,
        )

    # ✅ Email
    if user:
        user_email = frappe.db.get_value("User", user, "email")
        if user_email:
            frappe.sendmail(
                recipients=[user_email],
                subject="Task Reminder",
                message=frappe.render_template(
                    """
                    <p>Hello,</p>
                    <p>This is a reminder for the task: <b>{{ subject }}</b>.</p>
                    <p>Reminder Time: {{ reminder_time }}</p>
                    <p>Regards,<br>ERP System</p>
                    """,
                    {"subject": doc.subject, "reminder_time": doc.remind_at},
                ),
            )
