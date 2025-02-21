$(document).on("page-change", function () {
  setBreadcrumbs();
});

function setBreadcrumbs(frm = null) {
  const history = frappe.route_history || [];
  let formattedHistory = [];

  history.forEach((entry) => {
    if (Array.isArray(entry)) {
      if (entry[0] !== "Workspaces") {
        formattedHistory.push(entry[1]);
      } else if (entry.length > 1) {
        formattedHistory = [entry[1]];
      }
    }
  });

  formattedHistory = formattedHistory.join(" > ");
  console.log("Breadcrumb Path:", formattedHistory);

  frappe.breadcrumbs.clear();

  const breadcrumbMappings = {
    "Project Management > Task List": [
      { label: "Task List", route: "/app/query-report/Task List" },
    ],
    "Project Management > Modules List > Task List": [
      { label: "Modules", route: "/app/query-report/Modules List" },
      { label: "Task List", route: "/app/query-report/Task List" },
    ],
    "Project List": [
      { label: "Project List", route: "/app/query-report/Project List" },
    ],
    "Project Management > Project List": [
      { label: "Project List", route: "/app/query-report/Project List" },
    ],
    "Project Management > Project List > Task List": [
      { label: "Project List", route: "/app/query-report/Project List" },
      { label: "Task List", route: "/app/query-report/Task List" },
    ],
    "Project Management > Modules List": [
      { label: "Modules List", route: "/app/query-report/Modules List" },
    ],
    "Modules List": [
      { label: "Modules List", route: "/app/query-report/Modules List" },
    ],
    "Project Management > Modules List > Task List": [
      { label: "Modules List", route: "/app/query-report/Modules List" },
      { label: "Task List", route: "/app/query-report/Task List" },
    ],
    "Project List > Task List": [
      { label: "Project List", route: "/app/query-report/Project List" },
      { label: "Task List", route: "/app/query-report/Task List" },
    ],
    "Task List": [{ label: "Task List", route: "/app/query-report/Task List" }],
  };
  if (frm && frm.doc) {
    breadcrumbMappings["Project Management > Task List > Task"] = [
      { label: "Project List", route: "/app/query-report/Project List" },
      { label: "Task List", route: "/app/query-report/Task List" },
      { label: frm.doc.name, route: `/app/task/${frm.doc.name}` },
    ];
    breadcrumbMappings["Project Management > Modules List > Task List > Task"] =
      [
        { label: "Modules List", route: "/app/query-report/Modules List" },
        { label: "Task List", route: "/app/query-report/Task List" },
        { label: frm.doc.name, route: `/app/task/${frm.doc.name}` },
      ];
    breadcrumbMappings["Project Management > Project List > Task List > Task"] =
      [
        { label: "Project List", route: "/app/query-report/Project List" },
        { label: "Task List", route: "/app/query-report/Task List" },
        { label: frm.doc.name, route: `/app/task/${frm.doc.name}` },
      ];
  }
  frappe.breadcrumbs.clear();
  if (breadcrumbMappings[formattedHistory]) {
    breadcrumbMappings[formattedHistory].forEach((breadcrumb) => {
      frappe.breadcrumbs.set_custom_breadcrumbs(breadcrumb);
    });
  } else {
    frappe.breadcrumbs.set_custom_breadcrumbs({
      label: "Project Management",
      route: "/app/project-management",
    });
  }
}
