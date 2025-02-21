frappe.listview_settings["Modules"] = {
  refresh: function (listview) {
    if (frappe.user.has_role("Projects Manager")) {
      listview.page.add_inner_button("Add Task", function () {
        frappe.new_doc("Task");
      });
    }
  },
};
