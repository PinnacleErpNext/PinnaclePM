frappe.ui.form.on("Task", {
  onload(frm) {
    applyBreadcrumbs(frm);
    applyRolePermissions(frm);
    setTaskStatusOptions(frm);
  },

  refresh(frm) {
    setTaskStatusOptions(frm);
  },

  project(frm) {
    setTaskStatusOptions(frm);
    setModuleFilter(frm);
  },
  custom_allotted_to(frm) {
    frm.set_value("status", "Working");
  },
  exp_end_date(frm) {
    frm.set_value("status", "Working");
  },
});

function applyBreadcrumbs(frm) {
  const history = frappe.route_history;

  frappe.breadcrumbs.clear();

  if (history.length >= 3) {
    const previous_route = history[history.length - 3][1];

    if (previous_route === "Project List") {
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Project",
        route: "/app/query-report/Project List",
      });
    }

    if (previous_route === "Modules List") {
      frappe.breadcrumbs.set_custom_breadcrumbs({
        label: "Modules",
        route: "/app/query-report/Modules List",
      });
    }
  }

  frappe.breadcrumbs.set_custom_breadcrumbs({
    label: "Tasks",
    route: "/app/query-report/Task List",
  });

  frappe.breadcrumbs.set_custom_breadcrumbs({
    label: frm.doc.name,
    route: `/app/task/${frm.doc.name}`,
  });
}

function setTaskStatusOptions(frm) {
  let status_options = [];

  const is_admin = frappe.session.user === "Administrator" || false;
  const is_project_manager = frappe.user.has_role("Projects Manager") || false;
  const is_project_user = frappe.user.has_role("Projects User") || false;
  const is_backlog_manager = frappe.user.has_role("Backlog Manager") || false;
  console.log("User Roles:", {
    Admin: is_admin,
    "Projects Manager": is_project_manager,
    "Projects User": is_project_user,
    "Backlog Manager": is_backlog_manager,
  });
  // ------------------------------------------------
  // 1️⃣ Project Specific Logic (Highest Priority)
  // ------------------------------------------------
  if (frm.doc.project === "Postgres Migration") {
    status_options = ["Open", "Working", "Completed", "Renewal Pending"];
  }

  // ------------------------------------------------
  // 2️⃣ Administrator
  // ------------------------------------------------
  else if (is_admin) {
    status_options = [
      "Backlog",
      "Open",
      "Working",
      "Can't Reproduce",
      "Overdue",
      "Pending Review",
      "Completed",
      "Close",
    ];
  }

  // ------------------------------------------------
  // 3️⃣ Project Manager
  // ------------------------------------------------
  else if (is_project_manager) {
    status_options = [
      "Backlog",
      "Open",
      "Working",
      "Can't Reproduce",
      "Pending Review",
      "Completed",
      "Close",
    ];
  }
  // ------------------------------------------------
  // 4️⃣ Projects User
  // ------------------------------------------------
  else if (is_project_user) {
    // allow current status also (scheduler safety)
    status_options = [frm.doc.status, "Pending Review"].filter(Boolean);
  }

  // ------------------------------------------------
  // 5️⃣ Backlog Manager
  // ------------------------------------------------
  else if (is_backlog_manager) {
    status_options = ["Backlog", "Close"];
  }

  if (!status_options.includes(frm.doc.status)) {
    status_options.push(frm.doc.status);
  }
  // ------------------------------------------------
  // Apply Options
  // ------------------------------------------------
  frm.set_df_property("status", "options", status_options);

  // ------------------------------------------------
  // Safety Check
  // ------------------------------------------------
  // if (frm.doc.status && !status_options.includes(frm.doc.status)) {
  //   frm.set_value("status", status_options[0]);
  // }
}

function applyRolePermissions(frm) {
  const is_admin = frappe.session.user === "Administrator";

  if (is_admin) return;

  let editable_fields = [];

  if (frappe.user.has_role("Projects User")) {
    editable_fields = ["status", "custom_overdue_reason", "progress"];
  } else if (
    frappe.user.has_role("Backlog Manager") &&
    frm.doc.custom_allotted_to === frappe.session.user
  ) {
    editable_fields = [
      "status",
      "completed_on",
      "completed_by",
      "exp_start_date",
      "exp_end_date",
      "progress",
      "expected_time",
      "description",
      "custom_allotted_to",
      "custom_overdue_reason",
    ];
  } else if (frappe.user.has_role("Projects Manager")) {
    editable_fields = [
      "subject",
      "status",
      "project",
      "custom_module",
      "priority",
      "custom_category",
      "custom_assigned_to",
      "custom_allotted_to",
      "type",
      "custom_tag",
      "exp_start_date",
      "exp_end_date",
      "description",
      "custom_followers",
      "is_group",
      "completed_on",
      "completed_by",
      "review_date",
      "closing_date",
      "actual_time",
      "custom_overdue_reason",
      "progress",
    ];
  }

  Object.keys(frm.fields_dict).forEach((fieldname) => {
    let field = frm.fields_dict[fieldname];

    if (!field.df || field.df.fieldtype === "Section Break") return;

    frm.set_df_property(
      fieldname,
      "read_only",
      editable_fields.includes(fieldname) ? 0 : 1,
    );
  });
}

function setModuleFilter(frm) {
  if (!frm.doc.project) return;

  frappe.db
    .get_list("Modules", {
      fields: ["module_name"],
      filters: { project: frm.doc.project },
    })
    .then((records) => {
      if (records.length > 0) {
        if (!frappe.user.has_role("Backlog Manager")) {
          frm.set_df_property("custom_module", "reqd", true);
        }
      }
    });

  frm.set_query("custom_module", () => {
    return {
      filters: {
        project: frm.doc.project,
      },
    };
  });
}
