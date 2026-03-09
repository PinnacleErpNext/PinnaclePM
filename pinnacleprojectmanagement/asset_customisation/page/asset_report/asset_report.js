frappe.pages["asset-report"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Asset Report",
    single_column: true,
  });

  const $form = $(`
    <div class="row">

      <div class="col-md-3 form-group">
        <label>Asset Category</label>
        <select id="category_filter" class="form-control">
          <option value="">All Categories</option>
        </select>
      </div>

      <div class="col-md-3 form-group">
        <label>Component</label>
        <select id="component_filter" class="form-control">
          <option value="">All Components</option>
        </select>
      </div>

      <div class="col-md-2 form-group" id="component_value_wrapper" style="display:none;">
        <label>Component Value</label>
        <input id="component_value_filter" class="form-control" placeholder="e.g. 8 GB">
      </div>

      <div class="col-md-3 form-group">
        <label>Custodian</label>
        <select id="custodian_filter" class="form-control">
          <option value="">All Custodians</option>
        </select>
      </div>

      <div class="col-md-3 form-group">
        <label>Search (Asset ID / Item Name)</label>
        <input id="filter_text" class="form-control" placeholder="optional">
      </div>

      <div class="col-md-4 form-group d-flex align-items-end">
        <button id="fetch_records" class="btn btn-primary mr-2">Get Records</button>
        <button id="download_excel" class="btn btn-success">Download Report</button>
      </div>


    </div>

    <div style="max-height:600px; overflow:auto; position:relative;">
      <table id="record_table" class="table table-bordered mt-3" style="min-width:1500px; border-collapse:separate;">
        <thead></thead>
        <tbody id="asset_table_body"></tbody>
      </table>
    </div>

    <style>
      #record_table {
        border-collapse: separate;
      }

      #record_table th,
      #record_table td {
        background: white;
        border: 1px solid #ddd;
        padding: 8px;
        white-space: nowrap;
      }

      /* Sticky header */
      #record_table thead th {
        position: sticky;
        top: 0;
        background: #f8f9fa;
        z-index: 5;
      }

      /* Sticky ID column */
      #record_table th.col-id,
      #record_table td.col-id {
        position: sticky;
        left: 0;
        background: #f8f9fa;
        z-index: 6;
      }

      /* Sticky Asset ID column */
      #record_table th.col-assetid,
      #record_table td.col-assetid {
        position: sticky;
        left: var(--col-id-width);
        background: #f8f9fa;
        z-index: 6;
      }

      /* Sticky Custodian column */
      #record_table th.col-custodian,
      #record_table td.col-custodian {
        position: sticky;
        left: calc(var(--col-id-width) + var(--col-assetid-width));
        background: #f8f9fa;
        z-index: 6;
      }

      /* Corner header cells */
      #record_table thead th.col-id,
      #record_table thead th.col-assetid,
      #record_table thead th.col-custodian {
        z-index: 10;
      }
    </style>
  `).appendTo(page.body);

  const $table = $form.find("#record_table");
  const $tbody = $form.find("#asset_table_body");

  // ---------------------------
  // Populate dropdown filters
  // ---------------------------

  // Asset Categories (only submitted assets)
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Asset",
      fields: ["asset_category"],
      filters: { docstatus: 1 },
      limit_page_length: 1000,
    },
    callback: function (res) {
      const categories = new Set();
      (res.message || []).forEach((r) => {
        if (r.asset_category) categories.add(r.asset_category);
      });

      categories.forEach((cat) => {
        $("#category_filter").append(`<option value="${cat}">${cat}</option>`);
      });
    },
  });
  // Show/Hide Component Value based on Component selection
  $form.on("change", "#component_filter", function () {
    const selected = $(this).val();

    if (selected) {
      $("#component_value_wrapper").show();
    } else {
      $("#component_value_wrapper").hide();
      $("#component_value_filter").val(""); // clear value when hidden
    }
  });

  // Components
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Asset Components",
      fields: ["component_name"],
      limit_page_length: 1000,
    },
    callback: function (res) {
      const comps = new Set();
      (res.message || []).forEach((r) => {
        if (r.component_name) comps.add(r.component_name);
      });

      comps.forEach((c) => {
        $("#component_filter").append(`<option value="${c}">${c}</option>`);
      });
    },
  });

  // Custodians (only submitted assets)
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Asset",
      fields: ["custodian"],
      filters: {
        docstatus: 1,
        custodian: ["is", "set"],
      },
      group_by: "custodian",
      limit_page_length: 0,
    },
    callback: function (res) {
      if (!res.message || !res.message.length) return;

      const employee_ids = res.message.map((r) => r.custodian);

      // Fetch Employees
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          fields: ["name", "employee_name"],
          filters: {
            name: ["in", employee_ids],
          },
          limit_page_length: 0,
        },
        callback: function (emp_res) {
          const $filter = $("#custodian_filter");
          $filter.empty();
          $filter.append(`<option value="">Select Custodian</option>`);

          (emp_res.message || [])
            .sort((a, b) =>
              (a.employee_name || "").localeCompare(b.employee_name || ""),
            )
            .forEach((emp) => {
              const label = frappe.utils.escape_html(
                emp.employee_name || emp.name,
              );
              const value = frappe.utils.escape_html(emp.name); // 👈 custodian ID

              $filter.append(`<option value="${value}">${label}</option>`);
            });
        },
      });
    },
  });

  // ---------------------------
  // Helpers
  // ---------------------------

  function safe(v) {
    if (!v || v === null || v === undefined || v === "") return "N/A";
    return v;
  }

  function getComponentValue(obj, keys) {
    if (!obj) return "N/A";

    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch {
        return "N/A";
      }
    }

    const normalized = {};
    Object.keys(obj).forEach((k) => {
      const nk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      normalized[nk] = obj[k];
    });

    for (let k of keys) {
      const nk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalized[nk] !== undefined && normalized[nk] !== "") {
        return normalized[nk];
      }
    }
    return "N/A";
  }

  // ---------------------------
  // Fetch records
  // ---------------------------
  $form.find("#fetch_records").click(function () {
    frappe.dom.freeze("Loading...");
    console.log("Fetching records with filters:", {
      filter_text: $("#filter_text").val(),
      asset_category: $("#category_filter").val(),
      component_filter: $("#component_filter").val(),
      component_value: $("#component_value_filter").val(),
      custodian_filter: $("#custodian_filter").val(),
    });
    frappe.call({
      method: "pinnacleprojectmanagement.api.get_assets",
      args: {
        filter_text: $("#filter_text").val() || "",
        asset_category: $("#category_filter").val() || "",
        component_filter: $("#component_filter").val() || "",
        component_value: $("#component_value_filter").val() || "",
        custodian_filter: $("#custodian_filter").val() || "",
      },
      callback: function (res) {
        frappe.dom.unfreeze();
        render_table(res.message || []);
      },
      error: () => {
        frappe.dom.unfreeze();
        frappe.msgprint("Failed to fetch data.");
      },
    });
  });

  // ---------------------------
  // Download Excel
  // ---------------------------
  $form.find("#download_excel").click(function () {
    frappe.dom.freeze("Preparing Excel...");

    frappe.call({
      method: "pinnacleprojectmanagement.api.download_assets_excel",
      args: {
        filter_text: $("#filter_text").val() || "",
        asset_category: $("#category_filter").val() || "",
        component_filter: $("#component_filter").val() || "",
        component_value: $("#component_value_filter").val() || "",
        custodian_filter: $("#custodian_filter").val() || "",
      },
      callback: function (res) {
        frappe.dom.unfreeze();
        if (res.message) {
          window.location.href = res.message;
        } else {
          frappe.msgprint("Failed to generate Excel.");
        }
      },
      error: () => {
        frappe.dom.unfreeze();
        frappe.msgprint("Error while downloading Excel.");
      },
    });
  });

  // ---------------------------
  // Render Table
  // ---------------------------
  function render_table(data) {
    if (!data.length) {
      $tbody.html(
        `<tr><td colspan="20" class="text-center">No records found</td></tr>`,
      );
      return;
    }

    // -------------------------
    // Collect dynamic components
    // -------------------------
    let componentSet = new Set();

    data.forEach((row) => {
      if (row.asset_components) {
        try {
          const comp = JSON.parse(row.asset_components);
          Object.keys(comp).forEach((k) => componentSet.add(k));
        } catch {}
      }
    });

    const componentHeaders = Array.from(componentSet).sort();

    // -------------------------
    // Build headers
    // -------------------------
    const headers = [
      { label: "Asset", cls: "col-id" }, // clickable doc link
      { label: "Asset ID", cls: "col-assetid" },
      { label: "Asset Name", cls: "" },
      { label: "Item Name", cls: "" },
      { label: "Location", cls: "" },
      { label: "Custodian", cls: "col-custodian" },
      { label: "Asset Category", cls: "" },
      ...componentHeaders.map((c) => ({ label: c, cls: "" })),
    ];

    const thead = `<tr>${headers.map((h) => `<th class="${h.cls}">${h.label}</th>`).join("")}</tr>`;
    $table.find("thead").html(thead);
    $tbody.empty();

    // -------------------------
    // Render rows
    // -------------------------
    data.forEach((row) => {
      let comp = {};
      if (row.asset_components) {
        try {
          comp = JSON.parse(row.asset_components);
        } catch {}
      }

      let componentTds = componentHeaders
        .map((c) => {
          return `<td>${safe(comp[c])}</td>`;
        })
        .join("");

      const tr = `
      <tr>
        <td class="col-id">
          <a href="/app/asset/${row.id}" target="_blank">${row.id}</a>
        </td>
        <td class="col-assetid">${safe(row.asset_id)}</td>
        <td>${safe(row.asset_name)}</td>
        <td>${safe(row.item_name)}</td>
        <td>${safe(row.location)}</td>
        <td class="col-custodian">${safe(row.used_by)}</td>
        <td>${safe(row.asset_category)}</td>
        ${componentTds}
      </tr>
    `;

      $tbody.append(tr);
    });

    // Sticky width fix
    setTimeout(() => {
      const idCol = $("#record_table td.col-id:first").outerWidth() || 160;
      const assetIdCol =
        $("#record_table td.col-assetid:first").outerWidth() || 160;

      document.documentElement.style.setProperty(
        "--col-id-width",
        idCol + "px",
      );
      document.documentElement.style.setProperty(
        "--col-assetid-width",
        assetIdCol + "px",
      );
    }, 60);
  }

  // Reset table on filter change
  $form.on(
    "input change",
    "#filter_text, #category_filter, #component_filter, #custodian_filter",
    function () {
      $tbody.empty();
      $table.find("thead").empty();
    },
  );
};
