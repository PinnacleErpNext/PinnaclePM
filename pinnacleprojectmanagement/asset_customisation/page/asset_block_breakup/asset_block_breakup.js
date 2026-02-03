frappe.pages["asset-block-breakup"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Asset Block Breakup",
    single_column: true,
  });

  const $container = $('<div class="p-3"></div>').appendTo(page.body);

  /* ---------------- STYLES ---------------- */
  $container.append(`
    <style>
        .asset-table-shift {
            margin-left: 30px;
        }

        .tree-section {
            font-size: 16px;
            font-weight: 700;
            background-color: #f4f6f8;
            text-transform: uppercase;
        }

        .tree-block {
            font-size: 14px;
            font-weight: 600;
            background-color: #fafafa;
        }

        .tree-asset td {
            padding-left: 40px;
        }
    </style>
  `);

  const $table = $(`
    <table class="table table-bordered table-sm asset-table-shift">
      <thead>
        <tr>
          <th>Asset Name</th>
          <th>Asset Id</th>
          <th>Put to Use</th>
          <th class="text-right">Asset Value</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `);

  $container.append($table);
  const $tbody = $table.find("tbody");

  // -------- MAIN ENTRY --------
  const company = frappe.route_options?.company;
  const fiscal_year = frappe.route_options?.fiscal_year;

  if (company && fiscal_year) {
    fetch_data(company, fiscal_year);
  } else {
    open_filter_dialog();
  }

  // -------- FUNCTIONS --------

  function open_filter_dialog() {
    const dialog = new frappe.ui.Dialog({
      title: "Select Filters",
      fields: [
        {
          fieldtype: "Link",
          fieldname: "company",
          label: "Company",
          options: "Company",
          default: frappe.defaults.get_default("company"),
          reqd: 1,
        },
        {
          fieldtype: "Link",
          fieldname: "fiscal_year",
          label: "Fiscal Year",
          options: "Fiscal Year",
          reqd: 1,
        },
      ],
      primary_action_label: "Show Report",
      primary_action(values) {
        dialog.hide();
        fetch_data(values.company, values.fiscal_year);
      },
    });

    dialog.show();
  }

  function fetch_data(company, fiscal_year) {
    $tbody.empty();

    frappe.call({
      method:
        "pinnacleprojectmanagement.asset_customisation.page.asset_block_breakup.asset_block_breakup.get_block_wise_data",
      args: { company, fiscal_year },
      callback(r) {
        if (!r.message) return;

        const sections = {
          Opening: {},
          Addition: {},
          Sold: {},
        };

        Object.keys(r.message).forEach((block) => {
          r.message[block].forEach((row) => {
            let section = null;

            if (row.basis === "Opening Asset") section = "Opening";
            else if (row.basis === "Asset Added") section = "Addition";
            else if (row.basis === "Asset Sold") section = "Sold";

            if (!section) return;

            if (!sections[section][block]) {
              sections[section][block] = [];
            }

            sections[section][block].push(row);
          });
        });

        Object.keys(sections).forEach((section) => {
          render_section(section, sections[section], $tbody);
        });
      },
    });
  }
};

function render_section(section, blocks, tbody) {
  if (!Object.keys(blocks).length) return;

  tbody.append(`
    <tr class="tree-section">
      <td colspan="4">${section}</td>
    </tr>
  `);

  Object.keys(blocks).forEach((block) => {
    tbody.append(`
      <tr class="tree-block">
        <td colspan="4">${block}</td>
      </tr>
    `);

    blocks[block].forEach((row) => {
      tbody.append(`
        <tr class="tree-asset">
          <td>${row.asset_name || ""}</td>
          <td>
            <a href="/app/asset/${row.asset}" target="_blank">
              ${row.asset}
            </a>
          </td>
          <td>
            ${
              row.available_for_use_date
                ? frappe.datetime.str_to_user(row.available_for_use_date)
                : ""
            }
          </td>
          <td class="text-right">
            ${format_currency(row.asset_value)}
          </td>
        </tr>
      `);
    });
  });
}
