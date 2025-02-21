// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt
frappe.provide("pinnacleprojectmanagement.public.js.task_customization");
frappe.query_reports["Project List"] = {
  filters: [
    {
      fieldname: "project",
      label: __("Project"),
      fieldtype: "Link",
      options: "Project",
    },
    {
      fieldname: "category",
      label: __("Category"),
      fieldtype: "Link",
      options: "Category",
    },
  ],
  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname == "project_name" && data) {
      value = `<a href="/app/query-report/Task List?project=${data.project_name}">${value}</a>`;
    }
    value = default_formatter(value, row, column, data);

    if (column.fieldname === "edit" && data) {
      return `<div style="text-align: left;">
					<a href="/app/project/${data.project_name}"
					   style="color: blue; ">
					   Edit
					</a>
				</div>`;
    }

    if (column.fieldname === "add_task" && data) {
      return `<div style="text-align: left;">
					<a href="/app/task/new?project=${encodeURIComponent(data.project_name)}"
					   style="color: blue;">
					   Add Task
					</a>
				</div>`;
    }

    return value;
  },
  onload: function (report) {
    setBreadcrumbs();
    if (frappe.user.has_role(["System Manager"])) {
      report.page.add_inner_button(__("Add Project"), function () {
        frappe.new_doc("Task"); // Open the Task form
      });
    }
  },
};
