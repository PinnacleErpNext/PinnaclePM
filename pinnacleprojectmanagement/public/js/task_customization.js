frappe.ui.form.on("Task", {
  refresh(frm) {
    setBreadcrumbs(frm);

    // Set status options
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
      if (frappe.session.user === "Administrator") return;
      if (frm.is_new()) {
        frm.set_value("status", "Backlog");
      }

      // Make fields read-only
      frm.set_df_property("status", "read_only", true);
      frm.set_df_property("custom_allotted_to", "read_only", true);
    } else {
      frm.set_df_property("project", "reqd", true);
    }
  },

  project(frm) {
    frappe.db
      .get_list("Modules", {
        fields: ["module_name"],
        filters: { project: frm.doc.project },
      })
      .then((records) => {
        if (records.length > 0) {
          if (frappe.user.has_role("Backlog Manager")) return;
          frm.set_df_property("custom_module", "reqd", true);
        }
      });

    frm.set_query("custom_module", function () {
      return { filters: { project: frm.doc.project } };
    });
  },

  onload(frm) {
    setBreadcrumbs(frm);

    if (frappe.user.has_role("Projects User")) {
      if (frappe.session.user === "Administrator") return;

      // Editable fields
      const editable_fields = [
        "status",
        "completed_on",
        "completed_by",
        "exp_start_date",
        "exp_end_date",
      ];

      Object.keys(frm.fields_dict).forEach((fieldname) => {
        let field = frm.fields_dict[fieldname];
        if (
          field.df.fieldtype !== "Section Break" &&
          !editable_fields.includes(fieldname)
        ) {
          frm.set_df_property(fieldname, "read_only", 1);
        }
      });

      frm.refresh();
    }
  },

  custom_allotted_to(frm) {
    frm.set_value("status", "Open");
  },

  exp_end_date(frm) {
    frm.set_value("status", "Working");
  },
});
