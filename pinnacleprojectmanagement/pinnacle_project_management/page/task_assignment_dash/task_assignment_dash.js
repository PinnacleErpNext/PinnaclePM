frappe.pages["task-assignment-dash"].on_page_load = function (wrapper) {
  // Create the page
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Task Assignment Dashboard",
    single_column: true,
  });

  // ---------- Full Dashboard HTML ----------
  const dashboard_html = `
		<div id="task-tabs" class="mb-3">
			<ul class="nav nav-tabs">
				<li class="nav-item">
					<a class="nav-link active" data-tab="my-tasks" href="#">My Tasks</a>
				</li>
				<li class="nav-item">
					<a class="nav-link" data-tab="allotted-tasks" href="#">Tasks I've Allotted</a>
				</li>
			</ul>
		</div>

		<!-- My Tasks -->
		<div id="my-tasks">
			<div id="my-task-cards" class="mb-3"></div>
			<div id="my-task-list" class="mt-3"></div>
		</div>

		<!-- Tasks I've Allotted -->
		<div id="allotted-tasks" style="display:none;">
			<div id="allotted-task-cards" class="mb-3"></div>
			<div id="allotted-task-list" class="mt-3"></div>
		</div>
	`;

  $(page.body).html(dashboard_html);

  // DOM references
  const $tabs = $(page.body).find("#task-tabs");
  const $myTasks = $(page.body).find("#my-tasks");
  const $allottedTasks = $(page.body).find("#allotted-tasks");

  // ---------- Helper: Render Cards ----------
  function render_cards(parent, stats) {
    parent.empty();
    const cards = [
      {
        title: "Overdue Tasks",
        count: stats.overdue,
        color: "bg-danger text-white",
      },
      { title: "Due Today", count: stats.today, color: "bg-warning text-dark" },
      {
        title: "Due Tomorrow",
        count: stats.tomorrow,
        color: "bg-info text-white",
      },
      {
        title: "Total Pending",
        count: stats.pending,
        color: "bg-secondary text-white",
      },
    ];

    const row = $('<div class="row g-3"></div>');
    cards.forEach((c) => {
      row.append(`
				<div class="col-md-3 col-sm-6">
					<div class="card ${c.color}" style="border-radius: 12px;">
						<div class="card-body text-center">
							<h4 class="fw-bold mb-1">${c.count}</h4>
							<div>${c.title}</div>
						</div>
					</div>
				</div>
			`);
    });
    parent.append(row);
  }

  // ---------- Helper: Render Task List ----------
  function render_task_list(parent, tasks, type = "my") {
    parent.empty();

    if (!tasks || tasks.length === 0) {
      parent.append(
        '<div class="text-muted text-center mt-4">No tasks found.</div>'
      );
      return;
    }

    tasks.forEach((t) => {
      const due_date = t.due_date
        ? frappe.datetime.str_to_user(t.due_date)
        : "No Due Date";
      const assigned_text =
        type === "my"
          ? `<div class="text-secondary small mt-1">Assigned by: ${
              t.owner || "-"
            }</div>`
          : `<div class="text-secondary small mt-1">Assigned to: ${
              t.assigned_to || "-"
            }</div>`;

      const task_card = `
				<div class="card mb-2 shadow-sm" style="border-radius: 10px;">
					<div class="card-body">
						<div class="d-flex justify-content-between align-items-start">
							<div>
								<div class="fw-bold">${frappe.utils.escape_html(
                  t.subject || "(No Subject)"
                )}</div>
								<div class="text-muted small">${frappe.utils.escape_html(
                  t.task_detail || "No details provided."
                )}</div>
								${assigned_text}
							</div>
							<div class="text-end small">
								<span class="badge bg-light text-dark border">${due_date}</span>
							</div>
						</div>
					</div>
				</div>
			`;
      parent.append(task_card);
    });
  }

  // ---------- Load My Tasks ----------
  function load_my_tasks() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Task Assignment",
        filters: { assigned_to: frappe.session.user },
        fields: ["name", "subject", "task_detail", "due_date", "owner"],
      },
      callback: function (r) {
        const data = r.message || [];

        const stats = {
          overdue: data.filter(
            (d) =>
              d.due_date &&
              frappe.datetime.get_diff(frappe.datetime.nowdate(), d.due_date) >
                0
          ).length,
          today: data.filter((d) => d.due_date === frappe.datetime.nowdate())
            .length,
          tomorrow: data.filter(
            (d) =>
              frappe.datetime.get_diff(
                d.due_date,
                frappe.datetime.nowdate()
              ) === -1
          ).length,
          pending: data.length,
        };

        render_cards($("#my-task-cards"), stats);
        render_task_list($("#my-task-list"), data, "my");
      },
    });
  }

  // ---------- Load Allotted Tasks ----------
  function load_allotted_tasks() {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Task Assignment",
        filters: { owner: frappe.session.user },
        fields: ["name", "subject", "task_detail", "due_date", "assigned_to"],
      },
      callback: function (r) {
        const data = r.message || [];

        const stats = {
          overdue: data.filter(
            (d) =>
              d.due_date &&
              frappe.datetime.get_diff(frappe.datetime.nowdate(), d.due_date) >
                0
          ).length,
          today: data.filter((d) => d.due_date === frappe.datetime.nowdate())
            .length,
          tomorrow: data.filter(
            (d) =>
              frappe.datetime.get_diff(
                d.due_date,
                frappe.datetime.nowdate()
              ) === -1
          ).length,
          pending: data.length,
        };

        render_cards($("#allotted-task-cards"), stats);
        render_task_list($("#allotted-task-list"), data, "allotted");
      },
    });
  }

  // ---------- Tab Switching ----------
  $tabs.on("click", ".nav-link", function (e) {
    e.preventDefault();
    const tab = $(this).data("tab");

    $tabs.find(".nav-link").removeClass("active");
    $(this).addClass("active");

    if (tab === "my-tasks") {
      $allottedTasks.hide();
      $myTasks.show();
      load_my_tasks();
    } else {
      $myTasks.hide();
      $allottedTasks.show();
      load_allotted_tasks();
    }
  });

  // ---------- Initial Load ----------
  load_my_tasks();
};
