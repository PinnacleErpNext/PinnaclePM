console.log("Triggered!");

frappe.realtime.on("task_reminder_popup", (data) => {
  frappe.show_alert({
    message: `${data.message}`,
    indicator: "orange",
  });

  frappe.msgprint({
    title: data.title || "Task Reminder",
    message: data.message,
    indicator: "orange",
    wide: true,
  });
});
