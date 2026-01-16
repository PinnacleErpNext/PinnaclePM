# Copyright (c) 2025, OTPL
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.query_builder import DocType
from frappe.query_builder.functions import Sum
from frappe.utils import flt


class AssetBlockDepreciation(Document):

    # ---------------------------------------------------------
    # VALIDATION: ONE DOC PER FY + COMPANY
    # ---------------------------------------------------------
    def validate(self):
        if self.is_opening_entry == 1:
            if frappe.db.exists(
                "Asset Block Depreciation",
                {
                    "is_opening_entry": 1,
                    "financial_year": self.financial_year,
                    "company": self.company,
                    "name": ["!=", self.name],
                },
            ):
                frappe.throw(
                    f"Opening Entry Asset Block Depreciation already exists for "
                    f"FY {self.financial_year} and Company {self.company}"
                )

        if frappe.db.exists(
            "Asset Block Depreciation",
            {
                "financial_year": self.financial_year,
                "company": self.company,
                "name": ["!=", self.name],
            },
        ):
            frappe.throw(
                f"Asset Block Depreciation already exists for "
                f"FY {self.financial_year} and Company {self.company}"
            )

    # ---------------------------------------------------------
    # MAIN HOOK
    # ---------------------------------------------------------
    def before_save(self):

        # --------------------------------------------------
        # NORMAL DEPRECIATION (AUTO CALCULATED)
        # --------------------------------------------------
        total_opening_wdv = 0.0
        total_depreciation = 0.0
        total_closing_wdv = 0.0
        total_asset_added_h1 = 0.0
        total_asset_added_h2 = 0.0
        total_sales = 0.0
        total_total = 0.0
        total_net_total = 0.0

        asset_blocks = frappe.get_all("Asset Block", pluck="name")
        fy_doc = frappe.get_doc("Fiscal Year", self.financial_year)

        if not self.is_opening_entry:
            company = self.company

            # Always reset child table
            self.depreciation = []

            for block_name in asset_blocks:
                row = self.calculate_block_depreciation(
                    block_name=block_name,
                    fy_doc=fy_doc,
                    company=company,
                )

                # 🔴 Skip empty / invalid rows
                if not row:
                    continue
                print("row", row)
                # ----------------------------
                # SAFE TOTAL ACCUMULATION
                # ----------------------------
                total_opening_wdv += flt(row.get("opening_wdv"))
                total_depreciation += flt(row.get("depreciation"))
                total_closing_wdv += flt(row.get("closing_wdv"))
                total_asset_added_h1 += flt(row.get("asset_added_h1"))
                total_asset_added_h2 += flt(row.get("asset_added_h2"))
                total_sales += flt(row.get("sold_assets"))
                total_total += flt(row.get("total"))
                total_net_total += flt(row.get("net_total"))


                # Append only valid rows
                self.append("depreciation", row)

            # ----------------------------
            # SET PARENT TOTALS
            # ----------------------------
            self.total_opening_wdv = total_opening_wdv
            self.total_asset_added_h1 = total_asset_added_h1
            self.total_asset_added_h2 = total_asset_added_h2
            self.total_sales = total_sales
            self.total_total = total_total
            self.total_net_total = total_net_total
            self.total_depreciation = total_depreciation
            self.total_closing_wdv = total_closing_wdv

            if not self.depreciation:
                frappe.throw(
                    "No assets found for the selected Fiscal Year and Company."
                )

        # --------------------------------------------------
        # OPENING ENTRY MODE (MANUAL)
        # --------------------------------------------------
        else:
            if not self.depreciation:
                for block_name in asset_blocks:
                    rate = flt(self.get_rod(block_name, fy_doc))

                    self.append(
                        "depreciation",
                        {
                            "asset_block": block_name,
                            "rate_of_depreciation": rate,
                            "opening_wdv": 0.0,
                            "asset_added_h1": 0.0,
                            "asset_added_h2": 0.0,
                            "total": 0.0,
                            "sold_assets": 0.0,
                            "net_total": 0.0,
                            "depreciation": 0.0,
                            "closing_wdv": 0.0,
                        },
                    )

    # ---------------------------------------------------------
    # BLOCK-WISE DEPRECIATION
    # ---------------------------------------------------------
    def calculate_block_depreciation(self, block_name, fy_doc, company):
        assets = self.get_asset(block_name, fy_doc)

        opening_wdv = flt(self.get_previous_year_closing_balance(block_name, fy_doc))
        rate = flt(self.get_rod(block_name, fy_doc))
        sold_assets = flt(self.get_sold_assets(company, block_name, fy_doc))

        asset_added_h1 = flt(assets["first_half_amount"])
        asset_added_h2 = flt(assets["second_half_amount"])

        # Skip empty blocks
        if opening_wdv == 0 and asset_added_h1 == 0 and asset_added_h2 == 0:
            return None

        total = opening_wdv + asset_added_h1 + asset_added_h2
        net_total = total - sold_assets

        depreciation = round(
            (opening_wdv + asset_added_h1 - sold_assets) * (rate / 100)
            + (asset_added_h2 * (rate / 200))
        )

        closing_wdv = net_total - depreciation
        print("closing_wdv", closing_wdv)
        return {
            # ---- Child DocType: Block Depreciation (EXACT FIELDNAMES) ----
            "asset_block": block_name,
            "opening_wdv": opening_wdv,
            "rate_of_depreciation": rate,
            "asset_added_h1": asset_added_h1,
            "asset_added_h2": asset_added_h2,
            "total": total,
            "sold_assets": sold_assets,
            "net_total": net_total,
            "depreciation": depreciation,
            "closing_wdv": closing_wdv,
        }

    # ---------------------------------------------------------
    # RATE OF DEPRECIATION
    # ---------------------------------------------------------
    def get_rod(self, block_name, fy_doc):
        block = frappe.get_doc("Asset Block", block_name)

        selected_year = fy_doc.year_start_date.year
        latest_year = 0
        rate = 0.0

        for row in block.depreciation_table:
            if not row.financial_year:
                continue

            row_year = int(row.financial_year.split("-")[0])

            if row_year <= selected_year and row_year >= latest_year:
                latest_year = row_year
                rate = row.depreciation

        return rate

    # ---------------------------------------------------------
    # ASSET PURCHASES (HALF YEAR)
    # ---------------------------------------------------------
    def get_asset(self, block_name, fy_doc):
        Asset = frappe.qb.DocType("Asset")
        ABA = frappe.qb.DocType("Asset Block Assignment")  # child table

        assets = (
            frappe.qb.from_(Asset)
            .inner_join(ABA)
            .on(ABA.parent == Asset.name)
            .select(
                Asset.available_for_use_date,
                Asset.gross_purchase_amount,
            )
            .where(
                (ABA.asset_block == block_name)
                & (Asset.docstatus == 1)
                & (Asset.available_for_use_date.between(
                    fy_doc.year_start_date,
                    fy_doc.year_end_date
                ))
            )
            .run(as_dict=True)
        )

        first_half = 0.0
        second_half = 0.0

        for a in assets:
            if not a.available_for_use_date or not a.gross_purchase_amount:
                continue

            month = a.available_for_use_date.month

            # Financial year logic
            # Apr–Sep  → First Half
            # Oct–Mar  → Second Half
            if 4 <= month <= 9:
                first_half += flt(a.gross_purchase_amount)
            else:
                second_half += flt(a.gross_purchase_amount)

        return {
            "first_half_amount": first_half,
            "second_half_amount": second_half,
        }



    # ---------------------------------------------------------
    # SOLD ASSETS
    # ---------------------------------------------------------
    def get_sold_assets(self, company, block_name, fy_doc):
        Asset = DocType("Asset")
        SalesInvoiceItem = DocType("Sales Invoice Item")
        SalesInvoice = DocType("Sales Invoice")

        subquery = (
            frappe.qb.from_(Asset)
            .join(SalesInvoiceItem)
            .on(Asset.name == SalesInvoiceItem.asset)
            .join(SalesInvoice)
            .on(SalesInvoiceItem.parent == SalesInvoice.name)
            .select(SalesInvoice.total)
            .where(
                (Asset.custom_asset_block == block_name)
                & (SalesInvoice.company == company)
                & (SalesInvoice.docstatus == 1)
                & SalesInvoice.posting_date.between(
                    fy_doc.year_start_date,
                    fy_doc.year_end_date,
                )
            )
            .distinct()
        )

        result = (
            frappe.qb.from_(subquery)
            .select(Sum(subquery.total).as_("total"))
            .run(as_dict=True)
        )

        return result[0].total if result else 0.0

    # ---------------------------------------------------------
    # PREVIOUS FY CLOSING WDV (FROM CHILD TABLE)
    # ---------------------------------------------------------
    def get_previous_year_closing_balance(self, block_name, fy_doc):
        prev_fy = self.get_previous_fiscal_year(fy_doc)

        if not prev_fy:
            return 0.0

        parent = frappe.db.get_value(
            "Asset Block Depreciation",
            {
                "financial_year": prev_fy.name,
                "company": self.company,
            },
            "name",
        )

        if not parent:
            return 0.0

        return (
            frappe.db.get_value(
                "Block Depreciation",
                {
                    "parent": parent,
                    "asset_block": block_name,
                },
                "closing_wdv",
            )
            or 0.0
        )

    # ---------------------------------------------------------
    # PREVIOUS FISCAL YEAR
    # ---------------------------------------------------------
    def get_previous_fiscal_year(self, fy_doc):
        prev_start = fy_doc.year_start_date.year - 1
        prev_end = fy_doc.year_end_date.year - 1

        name = frappe.db.get_value(
            "Fiscal Year",
            {
                "year_start_date": ["<=", f"{prev_start}-04-01"],
                "year_end_date": [">=", f"{prev_end}-03-31"],
            },
            "name",
        )

        return frappe.get_doc("Fiscal Year", name) if name else None
