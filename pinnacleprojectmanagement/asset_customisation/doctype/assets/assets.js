frappe.ui.form.on("Asset", {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.add_custom_button("Manage Components", () => {
        let original_components = [];

        let d = new frappe.ui.Dialog({
          title: "Manage Asset Components",
          size: "extra-large",

          fields: [
            {
              fieldname: "components",
              fieldtype: "Table",
              label: "Components",
              reqd: 1,
              in_editable_grid: 1,
              fields: [
                {
                  label: "Serial No",
                  fieldname: "serial_no",
                  fieldtype: "Data",
                  in_list_view: 1,
                },
                {
                  label: "Component",
                  fieldname: "component",
                  fieldtype: "Link",
                  options: "Item",
                  in_list_view: 1,
                  reqd: 1,
                  get_query: () => ({ filters: { custom_is_component: 1 } }),
                },
                {
                  label: "Brand Name",
                  fieldname: "brand_name",
                  fieldtype: "Data",
                  in_list_view: 1,
                },
                {
                  label: "Vendor",
                  fieldname: "vendor",
                  fieldtype: "Data",
                  in_list_view: 1,
                },
                {
                  label: "Date of Addition",
                  fieldname: "date_of_addition",
                  fieldtype: "Date",
                  in_list_view: 1,
                },
                {
                  label: "Warranty Start",
                  fieldname: "warrent_start",
                  fieldtype: "Date",
                  in_list_view: 1,
                },
                {
                  label: "Warranty End",
                  fieldname: "warrent_end",
                  fieldtype: "Date",
                  in_list_view: 1,
                },
                {
                  label: "Specification",
                  fieldname: "specification",
                  fieldtype: "Data",
                  in_list_view: 1,
                },
              ],
            },
          ],

          primary_action_label: "Update Components",
          primary_action(values) {
            let new_list = values.components || [];

            // --------------------------------------------------
            // IDENTIFY REMOVED COMPONENTS
            // --------------------------------------------------
            let removed = original_components.filter(
              (orig) =>
                !new_list.some(
                  (n) =>
                    n.component === orig.component &&
                    n.serial_no === orig.serial_no
                )
            );

            // --------------------------------------------------
            // IDENTIFY NEWLY ADDED COMPONENTS
            // --------------------------------------------------
            let added = new_list.filter(
              (n) =>
                !original_components.some(
                  (orig) =>
                    n.component === orig.component &&
                    n.serial_no === orig.serial_no
                )
            );

            // --------------------------------------------------
            // SUMMARY TABLE
            // --------------------------------------------------
            const generate_summary_table = (items) => {
              if (!items.length) return "";

              let rows = items
                .map(
                  (i) =>
                    `<tr>
                                    <td>${i.component} (${i.serial_no}) — ${
                      i.brand_name || "Unknown"
                    }</td>
                                </tr>`
                )
                .join("");

              return `
                                <table class="table table-bordered" style="margin-top:10px;">
                                    <thead>
                                        <tr><th>Component Summary</th></tr>
                                    </thead>
                                    <tbody>${rows}</tbody>
                                </table>`;
            };

            // --------------------------------------------------
            // PROCESS REMOVED + ADDED
            // --------------------------------------------------
            const process_changes = () => {
              // If removed components exist
              if (removed.length) {
                frappe.confirm(
                  `
                                    <b>You removed ${
                                      removed.length
                                    } component(s):</b>
                                    ${generate_summary_table(removed)}
                                    <br>Do you want to <b>unlink</b> them from this Asset?
                                    `,
                  () => {
                    // UNLINK from asset
                    removed.forEach((r) => {
                      frappe.call({
                        method: "frappe.client.set_value",
                        args: {
                          doctype: "Asset Components",
                          name: r.name,
                          fieldname: "asset",
                          value: null,
                        },
                      });
                    });

                    if (added.length) process_additions();
                    else finalize_update();
                  }
                );
              } else if (added.length) {
                process_additions();
              } else {
                finalize_update();
              }
            };

            // --------------------------------------------------
            // ADD NEW COMPONENTS
            // --------------------------------------------------
            const process_additions = () => {
              frappe.confirm(
                `
                                <b>You added ${
                                  added.length
                                } new component(s):</b>
                                ${generate_summary_table(added)}
                                <br>Do you want to create them?
                                `,
                () => {
                  frappe.call({
                    method:
                      "pinnacleprojectmanagement.asset_customisation.doctype.asset_components.asset_components.create_components_from_dialog",
                    args: {
                      asset: frm.doc.name,
                      components: JSON.stringify(added),
                    },
                    callback(r) {
                      finalize_update(r.message || []);
                    },
                  });
                }
              );
            };

            // --------------------------------------------------
            // FINAL UI UPDATE
            // --------------------------------------------------
            const finalize_update = (created = []) => {
              d.hide();
              frm.reload_doc();

              if (created.length) {
                let clickable = created
                  .map(
                    (c) => `<a href="/app/asset-components/${c}" 
                                                target="_blank" 
                                                style="color:var(--primary);font-weight:600;">
                                                ${c}</a>`
                  )
                  .join(", ");

                frappe.msgprint(`
                                    <div style="font-size:16px;">
                                        ${clickable} created.
                                    </div>
                                `);
              }

              frappe.show_alert("Components Updated", 7);
            };

            process_changes();
          },
        });

        d.show();

        // --------------------------------------------------
        // LOAD EXISTING COMPONENTS
        // --------------------------------------------------
        d.$wrapper.on("shown.bs.modal", () => {
          frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "Asset Components",
              filters: { asset: frm.doc.name },
              fields: [
                "name",
                "component",
                "serial_no",
                "brand_name",
                "vendor",
                "date_of_addition",
                "warrent_start",
                "warrent_end",
                "specification",
              ],
            },
            callback(res) {
              let table_field = d.get_field("components");
              table_field.df.data = [];

              original_components = res.message || [];

              original_components.forEach((row) => {
                table_field.df.data.push(row);
              });

              table_field.refresh();
            },
          });
        });
      });
    }
  },
});
