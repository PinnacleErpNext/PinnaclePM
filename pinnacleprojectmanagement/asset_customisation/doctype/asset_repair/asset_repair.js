frappe.ui.form.on("Asset Repair", {
  refresh(frm) {
    set_asset_details(frm);
  },

  asset(frm) {
    set_asset_details(frm);
  },
});

frappe.ui.form.on("Asset Repair Purchase Invoice", {
  purchase_invoice(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.purchase_invoice) return;

    frappe.db.get_doc("Purchase Invoice", row.purchase_invoice).then((doc) => {
      // Set in parent doctype
      frm.set_value("custom_supplier", doc.supplier);

      frm.set_value("custom_invoice_date", doc.bill_date || doc.posting_date);

      frm.set_value("repair_cost", doc.rounded_total ? doc.rounded_total : doc.grand_total);
    });
  },
});

function set_asset_details(frm) {
  if (!frm.doc.asset) {
    frm.doc.custom_custodian_name = "";
    frm.doc.custom_asset_id = "";

    frm.refresh_field("custom_custodian_name");
    frm.refresh_field("custom_asset_id");
    return;
  }

  frappe.db
    .get_doc("Asset", frm.doc.asset)
    .then((asset) => {
      // Virtual / display fields
      frm.doc.custom_asset_id = asset.custom_asset_id || "";

      if (asset.custom_custodian_name) {
        frm.doc.custom_custodian_name = asset.custom_custodian_name;
      }

      if (!asset.custodian) {
        frm.refresh_field("custom_asset_id");
        frm.refresh_field("custom_custodian_name");
        return null;
      }

      return frappe.db.get_doc("Employee", asset.custodian);
    })
    .then((employee) => {
      if (employee) {
        frm.doc.custom_custodian_name = `${employee.name} : ${employee.employee_name}`;
      }

      frm.refresh_field("custom_asset_id");
      frm.refresh_field("custom_custodian_name");
    })
    .catch((err) => {
      console.error("Error fetching asset details:", err);
    });
}
