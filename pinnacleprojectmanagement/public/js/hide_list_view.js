frappe.router.on("change", function () {
  hideListView();
});

// Function to show alert or handle other logic
function hideListView() {
  const route = frappe.get_route();

  console.log("Current Route:", route);

  if (route && route[0] === "List" && route[1] === "Task") {
    if (!frappe.user.has_role("System Manager")) {
      frappe.set_route("query-report", "Task List");
    }
  } else if (route && route[0] === "List" && route[1] === "Project") {
    if (!frappe.user.has_role("System Manager")) {
      frappe.set_route("query-report", "Project List");
    }
  } else if (route && route[0] === "List" && route[1] === "Modules") {
    if (!frappe.user.has_role("System Manager")) {
      frappe.set_route("query-report", "Modules List");
    }
  }
}
