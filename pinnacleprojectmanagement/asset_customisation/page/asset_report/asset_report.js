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

      <div class="col-md-3 form-group">
        <label>Custodian</label>
        <select id="custodian_filter" class="form-control">
          <option value="">All Custodians</option>
        </select>
      </div>

      <div class="col-md-3 form-group">
        <label>Search (Asset ID / Custodian / Item Name)</label>
        <input id="filter_text" class="form-control" placeholder="optional">
      </div>

      <div class="col-md-2 form-group d-flex align-items-end">
        <button id="fetch_records" class="btn btn-primary">Get Records</button>
      </div>

      <div class="col-md-2 form-group d-flex align-items-end">
        <button id="download_excel" class="btn btn-success">Download Excel</button>
      </div>

    </div>

    <div style="max-height:600px; overflow:auto; position:relative;">
      <table id="record_table" class="table table-bordered mt-3" style="min-width:1400px; border-collapse:separate;">
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

    // normalize keys: lowercase + remove spaces + remove special chars (-,/,_)
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

  // ----------------------------------------
  // Fetch records
  // ----------------------------------------
  $form.find("#fetch_records").click(function () {
    frappe.dom.freeze("Loading...");

    frappe.call({
      method: "pinnacleprojectmanagement.api.get_assets",
      args: {
        filter_text: $("#filter_text").val() || "",
        asset_category: $("#category_filter").val() || "",
        component_filter: $("#component_filter").val() || "",
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
  
$form.find("#download_excel").click(function () {
  frappe.dom.freeze("Preparing Excel...");

  frappe.call({
    method: "pinnacleprojectmanagement.api.download_assets_excel",
    args: {
      filter_text: $("#filter_text").val() || "",
      asset_category: $("#category_filter").val() || "",
      component_filter: $("#component_filter").val() || "",
      custodian_filter: $("#custodian_filter").val() || "",
    },
    callback: function (res) {
      frappe.dom.unfreeze();

      if (res.message) {
        window.location.href = res.message; // download file
      } else {
        frappe.msgprint("Failed to generate Excel.");
      }
    },
    error: () => {
      frappe.dom.unfreeze();
      frappe.msgprint("Error while downloading Excel.");
    }
  });
});

  // ----------------------------------------
  // Render Table
  // ----------------------------------------

  function render_table(data) {
    const headers = [
      { label: "ID", cls: "col-id" },
      { label: "Asset ID", cls: "col-assetid" },
      { label: "Item Name", cls: "" },
      { label: "Custodian", cls: "col-custodian" },
      { label: "Asset Category", cls: "" },
      { label: "Processor", cls: "" },
      { label: "RAM", cls: "" },
      { label: "Hard Disk", cls: "" },
      { label: "Mother Board", cls: "" },
      { label: "Keyboard", cls: "" },
      { label: "Mouse", cls: "" },
      { label: "Charger", cls: "" },
      { label: "WIFI-MAC Address", cls: "" },
    ];

    const thead = `<tr>${headers.map((h) => `<th class="${h.cls}">${h.label}</th>`).join("")}</tr>`;
    $table.find("thead").html(thead);
    $tbody.empty();

    data.sort((a, b) => (a.asset_id || "").localeCompare(b.asset_id || ""));

    if (!data.length) {
      $tbody.html(
        `<tr><td colspan="${headers.length}" class="text-center">No records found</td></tr>`,
      );
      return;
    }

    data.forEach((row) => {
      let comp = {};
      if (row.asset_components) {
        try {
          comp = JSON.parse(row.asset_components);
        } catch {}
      }

      const tr = `
      <tr>
        <td class="col-id"><a href="/app/asset/${row.id}" target="_blank">${row.id}</a></td>
        <td class="col-assetid">${safe(row.asset_id)}</td>
        <td>${safe(row.item_name)}</td>
        <td class="col-custodian">${safe(row.used_by)}</td>
        <td>${safe(row.asset_category)}</td>

        <td>${safe(getComponentValue(comp, ["processor"]))}</td>
        <td>${safe(getComponentValue(comp, ["ram"]))}</td>
        <td>${safe(getComponentValue(comp, ["harddisk", "hard disk", "hdd"]))}</td>
        <td>${safe(getComponentValue(comp, ["motherboard", "mother board", "mb"]))}</td>

        <td>${safe(getComponentValue(comp, ["keyboard"]))}</td>
        <td>${safe(getComponentValue(comp, ["mouse"]))}</td>
        <td>${safe(getComponentValue(comp, ["charger", "poweradapter"]))}</td>
        <td>${safe(getComponentValue(comp, ["Wi-fi MAC Address","wifi mac address","wifi mac","mac address","wireless mac",]),)}</td>

      </tr>
      `;
      $tbody.append(tr);
    });

    setTimeout(() => {
      const idCol = $("#record_table td.col-id:first").outerWidth() || 150;
      const assetIdCol =
        $("#record_table td.col-assetid:first").outerWidth() || 150;

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
