frappe.pages["task-assignment-dash"].on_page_load = function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Task Assignment Dashboard",
    single_column: true,
  });

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
      <div id="my-task-filters" class="mb-3">
        <div class="row g-3">
          <div class="col-md-4" id="my-filter-task"></div>
          <div class="col-md-4" id="my-filter-assigned-by"></div>
          <div class="col-md-4" id="my-filter-assigned-to"></div>
        </div>
      </div>

			<div id="my-task-cards" class="mb-3"></div>
			<div id="my-task-list" class="mt-3"></div>
		</div>

		<!-- Tasks I've Allotted -->
		<div id="allotted-tasks" style="display:none;">
      <div id="allotted-task-filters" class="mb-3">
        <div class="row g-3">
          <div class="col-md-4" id="allotted-filter-task"></div>
          <div class="col-md-4" id="allotted-filter-assigned-by"></div>
          <div class="col-md-4" id="allotted-filter-assigned-to"></div>
        </div>
      </div>

			<div id="allotted-task-cards" class="mb-3"></div>
			<div id="allotted-task-list" class="mt-3"></div>
		</div>
	`;

  $(page.body).html(dashboard_html);

  const $tabs = $("#task-tabs");
  const $myTasks = $("#my-tasks");
  const $allottedTasks = $("#allotted-tasks");

  // ----------------- Frappe Controls -----------------

  const my_task_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-task"),
    df: {
      fieldtype: "Link",
      options: "Task Assignment",
      label: "Task Assignment",
    },
    render_input: true,
  });

  const my_assigned_by_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-assigned-by"),
    df: {
      fieldtype: "Link",
      options: "User",
      label: "Assigned By",
    },
    render_input: true,
  });

  const my_assigned_to_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-assigned-to"),
    df: {
      fieldtype: "Link",
      options: "User",
      label: "Assigned To",
    },
    render_input: true,
  });

  const allotted_task_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-task"),
    df: {
      fieldtype: "Link",
      options: "Task Assignment",
      label: "Task Assignment",
    },
    render_input: true,
  });

  const allotted_assigned_by_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-assigned-by"),
    df: {
      fieldtype: "Link",
      options: "User",
      label: "Assigned By",
    },
    render_input: true,
  });

  const allotted_assigned_to_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-assigned-to"),
    df: {
      fieldtype: "Link",
      options: "User",
      label: "Assigned To",
    },
    render_input: true,
  });

  // Auto-refresh binding (correct Frappe-safe method)
  function bind_filter(ctrl, handler) {
    ctrl.$input.on("input", handler);
    ctrl.$input.on("change", handler);
    ctrl.df.onchange = handler;
  }

  bind_filter(my_task_ctrl, load_my_tasks);
  bind_filter(my_assigned_by_ctrl, load_my_tasks);
  bind_filter(my_assigned_to_ctrl, load_my_tasks);

  bind_filter(allotted_task_ctrl, load_allotted_tasks);
  bind_filter(allotted_assigned_by_ctrl, load_allotted_tasks);
  bind_filter(allotted_assigned_to_ctrl, load_allotted_tasks);

  // ----------------- Helper Functions -----------------

  function compute_stats(data) {
    return {
      overdue: data.filter(
        (d) =>
          d.exp_end_date &&
          frappe.datetime.get_diff(frappe.datetime.nowdate(), d.exp_end_date) >
            0
      ).length,
      today: data.filter((d) => d.exp_end_date === frappe.datetime.nowdate())
        .length,
      tomorrow: data.filter(
        (d) =>
          d.exp_end_date &&
          frappe.datetime.get_diff(
            d.exp_end_date,
            frappe.datetime.nowdate()
          ) === 1
      ).length,
      pending: data.length,
    };
  }

  function render_cards(parent, stats) {
    parent.empty();
    const row = $('<div class="row g-3"></div>');

    [
      { t: "Overdue Tasks", c: stats.overdue, col: "bg-danger text-white" },
      { t: "Due Today", c: stats.today, col: "bg-warning text-dark" },
      { t: "Due Tomorrow", c: stats.tomorrow, col: "bg-info text-white" },
      { t: "Total Pending", c: stats.pending, col: "bg-secondary text-white" },
    ].forEach((x) => {
      row.append(`
        <div class="col-md-3 col-sm-6">
          <div class="card ${x.col}">
            <div class="card-body text-center">
              <h4 class="fw-bold">${x.c}</h4>
              <div>${x.t}</div>
            </div>
          </div>
        </div>
      `);
    });

    parent.append(row);
  }

  function render_task_list(parent, tasks, type) {
    parent.empty();

    if (!tasks.length) {
      parent.append(
        '<div class="text-muted text-center mt-4">No tasks found.</div>'
      );
      return;
    }

    tasks.forEach((t) => {
      const due = t.exp_end_date
        ? frappe.datetime.str_to_user(t.exp_end_date)
        : "No Due Date";

      const card = $(`
        <div class="card mb-2 shadow-sm" style="cursor:pointer;">
          <div class="card-body">
            <div class="fw-bold">${t.subject || "(No Subject)"}</div>
            <div class="text-muted small">${
              t.description || "No details."
            }</div>
            ${
              type === "my"
                ? `<div class="small mt-1 text-secondary">Assigned By: ${t.assigned_by}</div>`
                : `<div class="small mt-1 text-secondary">Assigned To: ${t.assigned_to}</div>`
            }
            <div class="text-end small mt-2">
              <span class="badge bg-light border">${due}</span>
            </div>
          </div>
        </div>
      `);

      // 👉 Open Task Assignment in NEW TAB
      card.on("click", function () {
        window.open(`/app/task-assignment/${t.name}`, "_blank");
      });

      parent.append(card);
    });
  }

  // ----------------- Filters -----------------

  function get_my_filters() {
    return {
      task: my_task_ctrl.get_value(),
      assigned_by: my_assigned_by_ctrl.get_value(),
      assigned_to: my_assigned_to_ctrl.get_value(),
    };
  }

  function get_allotted_filters() {
    return {
      task: allotted_task_ctrl.get_value(),
      assigned_by: allotted_assigned_by_ctrl.get_value(),
      assigned_to: allotted_assigned_to_ctrl.get_value(),
    };
  }

  // ----------------- Load My Tasks -----------------

  function load_my_tasks() {
    const f = get_my_filters();

    let filters = {
      assigned_to: frappe.session.user,
      status: ["!=", "Completed"],
    };

    if (f.task) filters["name"] = f.task;
    if (f.assigned_by) filters["owner"] = f.assigned_by;
    if (f.assigned_to) filters["assigned_to"] = f.assigned_to;

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Task Assignment",
        filters,
        fields: [
          "name",
          "subject",
          "task_detail as description",
          "due_date as exp_end_date",
          "owner as assigned_by",
          "assigned_to",
        ],
      },
      callback: (r) => {
        const data = r.message;
        render_cards($("#my-task-cards"), compute_stats(data));
        render_task_list($("#my-task-list"), data, "my");
      },
    });
  }

  // ----------------- Load Allotted Tasks -----------------

  function load_allotted_tasks() {
    const f = get_allotted_filters();

    let filters = {
      owner: frappe.session.user,
      status: ["!=", "Completed"],
    };

    if (f.task) filters["name"] = f.task;
    if (f.assigned_to) filters["assigned_to"] = f.assigned_to;

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Task Assignment",
        filters,
        fields: [
          "name",
          "subject",
          "task_detail as description",
          "due_date as exp_end_date",
          "assigned_to",
          "owner as assigned_by",
        ],
      },
      callback: (r) => {
        const data = r.message;
        render_cards($("#allotted-task-cards"), compute_stats(data));
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

      // Assigned To = current user (LOCKED)
      my_assigned_to_ctrl.set_value(frappe.session.user);
      my_assigned_to_ctrl.df.read_only = 1;
      my_assigned_to_ctrl.refresh();

      // --- SET QUERY: Only tasks assigned to ME ---
      my_task_ctrl.df.get_query = function () {
        return {
          filters: {
            assigned_to: frappe.session.user,
          },
        };
      };
      my_task_ctrl.refresh();

      load_my_tasks();
    } else {
      $myTasks.hide();
      $allottedTasks.show();

      // Assigned By = current user (LOCKED)
      allotted_assigned_by_ctrl.set_value(frappe.session.user);
      allotted_assigned_by_ctrl.df.read_only = 1;
      allotted_assigned_by_ctrl.refresh();

      // --- SET QUERY: Only tasks I have allotted ---
      allotted_task_ctrl.df.get_query = function () {
        return {
          filters: {
            owner: frappe.session.user,
          },
        };
      };
      allotted_task_ctrl.refresh();

      load_allotted_tasks();
    }
  });

  // ---------- Initial Load (Apply same logic as tab = My Tasks) ----------
  my_assigned_to_ctrl.set_value(frappe.session.user);
  my_assigned_to_ctrl.df.read_only = 1;
  my_assigned_to_ctrl.refresh();

  my_task_ctrl.df.get_query = function () {
    return {
      filters: {
        assigned_to: frappe.session.user,
      },
    };
  };
  my_task_ctrl.refresh();

  load_my_tasks();
};
