frappe.ui.form.on("Asset Movement", {
  validate: function (frm) {

    if (frm._movement_confirmed) return;

    if (!frm.doc.assets || !frm.doc.assets.length) return;

    frappe.validated = false;

    return frappe.call({
      method:
        "pinnacleprojectmanagement.asset_customisation.doctype.asset_movement.asset_movement.validate_asset_movement",
      args: {
        doc: frm.doc,
      },
    }).then((r) => {

      if (r.message) {
        return new Promise((resolve, reject) => {
          frappe.confirm(
            "One or more assets are already allotted to the selected employee.<br><br>Do you want to proceed?",
            () => {
              frm._movement_confirmed = true;
              frappe.validated = true;
              resolve();
            },
            () => {
              frappe.validated = false;
              reject();
            }
          );
        });
      }
    });
  },
});