// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt
frappe.provide("pinnacleprojectmanagement.public.js.task_customization");
frappe.query_reports["Modules List"] = {
  filters: [
    {
      fieldname: "module",
      label: __("Module"),
      fieldtype: "Link",
      options: "Modules",
    },
    {
      fieldname: "project",
      label: __("Project"),
      fieldtype: "Link",
      options: "Project",
    },
  ],

  formatter: function (value, row, column, data, default_formatter) {
    if (!data) return value;

    // Make "Project" column clickable
    if (column.fieldname === "project") {
      return `<a href="/app/query-report/Task List?project=${data.project}">${value}</a>`;
    }

    // Make "Module" column clickable
    if (column.fieldname === "module_name") {
      let module_name = `${data.module_name}-${data.project}`;
      return `<a href="/app/query-report/Task List?module=${module_name}&project=${data.project}">${value}</a>`;
    }

    // Add "Add Task" link
    if (column.fieldname === "add_task") {
      let module_name = `${data.module_name}-${data.project}`;
      return `<a href="/app/task/new?project=${data.project}&custom_module=${module_name}">
				Add Task
				</a>`;
    }

    return default_formatter(value, row, column, data);
  },

  onload: function (report) {
    setBreadcrumbs();
    if (frappe.user.has_role(["Projects Manager", "System Manager"])) {
      report.page.add_inner_button(__("Add Module"), function () {
        frappe.new_doc("Modules"); // Open the Task form
      });
    }
  },
};
