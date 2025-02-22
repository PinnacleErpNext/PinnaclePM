// Override AssignToDialog for "Task" DocType
frappe.provide("pinnacleprojectmanagement.public.js.task_customization");
frappe.ui.form.AssignToDialog = class CustomAssignToDialog extends (
  frappe.ui.form.AssignToDialog
) {
  constructor(opts) {
    // Check if the DocType matches the one you want to override
    if (opts.frm.doctype === "Task") {
      console.log("Custom AssignTo Dialog for Task");
    }
    // Call the parent constructor
    super(opts);
  }

  get_fields() {
    let me = this;
    if (frappe.user.has_role("Projects Manager")) {
      return [
        {
          label: __("Assign to me"),
          fieldtype: "Check",
          fieldname: "assign_to_me",
          default: 0,
          onchange: () => me.assign_to_me(),
        },
        {
          label: __("Assign To User Group"),
          fieldtype: "Link",
          fieldname: "assign_to_user_group",
          options: "User Group",
          onchange: () => me.user_group_list(),
        },
        {
          fieldtype: "MultiSelectPills",
          fieldname: "assign_to",
          label: __("Assign To"),
          reqd: true,
          get_data: function (txt) {
            return new Promise((resolve) => {
              frappe.call({
                method: "pinnacleprojectmanagement.api.updateUserList",
                args: {
                  proj: cur_frm.doc.project,
                  search_text: txt, // Optionally pass user input to filter results
                },
                callback: function (response) {
                  // Handle the response
                  let user_list = response.message || {};

                  resolve(
                    Object.entries(user_list).map(([email, name]) => ({
                      value: email,
                      label: `${name} (${email})`,
                    }))
                  );
                },
              });
            });
          },
        },
        {
          fieldtype: "Section Break",
        },
        {
          label: __("Complete By"),
          fieldtype: "Date",
          fieldname: "date",
        },
        {
          fieldtype: "Column Break",
        },
        {
          label: __("Priority"),
          fieldtype: "Select",
          fieldname: "priority",
          options: [
            {
              value: "Low",
              label: __("Low"),
            },
            {
              value: "Medium",
              label: __("Medium"),
            },
            {
              value: "High",
              label: __("High"),
            },
          ],
          // Pick up priority from the source document, if it exists and is available in ToDo
          default: ["Low", "Medium", "High"].includes(
            me.frm && me.frm.doc.priority ? me.frm.doc.priority : "Medium"
          ),
        },
        {
          fieldtype: "Section Break",
        },
        {
          label: __("Comment"),
          fieldtype: "Small Text",
          fieldname: "description",
        },
      ];
    } else {
      frappe.throw("You are not allowed!");
    }
  }
};
frappe.ui.form.on("Task", {
  refresh(frm) {
    setBreadcrumbs(frm);
    // Set custom status options
    frm.set_df_property("status", "options", [
      "Backlog",
      "Open",
      "Working",
      "Pending Review",
      "Overdue",
      "Completed",
      "Cancelled",
      "Can't Reproduce",
    ]);

    if (frappe.user.has_role("Backlog Manager")) {
      if (frappe.session.user === "Administrator") {
        return;
      }
      // Set status to 'Backlog'
      frm.set_value("status", "Backlog");

      // Find an empty row in 'custom_followers'
      let emptyRow = frm.doc.custom_followers.find((row) => !row.user);

      if (emptyRow) {
        // Set the current user in an empty row
        frappe.model.set_value(
          emptyRow.doctype,
          emptyRow.name,
          "user",
          frappe.session.user
        );
      } else {
        // If no empty row exists, add a new one
        let new_row = frm.add_child("custom_followers");
        new_row.user = frappe.session.user;
      }

      // Refresh child table and make it read-only
      frm.refresh_field("custom_followers");
      frm.set_df_property("custom_followers", "read_only", true);

      // Make fields read-only
      frm.set_df_property("status", "read_only", true);
    }

    // Set default status properly
    if (!frm.doc.status) {
      frm.set_value("status", "Open");
    }

    // Hide the 'is_template' field
    frm.set_df_property("is_template", "hidden", true);
  },
  project: function (frm) {
    if (frappe.user.has_role("Backlog Manager")) {
      return;
    }
    frm.set_df_property("custom_module", "reqd", false);
    frappe.db
      .get_list("Modules", {
        fields: ["module_name"],
        filters: {
          project: frm.doc.project,
        },
      })
      .then((records) => {
        if (records.length > 0) {
          frm.set_df_property("custom_module", "reqd", true);
        }
      });

    frm.set_query("custom_module", function () {
      return {
        filters: {
          project: frm.doc.project,
        },
      };
    });
  },
  onload: function (frm) {
    setBreadcrumbs(frm);
    if (frappe.user.has_role("Projects User")) {
      if (frappe.session.user === "Administrator") {
        return;
      }
      // List of fields to remain editable
      const editable_fields = ["custom_allotted_to", "status"];

      // Iterate over all fields in the form
      Object.keys(frm.fields_dict).forEach(function (fieldname) {
        if (!editable_fields.includes(fieldname)) {
          frm.set_df_property(fieldname, "read_only", 1);
        }
      });

      // Refresh the form to apply changes
      frm.refresh();
    }
  },
});
