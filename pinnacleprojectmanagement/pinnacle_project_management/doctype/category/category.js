// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Category", {
  refresh(frm) {},
  project: function (frm) {
    frappe.db
      .get_list("Modules", {
        fields: ["module_name"],
        filters: { project: frm.doc.project },
      })
      .then((records) => {
        if (records.length > 0) {
          frm.set_df_property("module", "hidden", false);
        }
      });
    frm.set_query("module", function () {
      return { filters: { project: frm.doc.project } };
    });
  },
});
