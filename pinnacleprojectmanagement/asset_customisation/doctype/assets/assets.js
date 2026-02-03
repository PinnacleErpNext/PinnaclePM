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
              in_editable_grid: 1,
              reqd: 1,
              fields: [
                { fieldname: "name", fieldtype: "Data", hidden: 1 },

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
                  label: "Specification",
                  fieldname: "specification",
                  fieldtype: "Data",
                  in_list_view: 1,
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
              ],
            },
          ],

          primary_action_label: "Update Components",
          primary_action: async function (values) {
            let new_list = values.components || [];

            // ---------------------------
            // FIND REMOVED
            // ---------------------------
            let removed = original_components.filter((orig) => {
              return !new_list.some((n) => n.name && n.name === orig.name);
            });

            // ---------------------------
            // FIND ADDED
            // ---------------------------
            let added = new_list.filter((n) => {
              return (
                !n.name || !original_components.some((o) => o.name === n.name)
              );
            });

            // ---------------------------
            // FIND UPDATED
            // ---------------------------
            let updated = new_list.filter((n) => {
              let orig = original_components.find((o) => o.name === n.name);
              if (!orig) return false;

              return (
                n.specification !== orig.specification ||
                n.brand_name !== orig.brand_name ||
                n.vendor !== orig.vendor ||
                n.date_of_addition !== orig.date_of_addition ||
                n.warrent_start !== orig.warrent_start ||
                n.warrent_end !== orig.warrent_end ||
                n.serial_no !== orig.serial_no ||
                n.component !== orig.component
              );
            });

            const generate_summary_table = (items) => {
              if (!items.length) return "";
              let rows = items
                .map(
                  (i) =>
                    `<tr><td>${i.component} (${i.serial_no || ""})</td></tr>`,
                )
                .join("");

              return `
                <table class="table table-bordered">
                  <thead><tr><th>Components</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>`;
            };

            // ---------------------------
            // PROCESS UPDATES (SERVER SIDE)
            // ---------------------------
            const process_updates = async () => {
              if (!updated.length) return;

              await frappe.call({
                method:
                  "pinnacleprojectmanagement.asset_customisation.doctype.asset_components.asset_components.update_components_from_dialog",
                args: {
                  components: JSON.stringify(updated),
                },
              });
            };

            // ---------------------------
            // PROCESS ADDITIONS
            // ---------------------------
            const process_additions = async () => {
              if (!added.length) return [];

              let clean_added = added.map((r) => {
                let row = { ...r };
                delete row.name; // important
                return row;
              });

              let r = await frappe.call({
                method:
                  "pinnacleprojectmanagement.asset_customisation.doctype.asset_components.asset_components.create_components_from_dialog",
                args: {
                  asset: frm.doc.name,
                  components: JSON.stringify(clean_added),
                },
              });

              return r.message || [];
            };

            // ---------------------------
            // PROCESS REMOVALS
            // ---------------------------
            const process_removals = async () => {
              if (!removed.length) return;

              await Promise.all(
                removed.map((r) => {
                  return frappe.call({
                    method: "frappe.client.set_value",
                    args: {
                      doctype: "Asset Components",
                      name: r.name,
                      fieldname: "asset",
                      value: null,
                    },
                  });
                }),
              );
            };

            // ---------------------------
            // MAIN FLOW
            // ---------------------------
            if (removed.length) {
              frappe.confirm(
                `<b>You removed ${removed.length} component(s)</b>
                 ${generate_summary_table(removed)}
                 <br>Unlink them?`,
                async () => {
                  await process_removals();
                  await process_updates();
                  let created = await process_additions();
                  finalize_update(created);
                },
              );
            } else {
              await process_updates();
              let created = await process_additions();
              finalize_update(created);
            }
          },
        });

        d.show();

        // ---------------------------
        // LOAD EXISTING COMPONENTS
        // ---------------------------
        d.$wrapper.on("shown.bs.modal", () => {
          frappe.call({
            method: "frappe.client.get_list",
            args: {
              doctype: "Asset Components",
              filters: { asset: frm.doc.name },
              fields: [
                "name",
                "serial_no",
                "component",
                "specification",
                "brand_name",
                "vendor",
                "date_of_addition",
                "warrent_start",
                "warrent_end",
              ],
            },
            callback(res) {
              let table_field = d.get_field("components");

              // IMPORTANT: deep copy
              original_components = JSON.parse(
                JSON.stringify(res.message || []),
              );
              table_field.df.data = JSON.parse(
                JSON.stringify(res.message || []),
              );

              table_field.refresh();
            },
          });
        });

        const finalize_update = (created = []) => {
          d.hide();
          frm.reload_doc();

          if (created.length) {
            let clickable = created
              .map(
                (c) =>
                  `<a href="/app/asset-components/${c}" target="_blank">${c}</a>`,
              )
              .join(", ");

            frappe.msgprint(`<b>Created:</b> ${clickable}`);
          }

          frappe.show_alert("Components Updated", 7);
        };
      });
    }
  },
});
