// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Task Assignment", {
  refresh(frm) {},
});

frappe.ready(() => {
    // Listen for backend reminder events globally
    frappe.realtime.on("task_reminder_popup", (data) => {
        if (!data) return;

        const title = "⏰ Task Reminder";
        const message = `
            <div style="font-size: 15px;">
                <b>${data.subject}</b><br>
                Due Date: ${frappe.datetime.global_date_format(data.due_date)}
            </div>
        `;

        // Toast popup (top-right, disappears after 8s)
        frappe.show_alert(
            {
                message: message,
                title: title,
                indicator: "orange",
            },
            8
        );

        // Modal dialog for stronger attention
        frappe.msgprint({
            title: title,
            message: `
                <p><b>${data.subject}</b></p>
                <p>Due Date: ${data.due_date}</p>
                <p>Check your Task Assignment for details.</p>
            `,
            indicator: "orange",
        });

        // Optional: play a sound
        const audio = new Audio("/assets/pinnacle_project_management/sounds/reminder.mp3");
        audio.play().catch(() => {});
    });
});
