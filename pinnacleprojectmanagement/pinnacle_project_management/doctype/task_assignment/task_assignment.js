// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Task Assignment", {
  refresh(frm) {},
});
frappe.realtime.on("show_reminder_popup", (data) => {
  frappe.show_alert({
    message: `
      <b>${data.title}</b><br>
      Task: ${data.task_name}<br>
      ${data.description || ""}
    `,
    indicator: "orange",
  });

  frappe.msgprint({
    title: data.title,
    message: `
      <div>
        <strong>Task:</strong> ${data.task_name}<br>
        <strong>Description:</strong> ${data.description || ""}<br>
        <strong>Due:</strong> ${data.due_date || "N/A"}
      </div>
    `,
    indicator: "orange",
    wide: true,
  });
});
