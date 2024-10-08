// Generated by dts-bundle-generator v9.5.1

export type ComponentSize = "xs" | "sm" | "md" | "lg";
export interface EntityAssertionsWidgetProps {
	query: UseEntityParams;
	size?: ComponentSize;
}
export interface Scope {
	env?: string;
	site?: string;
	namespace?: string;
}
export interface UseEntityParams {
	entityName?: string;
	entityType?: string;
	start: number;
	end: number;
	scope?: Scope;
}
