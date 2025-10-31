frappe.pages['task-assignments'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Task Assignment Dashboard',
		single_column: true
	});
}