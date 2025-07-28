frappe.ui.form.on("Task", {
  validate: function (frm) {
    if (frm.doc.status === "Completed") {
      if (
        frm.doc.custom_check_list_count !== 7 &&
        frm.doc.project === "Postgres Migration"
      ) {
        frappe.throw("Please complete all the steps!");
      }
    }
  },

  refresh(frm) {
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
      "Close",
    ]);
    if (frm.doc.project === "Postgres Migration") {
      frm.set_df_property("status", "options", [
        "Open",
        "Working",
        "Completed",
      ]);
    }

    if (
      frappe.user.has_role("Backlog Manager") &&
      frm.doc.custom_allotted_to !== frappe.session.user
    ) {
      if (frappe.session.user === "Administrator") return;
      frm.set_df_property("status", "options", ["Backlog", "Close"]);
      frm.set_value("status", "Backlog");

      frm.set_df_property("custom_allotted_to", "read_only", true);
    } else {
      frm.set_df_property("project", "reqd", true);
    }
  },

  custom__firebird_db_backup: function (frm) {
    updateCheckListCount(frm);
  },
  custom__iis_feature_installation: function (frm) {
    updateCheckListCount(frm);
  },
  custom__mygstcafe_setup_installation: function (frm) {
    updateCheckListCount(frm);
  },
  custom_pg_admin_setup_installation: function (frm) {
    updateCheckListCount(frm);
  },
  custom__software_update: function (frm) {
    updateCheckListCount(frm);
  },
  custom__data_base_restore: function (frm) {
    updateCheckListCount(frm);
  },

  project(frm) {
    if (frm.doc.project === "Postgres Migration") {
      frm.set_df_property("status", "options", [
        "Open",
        "Working",
        "Completed",
      ]);
    }
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
    // setBreadcrumbs(frm);
    if (frm.doc.project === "Postgres Migration") {
      frm.set_df_property("status", "options", [
        "Open",
        "Working",
        "Completed",
      ]);
    }
    applyBreadcrumbs(frm);
    if (frappe.user.has_role("Projects User")) {
      if (frappe.session.user === "Administrator") return;

      // Editable fields
      const editable_fields = [
        "status",
        "completed_on",
        "completed_by",
        "exp_start_date",
        "exp_end_date",
        "progress",
        "expected_time",
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
    } else if (
      frappe.user.has_role("Backlog Manager") &&
      frm.doc.custom_allotted_to === frappe.session.user
    ) {
      if (frappe.session.user === "Administrator") return;

      // Editable fields
      const editable_fields = [
        "status",
        "completed_on",
        "completed_by",
        "exp_start_date",
        "exp_end_date",
        "progress",
        "expected_time",
        "description",
        "custom__firebird_db_backup",
        "custom__iis_feature_installation",
        "custom__mygstcafe_setup_installation",
        "custom_pg_admin_setup_installation",
        "custom__pg_setup_app_installation",
        "custom__software_update",
        "custom__data_base_restore",
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

function applyBreadcrumbs(frm) {
  if (frappe.route_history.length >= 3) {
    if (
      frappe.route_history[frappe.route_history.length - 3][1] ===
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
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: frm.doc.name,
        route: `/app/task/${frm.doc.name}`,
      });
      return;
    } else if (
      frappe.route_history[frappe.route_history.length - 3][1] ===
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
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: frm.doc.name,
        route: `/app/task/${frm.doc.name}`,
      });
      return;
    } else if (
      frappe.route_history[frappe.route_history.length - 3][1] ===
      "PM-Dashboard"
    ) {
      frappe.breadcrumbs.clear();
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Tasks",
        route: "/app/query-report/Task List",
      });
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: frm.doc.name,
        route: `/app/task/${frm.doc.name}`,
      });
      return;
    }
  } else {
    frappe.breadcrumbs.clear();
    frappe.breadcrumbs.set_custom_breadcrumbs({
      label: "Tasks",
      route: "/app/query-report/Task List",
    });
    frappe.breadcrumbs.set_custom_breadcrumbs({
      label: frm.doc.name,
      route: `/app/task/${frm.doc.name}`,
    });
    return;
  }
  frappe.breadcrumbs.clear();
  frappe.breadcrumbs.set_custom_breadcrumbs({
    label: "Tasks",
    route: "/app/query-report/Task List",
  });
  frappe.breadcrumbs.set_custom_breadcrumbs({
    label: frm.doc.name,
    route: `/app/task/${frm.doc.name}`,
  });
}

function updateCheckListCount(frm) {
  let total = 0;
  const fields = [
    "custom__firebird_db_backup",
    "custom__iis_feature_installation",
    "custom__mygstcafe_setup_installation",
    "custom_pg_admin_setup_installation",
    "custom__pg_setup_app_installation",
    "custom__software_update",
    "custom__data_base_restore",
  ];

  fields.forEach((field) => {
    if (frm.doc[field]) {
      total++;
    }
  });

  frm.set_value("custom_check_list_count", total);
}
