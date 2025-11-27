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

  // ---------- Inject new compact & modern card styles ----------
  $("<style>")
    .text(
      `
      /* Summary Card Styling */
      .summary-card {
        border-radius: 10px !important;
        cursor: pointer !important;
        transition: all 0.15s ease-in-out;
      }

      .summary-card:hover {
        transform: scale(1.03);
        box-shadow: 0px 0px 10px rgba(0,0,0,0.18);
      }

      /* Active Card */
      .summary-active-card {
        outline: 3px solid #000 !important;
        box-shadow: 0px 0px 12px rgba(0,0,0,0.30) !important;
        transform: scale(1.04);
      }

      /* Consistent Card Height */
      .summary-card .card-body {
        padding: 15px !important;
        height: 100px !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .summary-card-title {
        margin-top: 3px;
        font-size: 14px;
        font-weight: 500;
      }

      .summary-row > div {
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
        .summary-row {
  display: flex;
  flex-wrap: wrap;
}

.summary-row .summary-col {
  padding: 6px;
  flex: 0 0 20%; /* 5 cards per row on large screens */
}

@media (max-width: 1199px) {
  .summary-row .summary-col {
    flex: 0 0 25%; /* 4 per row */
  }
}

@media (max-width: 991px) {
  .summary-row .summary-col {
    flex: 0 0 33.33%; /* 3 per row */
  }
}

@media (max-width: 767px) {
  .summary-row .summary-col {
    flex: 0 0 50%; /* 2 per row */
  }
}

@media (max-width: 575px) {
  .summary-row .summary-col {
    flex: 0 0 100%; /* 1 per row */
  }
}

    `
    )
    .appendTo("head");

  const $tabs = $("#task-tabs");
  const $myTasks = $("#my-tasks");
  const $allottedTasks = $("#allotted-tasks");

  let active_summary_card = {
    my: "all",
    allotted: "all",
  };

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

  // Bind filters
  function bind_filter(ctrl, handler) {
    ctrl.$input.on("change", handler);
    ctrl.$input.on("input", handler);
    ctrl.df.onchange = handler;
  }

  bind_filter(my_task_ctrl, () => {
    active_summary_card.my = "all";
    load_my_tasks();
  });

  bind_filter(my_assigned_by_ctrl, () => {
    active_summary_card.my = "all";
    load_my_tasks();
  });

  bind_filter(my_assigned_to_ctrl, () => {
    active_summary_card.my = "all";
    load_my_tasks();
  });

  bind_filter(allotted_task_ctrl, () => {
    active_summary_card.allotted = "all";
    load_allotted_tasks();
  });

  bind_filter(allotted_assigned_by_ctrl, () => {
    active_summary_card.allotted = "all";
    load_allotted_tasks();
  });

  bind_filter(allotted_assigned_to_ctrl, () => {
    active_summary_card.allotted = "all";
    load_allotted_tasks();
  });

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
    } else if (key === "pending" || key === "all") {
      date_filter = null;
    }

    if (type === "my") load_my_tasks(date_filter);
    else load_allotted_tasks(date_filter);
  }

  // ----------------- Task List -----------------

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

      card.on("click", () =>
        window.open(`/app/task-assignment/${t.name}`, "_blank")
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
    };
  }

  function get_allotted_filters() {
    return {
      task: allotted_task_ctrl.get_value(),
      assigned_by: allotted_assigned_by_ctrl.get_value(),
      assigned_to: allotted_assigned_to_ctrl.get_value(),
    };
  }

  // ----------------- Load Functions -----------------

  function load_my_tasks(date_filter = null) {
    const f = get_my_filters();

    let filters = {
      assigned_to: frappe.session.user,
      status: ["!=", "Completed"],
    };

    if (f.task) filters["name"] = f.task;
    if (f.assigned_by) filters["assigned_by"] = f.assigned_by;
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
          "assigned_by",
          "assigned_to",
        ],
      },
      callback: (r) => {
        let full_data = r.message || [];

        // Stats from FULL data (not filtered)
        render_cards($("#my-task-cards"), compute_stats(full_data), "my");

        // Apply date filter only to list
        let filtered = full_data;
        if (date_filter) filtered = full_data.filter(date_filter);

        render_task_list($("#my-task-list"), filtered, "my");
      },
    });
  }

  function load_allotted_tasks(date_filter = null) {
    const f = get_allotted_filters();

    let filters = {
      assigned_by: frappe.session.user,
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
          "assigned_by",
        ],
      },
      callback: (r) => {
        let full_data = r.message || [];

        // Stats from FULL data
        render_cards(
          $("#allotted-task-cards"),
          compute_stats(full_data),
          "allotted"
        );

        // Filter only list
        let filtered = full_data;
        if (date_filter) filtered = full_data.filter(date_filter);

        render_task_list($("#allotted-task-list"), filtered, "allotted");
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

      my_assigned_to_ctrl.set_value(frappe.session.user);
      my_assigned_to_ctrl.df.read_only = 1;
      my_assigned_to_ctrl.refresh();

      my_task_ctrl.df.get_query = () => ({
        filters: { assigned_to: frappe.session.user },
      });

      active_summary_card.my = "all";
      load_my_tasks();
    } else {
      $myTasks.hide();
      $allottedTasks.show();

      allotted_assigned_by_ctrl.set_value(frappe.session.user);
      allotted_assigned_by_ctrl.df.read_only = 1;
      allotted_assigned_by_ctrl.refresh();

      allotted_task_ctrl.df.get_query = () => ({
        filters: { assigned_by: frappe.session.user },
      });
      allotted_task_ctrl.refresh();

      active_summary_card.allotted = "all";
      load_allotted_tasks();
    }
  });

  // ---------- INITIAL LOAD ----------
  my_assigned_to_ctrl.set_value(frappe.session.user);
  my_assigned_to_ctrl.df.read_only = 1;
  my_assigned_to_ctrl.refresh();

  my_task_ctrl.df.get_query = () => ({
    filters: { assigned_to: frappe.session.user },
  });
  my_task_ctrl.refresh();

  active_summary_card.my = "all";
  load_my_tasks();
};
