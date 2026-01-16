// Copyright (c) 2025, OTPL and contributors
// For license information, please see license.txt
frappe.query_reports["Asset Depreciation Income Tax"] = {
    filters: [
        {
            fieldname: "fiscal_year",
            label: __("Fiscal Year"),
            fieldtype: "Link",
            options: "Fiscal Year",
            reqd: 1
        },
        {
            fieldname: "company",
            label: __("Company"),
            fieldtype: "Link",
            options: "Company",
            reqd: 1
        }
    ],

    onload: function (report) {
        report.page.add_inner_button(
            __("Create Asset Block Depreciation"),
            function () {
                const filters = report.get_values();

                if (!filters.fiscal_year || !filters.company) {
                    frappe.msgprint(__("Please select Fiscal Year and Company"));
                    return;
                }

                frappe.confirm(
                    __("This will create Asset Block Depreciation for the selected Fiscal Year. Continue?"),
                    function () {
                        frappe.call({
                            method: "pinnacleprojectmanagement.pinnacle_project_management.report.asset_depreciation_income_tax.asset_depreciation_income_tax.create_asset_block_dep",
                            args: {
                                fiscal_year: filters.fiscal_year,
                                company: filters.company
                            },
                            callback: function (r) {
                                if (r.message) {
                                    frappe.set_route(
                                        "Form",
                                        "Asset Block Depreciation",
                                        r.message
                                    );
                                }
                            }
                        });
                    }
                );
            }
        );
    }
};

