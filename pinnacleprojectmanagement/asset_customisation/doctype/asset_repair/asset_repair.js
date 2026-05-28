frappe.ui.form.on("Asset Repair", {
    refresh(frm){
        setAssetId(frm)
    },
    asset(frm) {
       setAssetId(frm)
    }
});

function setAssetId(frm) {

    if (!frm.doc.asset) {
        frm.set_value("custom_custodian_name", "");
        frm.set_value("custom_asset_id", "");
        return;
    }

    frappe.db.get_doc("Asset", frm.doc.asset)
        .then(asset => {

            // Set Asset ID field
            frm.set_value("custom_asset_id", asset.custom_asset_id || "");

            let employee = asset.custodian;

            if (!employee) {
                frm.set_value("custom_custodian_name", "");
                return null;
            }

            return frappe.db.get_doc("Employee", employee);
        })
        .then(employee => {

            if (employee) {
                frm.set_value(
                    "custom_custodian_name",
                    `${employee.name} : ${employee.employee_name}`
                );
            }

        });
}