// Override AssignToDialog for "Task" DocType
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
              method: "pinnacle.api.updateUserList",
              args: {
                proj: cur_frm.doc.project,
                search_text: txt, // Optionally pass user input to filter results
              },
              callback: function (response) {
                // Handle the response
                let user_list = response.message || []; // Get the list of users
                resolve(
                  user_list.map((user) => ({
                    value: user.user, // `value` is the identifier for the user
                    label: `${user.user}`, // `label` is the display name
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
  }
};

frappe.ui.form.on('Task', {
	refresh(frm) {
	    frm.set_df_property("status","options",['Open','Working','Pending Review','Overdue','Completed','Cancelled',"Can't Reproduce"])
	    frm.set_df_property("is_template","hidden",true)
	}
})