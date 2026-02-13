// Copyright (c) 2026, OTPL and contributors
// For license information, please see license.txt

frappe.query_reports["Task Timeline Report"] = {
    filters: [
        {
            fieldname: "assigned_to",
            label: __("Assigned To"),
            fieldtype: "Link",
            options: "User"
        },
        {
            fieldname: "allotted_to",
            label: __("Allotted To"),
            fieldtype: "Link",
            options: "User"
        }
    ],

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "display_status") {
            if (data.display_status === "Overdue") {
                value = `<span style="color:red;font-weight:600">${value}</span>`;
            }
            if (data.display_status === "Before") {
                value = `<span style="color:orange;font-weight:600">${value}</span>`;
            }
            if (data.display_status === "On Time") {
                value = `<span style="color:green;font-weight:600">${value}</span>`;
            }
        }

        return value;
    }
};

