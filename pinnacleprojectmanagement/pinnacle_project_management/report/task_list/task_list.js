// frappe.provide("pinnacleprojectmanagement.public.js.task_customization");

frappe.query_reports["Task List"] = {
  filters: [
    {
      fieldname: "creation",
      label: __("Created At"),
      fieldtype: "Date",
    },
    {
      fieldname: "project",
      label: __("Project"),
      fieldtype: "Link",
      options: "Project",
    },
    {
      fieldname: "modules",
      label: __("Modules"),
      fieldtype: "MultiSelect",
      options: [],
    },
    {
      fieldname: "task",
      label: __("Task"),
      fieldtype: "Link",
      options: "Task",
      get_query: function () {
        let project = frappe.query_report.get_filter_value("project");
        return {
          filters: {
            project: project,
          },
        };
      },
    },
    {
      fieldname: "assigned",
      label: __("Assigned"),
      fieldtype: "Link",
      options: "User",
    },
    {
      fieldname: "allotted",
      label: __("Allotted"),
      fieldtype: "Link",
      options: "User",
    },
    {
      fieldname: "tags",
      label: __("Tag"),
      fieldtype: "Link",
      options: "Tag",
    },
    {
      fieldname: "priority",
      label: __("Priority"),
      fieldtype: "Select",
      options: ["", "Low", "Medium", "High"],
    },
    {
      fieldname: "status",
      label: __("Status"),
      fieldtype: "Select",
      options: [
        "",
        "Backlog",
        "Open",
        "Working",
        "Pending Review",
        "Overdue",
        "Completed",
        "Cancelled",
        "Can't Reproduce",
      ],
    },
    {
      fieldname: "start_date",
      label: __("Start Date"),
      fieldtype: "Date",
    },
    {
      fieldname: "end_date",
      label: __("End Date"),
      fieldtype: "Date",
    },
  ],
  onload: function (report) {
    applyBreadcrumbs();
    let module_filter = report.get_filter("modules");
    let options = [];
    if (module_filter) {
      frappe.db
        .get_list("Modules", {
          fields: ["name"],
        })
        .then((records) => {
          records.forEach((record) => {
            options.push(record.name);
          });
          module_filter.set_data(options);
          module_filter.refresh();
        });
    }
    if (
      frappe.user.has_role("Projects User") &&
      frappe.session.user !== "Administrator"
    ) {
      let allotted_filter = report.get_filter("allotted"); // Get the filter field
      if (allotted_filter) {
        allotted_filter.df.hidden = true; // Make it read-only
        allotted_filter.refresh(); // Refresh the UI to apply the change
      }
      let assigned_filter = report.get_filter("assigned");
      assigned_filter.df.hidden = true;
      assigned_filter.refresh();
    }

    // Show "Add Task" button only for "Projects Manager" and "System Manager"
    if (
      frappe.user.has_role([
        "Projects Manager",
        "System Manager",
        "Backlog Manager",
      ])
    ) {
      report.page.add_inner_button(__("Add Task"), function () {
        frappe.new_doc("Task"); // Open the Task form
      });
    }
  },
};

function applyBreadcrumbs() {
  defaultLabel = "Task";
  defaultRoute = "/app/query-report/Task List";
  if (frappe.route_history.length >= 2) {
    if (
      frappe.route_history[frappe.route_history.length - 2][1] ===
      "Project List"
    ) {
      frappe.breadcrumbs.clear();
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Project",
        route: "/app/query-report/Project List",
      });
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Tasks",
        route: "/app/query-report/Task List",
      });
    } else if (
      frappe.route_history[frappe.route_history.length - 2][1] ===
      "Modules List"
    ) {
      frappe.breadcrumbs.clear();
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Modules",
        route: "/app/query-report/Modules List",
      });
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Tasks",
        route: "/app/query-report/Task List",
      });
    } else if (
      frappe.route_history[frappe.route_history.length - 2][1] ===
      "PM-Dashboard"
    ) {
      frappe.breadcrumbs.clear();
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Tasks",
        route: "/app/query-report/Task List",
      });
    }
  } else {
    frappe.breadcrumbs.clear();
    frappe.breadcrumbs.set_custom_breadcrumbs({
      label: "Tasks",
      route: "/app/query-report/Task List",
    });
  }
}
