// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt

frappe.ui.form.on("Asset Block Depreciation", {
  refresh(frm) {
    // Hide checkbox after first save (non-opening docs)
    if (!frm.is_new() && frm.doc.is_opening_entry == 1) {
      frm.set_df_property("is_opening_entry", "read_only", 1);
    }

    toggle_depreciation_table(frm);
  },
  asset_block_break_up(frm) {
    if (!frm.doc.company || !frm.doc.financial_year) {
      frappe.msgprint(__("Please select Company and Financial Year first"));
      return;
    }

    const params = new URLSearchParams({
      company: frm.doc.company,
      fiscal_year: frm.doc.financial_year,
    });

    window.location.href = `/app/asset-block-breakup?${params.toString()}`;
  },
});

/**
 * Toggle child table editability
 */
function toggle_depreciation_table(frm) {
  frm.set_df_property(
    "depreciation",
    "read_only",
    frm.doc.is_opening_entry ? 0 : 1
  );

  frm.refresh_field("depreciation");
}
