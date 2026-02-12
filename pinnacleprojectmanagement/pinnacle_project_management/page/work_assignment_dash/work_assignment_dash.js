frappe.pages['work-assignment-dash'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Work Assignment Dashboard',
		single_column: true
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
          <div class="col-md-2" id="my-filter-task"></div>
          <div class="col-md-2" id="my-filter-assigned-by"></div>
          <div class="col-md-2" id="my-filter-assigned-to"></div>
          <div class="col-md-2" id="my-filter-status"></div>
          <div class="col-md-4" id="my-filter-date-range"></div>
        </div>
      </div>

      <div id="my-task-cards" class="mb-3"></div>
      <div id="my-task-list" class="mt-3"></div>
    </div>

    <!-- Tasks I've Allotted -->
    <div id="allotted-tasks" style="display:none;">
      <div id="allotted-task-filters" class="mb-3">
        <div class="row g-3">
          <div class="col-md-2" id="allotted-filter-task"></div>
          <div class="col-md-2" id="allotted-filter-assigned-by"></div>
          <div class="col-md-2" id="allotted-filter-assigned-to"></div>
          <div class="col-md-2" id="allotted-filter-status"></div>
          <div class="col-md-4" id="allotted-filter-date-range"></div>
        </div>
      </div>

      <div id="allotted-task-cards" class="mb-3"></div>
      <div id="allotted-task-list" class="mt-3"></div>
    </div>
  `;

  $(page.body).html(dashboard_html);

  // ---------- Injected CSS ----------
  $("<style>")
    .text(
      `
      /* ----------------------------
         ORIGINAL SUMMARY CARD DESIGN
         ---------------------------- */
      .summary-card {
        border-radius: 10px !important;
        cursor: pointer !important;
        transition: 0.14s ease-in-out;
        opacity: 0.85;
        width: 90%;
        height: 100px !important; /* equal height */
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .summary-card:hover {
        transform: scale(1.01);
        box-shadow: 0px 0px 7px rgba(0, 0, 0, 0);
        opacity: 1;
      }

      .summary-active-card {
        outline: 1px solid #666 !important;
        transform: scale(1.04);
        opacity: 1 !important;
        box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.3);
      }

      .summary-row { 
        display: flex; 
        flex-wrap: wrap; 
      }

      .summary-col { 
        padding: 6px;            /* spacing left-right */
        margin-bottom: 12px;     /* spacing bottom */
        flex: 0 0 20%; 
      }

      @media (max-width:1199px){.summary-col{flex:0 0 25%;}}
      @media (max-width:991px){.summary-col{flex:0 0 33.33%;}}
      @media (max-width:767px){.summary-col{flex:0 0 50%;}}
      @media (max-width:575px){.summary-col{flex:0 0 100%;}}

      /* ----------------------------
         CUSTOM CARD COLORS + BLACK TEXT
         ---------------------------- */

      .summary-card.bg-success {
        background-color: rgb(247, 255, 243) !important; /* Light Green */
        color: #000 !important;
      }

      .summary-card.bg-secondary {
        background-color: rgb(255, 247, 239) !important; /* Light Orange */
        color: #000 !important;
      }

      .summary-card.bg-danger {
        background-color: rgb(255, 246, 246) !important; /* Light Red */
        color: #000 !important;
      }

      .summary-card.bg-warning {
        background-color: rgb(255, 255, 241) !important; /* Light Yellow */
        color: #000 !important;
      }

      .summary-card.bg-info {
        background-color: rgb(245, 249, 255) !important; /* Light Blue */
        color: #000 !important;
      }
`
    )
    .appendTo("head");

  const $tabs = $("#task-tabs");
  const $myTasks = $("#my-tasks");
  const $allottedTasks = $("#allotted-tasks");

  let active_summary_card = { my: "all", allotted: "all" };

  // ----------------- Frappe Controls -----------------

  const my_task_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-task"),
    df: {
      fieldtype: "Link",
      options: "Work Assignment",
      label: "Work Assignment",
    },
    render_input: true,
  });

  const my_assigned_by_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-assigned-by"),
    df: { fieldtype: "Link", options: "User", label: "Assigned By" },
    render_input: true,
  });

  const my_assigned_to_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-assigned-to"),
    df: { fieldtype: "Link", options: "User", label: "Assigned To" },
    render_input: true,
  });

  const my_status_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-status"),
    df: {
      fieldtype: "Select",
      label: "Status",
      options: ["", "Pending", "Completed", "Overdue"].join("\n"),
    },
    render_input: true,
  });

  // THE NEW DATE RANGE FIELD
  const my_date_range_ctrl = frappe.ui.form.make_control({
    parent: $("#my-filter-date-range"),
    df: { fieldtype: "DateRange", label: "Due Date Range" },
    render_input: true,
  });

  // ---------- ALLOTTED ----------
  const allotted_task_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-task"),
    df: {
      fieldtype: "Link",
      options: "Work Assignment",
      label: "Work Assignment",
    },
    render_input: true,
  });

  const allotted_assigned_by_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-assigned-by"),
    df: { fieldtype: "Link", options: "User", label: "Assigned By" },
    render_input: true,
  });

  const allotted_assigned_to_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-assigned-to"),
    df: { fieldtype: "Link", options: "User", label: "Assigned To" },
    render_input: true,
  });

  const allotted_status_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-status"),
    df: {
      fieldtype: "Select",
      label: "Status",
      options: ["", "Pending", "Completed", "Overdue"].join("\n"),
    },
    render_input: true,
  });

  // NEW RANGE PICKER
  const allotted_date_range_ctrl = frappe.ui.form.make_control({
    parent: $("#allotted-filter-date-range"),
    df: { fieldtype: "DateRange", label: "Due Date Range" },
    render_input: true,
  });

  function bind_filter(ctrl, handler) {
    if (ctrl && ctrl.$input) {
      ctrl.$input.on("change", handler);
      ctrl.$input.on("input", handler);
    }
    if (ctrl && ctrl.df) ctrl.df.onchange = handler;
  }

  // MY FILTER BINDS
  [
    my_task_ctrl,
    my_assigned_by_ctrl,
    my_assigned_to_ctrl,
    my_status_ctrl,
    my_date_range_ctrl,
  ].forEach((ctrl) =>
    bind_filter(ctrl, () => {
      active_summary_card.my = "all";
      load_my_tasks();
    })
  );

  // ALLOTTED FILTER BINDS
  [
    allotted_task_ctrl,
    allotted_assigned_by_ctrl,
    allotted_assigned_to_ctrl,
    allotted_status_ctrl,
    allotted_date_range_ctrl,
  ].forEach((ctrl) =>
    bind_filter(ctrl, () => {
      active_summary_card.allotted = "all";
      load_allotted_tasks();
    })
  );

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

  // ----------------- Cards Renderer -----------------

  function render_cards(parent, stats, type) {
    parent.empty();

    const cards = [
      {
        key: "all",
        title: "All Tasks",
        count: stats.pending,
        color: "bg-success text-white",
      },
      {
        key: "pending",
        title: "Pending Tasks",
        count: stats.pending,
        color: "bg-secondary text-white",
      },
      {
        key: "overdue",
        title: "Overdue Tasks",
        count: stats.overdue,
        color: "bg-danger text-white",
      },
      {
        key: "today",
        title: "Due Today",
        count: stats.today,
        color: "bg-warning text-dark",
      },
      {
        key: "tomorrow",
        title: "Due Tomorrow",
        count: stats.tomorrow,
        color: "bg-info text-white",
      },
    ];

    const row = $('<div class="row summary-row g-2"></div>');

    cards.forEach((c) => {
      const is_active =
        active_summary_card[type] === c.key ? "summary-active-card" : "";
      const card = $(`
        <div class="summary-col">
          <div class="card summary-card ${c.color} ${is_active}">
            <div class="card-body text-center">
              <h4 class="fw-bold mb-1">${c.count}</h4>
              <div class="summary-card-title">${c.title}</div>
            </div>
          </div>
        </div>
      `);
      card.on("click", () => {
        active_summary_card[type] = c.key;
        apply_summary_filter(c.key, type);
      });
      row.append(card);
    });

    parent.append(row);
  }

  // ----------------- Summary Filter Logic -----------------

  function apply_summary_filter(key, type) {
    const today = frappe.datetime.nowdate();
    let date_filter = null;

    if (key === "overdue") {
      date_filter = (d) =>
        d.exp_end_date && frappe.datetime.get_diff(today, d.exp_end_date) > 0;
    } else if (key === "today") {
      date_filter = (d) => d.exp_end_date === today;
    } else if (key === "tomorrow") {
      date_filter = (d) =>
        d.exp_end_date && frappe.datetime.get_diff(d.exp_end_date, today) === 1;
    }

    if (type === "my") load_my_tasks(date_filter);
    else load_allotted_tasks(date_filter);
  }

  // ----------------- Task List -----------------

  function render_task_list(parent, tasks, type) {
    parent.empty();
    if (!tasks.length) {
      parent.append(
        `<div class="text-muted text-center mt-4">No tasks found.</div>`
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

      card.on("click", () =>
        window.open(`/app/work-assignment/${t.name}`, "_blank")
      );
      parent.append(card);
    });
  }

  // ----------------- Filters Helpers -----------------

  function get_my_filters() {
    return {
      task: my_task_ctrl.get_value(),
      assigned_by: my_assigned_by_ctrl.get_value(),
      assigned_to: my_assigned_to_ctrl.get_value(),
      status: my_status_ctrl.get_value(),
      date_range: my_date_range_ctrl.get_value(), // array [from, to]
    };
  }

  function get_allotted_filters() {
    return {
      task: allotted_task_ctrl.get_value(),
      assigned_by: allotted_assigned_by_ctrl.get_value(),
      assigned_to: allotted_assigned_to_ctrl.get_value(),
      status: allotted_status_ctrl.get_value(),
      date_range: allotted_date_range_ctrl.get_value(),
    };
  }

  // ----------------- Load Functions -----------------

  function load_my_tasks(date_filter = null) {
    const f = get_my_filters();

    let filters = { assigned_to: frappe.session.user };

    // STATUS FILTER
    if (f.status === "Pending") filters["status"] = ["!=", "Completed"];
    else if (f.status === "Completed") filters["status"] = "Completed";
    else if (f.status === "Overdue")
      filters["due_date"] = ["<", frappe.datetime.nowdate()];
    else filters["status"] = ["!=", "Completed"];

    // DATE RANGE FILTER
    if (f.date_range && f.date_range.length === 2) {
      filters["due_date"] = ["between", f.date_range];
    }

    if (f.task) filters["name"] = f.task;
    if (f.assigned_by) filters["assigned_by"] = f.assigned_by;
    if (f.assigned_to) filters["assigned_to"] = f.assigned_to;

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Work Assignment",
        filters,
        fields: [
          "name",
          "subject",
          "task_detail as description",
          "due_date as exp_end_date",
          "assigned_by",
          "assigned_to",
        ],
        order_by: "due_date asc",
        limit_page_length: 1000,
      },
      callback: (r) => {
        let full_data = r.message || [];
        render_cards($("#my-task-cards"), compute_stats(full_data), "my");

        let filtered = date_filter ? full_data.filter(date_filter) : full_data;
        render_task_list($("#my-task-list"), filtered, "my");
      },
    });
  }

  function load_allotted_tasks(date_filter = null) {
    const f = get_allotted_filters();

    let filters = { assigned_by: frappe.session.user };

    if (f.status === "Pending") filters["status"] = ["!=", "Completed"];
    else if (f.status === "Completed") filters["status"] = "Completed";
    else if (f.status === "Overdue")
      filters["due_date"] = ["<", frappe.datetime.nowdate()];
    else filters["status"] = ["!=", "Completed"];

    if (f.date_range && f.date_range.length === 2) {
      filters["due_date"] = ["between", f.date_range];
    }

    if (f.task) filters["name"] = f.task;
    if (f.assigned_to) filters["assigned_to"] = f.assigned_to;

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Work Assignment",
        filters,
        fields: [
          "name",
          "subject",
          "task_detail as description",
          "due_date as exp_end_date",
          "assigned_by",
          "assigned_to",
        ],
        order_by: "due_date asc",
        limit_page_length: 1000,
      },
      callback: (r) => {
        let full_data = r.message || [];
        render_cards(
          $("#allotted-task-cards"),
          compute_stats(full_data),
          "allotted"
        );

        let filtered = date_filter ? full_data.filter(date_filter) : full_data;
        render_task_list($("#allotted-task-list"), filtered, "allotted");
      },
    });
  }

  // ---------- TAB SWITCHING ----------
  $tabs.on("click", ".nav-link", function (e) {
    e.preventDefault();
    const tab = $(this).data("tab");

    $tabs.find(".nav-link").removeClass("active");
    $(this).addClass("active");

    if (tab === "my-tasks") {
      $allottedTasks.hide();
      $myTasks.show();

      my_assigned_to_ctrl.set_value(frappe.session.user);
      my_assigned_to_ctrl.df.read_only = 1;
      my_assigned_to_ctrl.refresh();
      load_my_tasks();
    } else {
      $myTasks.hide();
      $allottedTasks.show();

      allotted_assigned_by_ctrl.set_value(frappe.session.user);
      allotted_assigned_by_ctrl.df.read_only = 1;
      allotted_assigned_by_ctrl.refresh();
      load_allotted_tasks();
    }
  });

  // ---------- INITIAL LOAD ----------
  my_assigned_to_ctrl.set_value(frappe.session.user);
  my_assigned_to_ctrl.df.read_only = 1;
  my_assigned_to_ctrl.refresh();

  active_summary_card.my = "all";
  load_my_tasks();
};
