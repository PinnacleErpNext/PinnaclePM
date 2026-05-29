frappe.ui.form.on("Asset Repair", {
  refresh(frm) {
    set_asset_details(frm);
  },

  asset(frm) {
    set_asset_details(frm);
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
